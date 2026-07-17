/* Moteur — même socle que Millenium : Lenis (scroll pondéré) + GSAP/ScrollTrigger
   (intro scrubée sur canvas + révélations) + SplitType (masques).
   Un seul easing, transform/opacity uniquement. Ici tout chuchote : révélations
   douces, décalées, jamais de rebond. */
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
    lenis.on('scroll', ({ scroll }) => nav && nav.classList.toggle('scrolled', scroll > 60));
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } catch (e) { lenis = null; }

  /* ---- Ancres ---- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href');
    if (!id || id.length < 2) return;
    a.addEventListener('click', (e) => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.2 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ================================================================ */
  /* INTRO scrubée PLEIN ÉCRAN : scène pinnée ; les images défilent,   */
  /* puis, tout à la fin, le texte minuscule se révèle (masque + fondu).*/
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
    const draw = (i) => { current = i; drawCover(frames[i]); };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cw = canvas.clientWidth || innerWidth; ch = canvas.clientHeight || innerHeight;
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCover(frames[current < 0 ? 0 : current]);
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
      gsap.set(words, { yPercent: 110 });
    }
    gsap.set(['.hero-eyebrow', '.hero-line'], { y: 14, autoAlpha: 0 });

    const idx = { i: 0 };
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#intro', start: 'top top', end: '+=250%', pin: true, scrub: 1,
        onUpdate: (self) => { if (self.progress > 0.9) html.classList.add('intro-done'); else html.classList.remove('intro-done'); },
      },
    });
    // 1) défilement de TOUTES les images (les ~82 premiers % du scroll)
    tl.to(idx, { i: frames.length - 1, ease: 'none', duration: 8,
      onUpdate: () => { const i = Math.round(idx.i); if (i !== current) draw(i); } }, 0);
    // 2) l'indice de scroll s'efface une fois les images finies
    tl.to('.scroll-line', { autoAlpha: 0, duration: 0.7, ease: EASE }, 6.9);
    // 3) SEULEMENT ensuite : voile + texte minuscule se révèlent (stagger doux)
    tl.to('.hero-veil', { autoAlpha: 1, duration: 1.3, ease: EASE }, 7.7);
    tl.to('.hero-eyebrow', { autoAlpha: 1, y: 0, duration: 1.0, ease: EASE }, 8.0);
    if (words.length) tl.to(words, { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.05 }, 8.15);
    tl.to('.hero-line', { autoAlpha: 1, y: 0, duration: 1.0, ease: EASE }, 8.75);
  }

  /* ================================================================ */
  /* Nav — lien actif                                                  */
  /* ================================================================ */
  const navMap = [['accueil', '#accueil'], ['salon', '#salon'], ['prestations', '#prestations'], ['contact', '#contact']];
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
    const list = document.querySelector('.prestations');
    if (thumb && thumbImg && list) {
      let px = innerWidth / 2, py = innerHeight / 2, cxp = px, cyp = py, active = false;
      const move = (e) => { px = e.clientX; py = e.clientY; };
      const tloop = () => { cxp += (px - cxp) * 0.16; cyp += (py - cyp) * 0.16; thumb.style.transform = `translate3d(${cxp}px, ${cyp}px, 0) ${active ? 'scale(1)' : 'scale(.9)'}`; requestAnimationFrame(tloop); };
      requestAnimationFrame(tloop);
      addEventListener('pointermove', move, { passive: true });
      document.querySelectorAll('.presta-row[data-thumb]').forEach((row) => {
        row.addEventListener('pointerenter', () => { const k = row.dataset.thumb; thumbImg.src = `/assets/angelstudio/thumb-${k}.jpg`; active = true; thumb.classList.add('show'); });
        row.addEventListener('pointerleave', () => { active = false; thumb.classList.remove('show'); });
      });
    }
  }

  /* ================================================================ */
  /* Révélations chorégraphiées (masque, jamais de fade brut)          */
  /* ================================================================ */
  try {
    document.querySelectorAll('[data-reveal-lines]').forEach((el) => {
      const split = new SplitType(el, { types: 'lines,words' });
      split.lines.forEach((l) => l.classList.add('line-mask'));
      gsap.from(split.words, { yPercent: 110, duration: 1.0, ease: EASE, stagger: 0.05, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 22, autoAlpha: 0, duration: 0.9, ease: EASE, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    document.querySelectorAll('[data-reveal-media]').forEach((fig) => {
      const inner = fig.querySelector('img, video, iframe') || fig;
      gsap.from(inner, { scale: 1.12, autoAlpha: 0, duration: 1.3, ease: EASE, scrollTrigger: { trigger: fig, start: 'top 90%', once: true } });
    });

    // parallax décalé des photos du salon (profondeur du lieu)
    document.querySelectorAll('.salon-fig').forEach((fig, i) => {
      const amt = [-9, -5, -7][i] ?? -6;
      gsap.to(fig.querySelector('img'), { yPercent: amt, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });

    // compteur discret de la note (0 → 4,9)
    const avisNum = document.querySelector('.avis-num [data-count]');
    if (avisNum) {
      const o = { v: 0 };
      gsap.to(o, { v: 4.9, duration: 1.4, ease: EASE, scrollTrigger: { trigger: avisNum, start: 'top 90%', once: true }, onUpdate: () => { avisNum.textContent = o.v.toFixed(1).replace('.', ','); } });
    }

    ScrollTrigger.refresh();
  } catch (e) {
    ScrollTrigger.getAll().forEach((t) => t.kill());
    document.querySelectorAll('[data-reveal],[data-reveal-lines],[data-reveal-media]').forEach((el) => gsap.set(el, { clearProps: 'all' }));
  }

  addEventListener('load', () => ScrollTrigger.refresh());
}
