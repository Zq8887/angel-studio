/* Moteur — Lenis (scroll pondéré) + GSAP/ScrollTrigger (film scrubé sur canvas,
   chapitres de visite, révélations chorégraphiées) + SplitType (masques).
   Un seul easing (expo.out ≈ cubic-bezier(.16,1,.3,1)), transform/opacity only. */
import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

const EASE = 'expo.out';
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function initMotion({ withIntro = false, finePointer = false, frames = null } = {}) {
  gsap.registerPlugin(ScrollTrigger);
  // la barre d'URL mobile ne doit pas re-déclencher le pin de l'intro
  ScrollTrigger.config({ ignoreMobileResize: true });
  const html = document.documentElement;
  const nav = document.getElementById('nav');

  /* ---- Lenis ---- */
  let lenis = null;
  try {
    lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    // la nav passe en thème clair une fois le film quitté
    lenis.on('scroll', ({ scroll }) => nav && nav.classList.toggle('scrolled', scroll > innerHeight * 0.6));
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } catch (e) { lenis = null; }

  const scrollToY = (y, duration = 1.6) => {
    if (lenis) lenis.scrollTo(y, { duration });
    else scrollTo({ top: y, behavior: 'smooth' });
  };

  /* ---- Ancres ---- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href');
    if (!id || id.length < 2) return;
    a.addEventListener('click', (e) => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ================================================================ */
  /* LE FILM — canvas scrubé plein écran, long et lent.                 */
  /* Frames interpolées 60 fps. Chapitres : devanture (1-36) →          */
  /* on entre (37-67) → le salon (68-194) → les bacs (195-239).         */
  /* Le texte se révèle tout à la fin.                                  */
  /* ================================================================ */
  if (withIntro && frames && frames.length) {
    const canvas = document.getElementById('intro-canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    let cw = 0, ch = 0, current = -1;

    const drawCover = (img) => {
      if (!img || !img.naturalWidth) return;
      const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
      let w, h, x, y;
      if (cr > ir) { w = cw; h = cw / ir; x = 0; y = (ch - h) / 2; }
      else { h = ch; w = ch * ir; x = (cw - w) / 2; y = 0; }
      ctx.drawImage(img, x, y, w, h);
    };
    /* index FRACTIONNAIRE : fondu-enchaîné entre la frame i et la frame i+1
       directement sur le canvas → mouvement parfaitement lisse quel que soit
       le rythme du scroll, sans une image de plus à télécharger. */
    const draw = (x) => {
      current = x;
      const i = Math.max(0, Math.min(frames.length - 1, Math.floor(x)));
      const f = x - i;
      drawCover(frames[i]);
      if (f > 0.02 && frames[i + 1]) { ctx.globalAlpha = f; drawCover(frames[i + 1]); ctx.globalAlpha = 1; }
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cw = canvas.clientWidth || innerWidth; ch = canvas.clientHeight || innerHeight;
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(current < 0 ? 0 : current);
    };
    resize();
    addEventListener('resize', resize, { passive: true });
    draw(0);

    // accroche (H1) masquée mot par mot
    let words = [];
    const accroche = document.querySelector('.hero-accroche');
    if (accroche) {
      const sp = new SplitType(accroche, { types: 'lines,words' });
      sp.lines.forEach((l) => l.classList.add('line-mask'));
      words = sp.words;
      gsap.set(words, { yPercent: 112 });
    }
    gsap.set(['.hero-eyebrow', '.hero-line'], { y: 14, autoAlpha: 0 });

    const idx = { i: 0 };
    const tl = gsap.timeline({
      scrollTrigger: {
        // Long et lent — la hauteur du wrapper (.intro-mode .hero-intro) fixe
        // la durée. Pas de pin GSAP : scène sticky (CLS 0).
        trigger: '#intro', start: 'top top', end: 'bottom bottom', scrub: 1.2,
        onUpdate: (self) => { if (self.progress > 0.9) html.classList.add('intro-done'); else html.classList.remove('intro-done'); },
      },
    });
    // 1) toutes les images défilent sur les ~82 premiers % du scroll
    //    (index fractionnaire → fondu-enchaîné continu entre les frames)
    tl.to(idx, { i: frames.length - 1, ease: 'none', duration: 8,
      onUpdate: () => { if (Math.abs(idx.i - current) > 0.01) draw(idx.i); } }, 0);
    // fine ligne de progression du film
    tl.to('.intro-progress i', { scaleX: 1, ease: 'none', duration: 8 }, 0);

    // 2) chapitres de la visite — crossfade calé sur les plans du film
    const chapters = gsap.utils.toArray('.intro-chapter');
    const times = [[0.15, 1.0], [1.18, 2.2], [2.4, 6.35], [6.55, 7.4]];
    chapters.forEach((el, i) => {
      if (!times[i]) return;
      const [tin, tout] = times[i];
      tl.fromTo(el, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: EASE }, tin);
      tl.to(el, { autoAlpha: 0, y: -16, duration: 0.45, ease: EASE }, tout);
    });

    // 3) l'indice de scroll s'efface quand le film se termine
    tl.to('.scroll-line', { autoAlpha: 0, duration: 0.6, ease: EASE }, 7.35);
    // 3bis) le canvas s'efface → le film « résout » vers le poster HQ dessous
    //       (remplacer hero.jpg/webp/avif par une vraie photo suffit)
    tl.to('.stage-canvas', { autoAlpha: 0, duration: 1.4, ease: EASE }, 7.85);
    // 4) le voile puis le texte — seulement une fois les images finies
    tl.to('.hero-veil', { autoAlpha: 1, duration: 1.3, ease: EASE }, 7.7);
    tl.to('.hero-eyebrow', { autoAlpha: 1, y: 0, duration: 1.0, ease: EASE }, 8.0);
    if (words.length) tl.to(words, { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.05 }, 8.15);
    tl.to('.hero-line', { autoAlpha: 1, y: 0, duration: 1.0, ease: EASE }, 8.75);

    // « Passer l'intro » — avance rapide du film jusqu'au hero
    const skip = document.getElementById('intro-skip');
    if (skip) skip.addEventListener('click', () => {
      const st = tl.scrollTrigger;
      if (st) scrollToY(st.end + 2, 2.2);
    });
  }

  /* ================================================================ */
  /* Nav — lien actif                                                  */
  /* ================================================================ */
  const navMap = [['accueil', '#intro'], ['salon', '#salon'], ['prestations', '#prestations'], ['contact', '#contact']];
  const links = new Map(navMap.map(([id]) => [id, document.querySelector(`.nav-link[data-nav="${id}"]`)]));
  const activate = (id) => { links.forEach((l) => l && l.classList.remove('is-active')); const l = links.get(id); if (l) l.classList.add('is-active'); };
  navMap.forEach(([id, sel]) => {
    const sec = document.querySelector(sel);
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%', onToggle: (self) => { if (self.isActive) activate(id); } });
  });

  /* ================================================================ */
  /* Curseur custom + magnétique (±6px)                                */
  /* ================================================================ */
  if (finePointer) {
    const cur = document.querySelector('.cursor');
    if (cur) {
      html.classList.add('has-cursor');
      let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, s = 1, ts = 1;
      addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
      const loop = () => { x += (tx - x) * 0.2; y += (ty - y) * 0.2; s += (ts - s) * 0.2; cur.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s.toFixed(3)})`; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      const grow = () => { ts = 1.7; cur.classList.add('grow'); };
      const shrink = () => { ts = 1; cur.classList.remove('grow'); };
      document.querySelectorAll('a, button, [data-magnetic], .presta-row, .map-card').forEach((el) => { el.addEventListener('pointerenter', grow); el.addEventListener('pointerleave', shrink); });
    }

    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: clamp((e.clientX - (r.left + r.width / 2)) * 0.3, -6, 6), y: clamp((e.clientY - (r.top + r.height / 2)) * 0.4, -6, 6), duration: 0.4, ease: EASE });
      });
      btn.addEventListener('pointerleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: EASE }));
    });

    /* miniature de prestation qui suit le curseur (lerp doux) */
    const thumb = document.querySelector('.presta-thumb');
    const thumbImg = thumb && thumb.querySelector('img');
    if (thumb && thumbImg) {
      let px = innerWidth / 2, py = innerHeight / 2, cxp = px, cyp = py, active = false;
      addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; }, { passive: true });
      const tloop = () => { cxp += (px - cxp) * 0.16; cyp += (py - cyp) * 0.16; thumb.style.transform = `translate3d(${cxp}px, ${cyp}px, 0) ${active ? 'scale(1)' : 'scale(.9)'}`; requestAnimationFrame(tloop); };
      requestAnimationFrame(tloop);
      document.querySelectorAll('.presta-row[data-thumb]').forEach((row) => {
        row.addEventListener('pointerenter', () => { const k = row.dataset.thumb; thumbImg.src = `/assets/angelstudio/thumb-${k}.jpg`; active = true; thumb.classList.add('show'); });
        row.addEventListener('pointerleave', () => { active = false; thumb.classList.remove('show'); });
      });
    }
  }

  /* ================================================================ */
  /* Révélations chorégraphiées (masque / cascade, jamais de fade brut) */
  /* ================================================================ */
  try {
    document.querySelectorAll('[data-reveal-lines]').forEach((el) => {
      const split = new SplitType(el, { types: 'lines,words' });
      split.lines.forEach((l) => l.classList.add('line-mask'));
      gsap.from(split.words, { yPercent: 112, duration: 1.0, ease: EASE, stagger: 0.045, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 24, autoAlpha: 0, duration: 0.9, ease: EASE, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    // listes en cascade (prestations, avis)
    document.querySelectorAll('[data-reveal-list]').forEach((list) => {
      const items = Array.from(list.children);
      if (!items.length) return;
      gsap.from(items, { y: 26, autoAlpha: 0, duration: 0.9, ease: EASE, stagger: 0.07, scrollTrigger: { trigger: list, start: 'top 88%', once: true } });
    });
    document.querySelectorAll('[data-reveal-media]').forEach((fig) => {
      const inner = fig.querySelector('img, video, iframe') || fig;
      gsap.from(inner, { scale: 1.12, autoAlpha: 0, duration: 1.3, ease: EASE, scrollTrigger: { trigger: fig, start: 'top 88%', once: true } });
    });

    // parallax décalé des photos du salon (profondeur du lieu) — sur la figure,
    // la révélation (scale) reste sur l'image : aucun conflit de tween
    document.querySelectorAll('.salon-fig').forEach((fig, i) => {
      const amt = [-7, -4, -6][i] ?? -5;
      gsap.to(fig, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });

    // wordmark du footer — remonte doucement à l'approche
    const mark = document.querySelector('.footer-mark');
    if (mark) gsap.from(mark, { yPercent: 26, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });


    // compteur de la note (0 → 4,9)
    const avisNum = document.querySelector('.avis-num [data-count]');
    if (avisNum) {
      const o = { v: 0 };
      gsap.to(o, { v: 4.9, duration: 1.6, ease: EASE, scrollTrigger: { trigger: avisNum, start: 'top 90%', once: true }, onUpdate: () => { avisNum.textContent = o.v.toFixed(1).replace('.', ','); } });
    }

    ScrollTrigger.refresh();
  } catch (e) {
    ScrollTrigger.getAll().forEach((t) => t.kill());
    document.querySelectorAll('[data-reveal],[data-reveal-lines],[data-reveal-media],[data-reveal-list]').forEach((el) => gsap.set(el, { clearProps: 'all' }));
  }

  addEventListener('load', () => ScrollTrigger.refresh());
}
