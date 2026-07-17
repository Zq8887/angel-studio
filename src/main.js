/* Entrée légère. Deux modes (décidés avant le paint par le script inline) :
   - intro-mode  (desktop OU mobile, non-reduced, connexion ok) : loader + préchargement
     des frames (desktop 121 / mobile 97), puis intro scrubée sur canvas + moteur.
   - no-intro    (reduced / connexion lente) : accès direct au hero (poster),
     moteur chargé à la 1re interaction. */

const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const desktop = matchMedia('(min-width:1024px) and (pointer:fine)').matches;
const introMode = html.classList.contains('intro-mode') && !reduced;

/* ---- Commun : année + jour d'ouverture en cours ---- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
const today = new Date().getDay();
document.querySelectorAll('#hours-list li').forEach((li) => {
  if (Number(li.dataset.day) === today) li.classList.add('is-today');
});

/* ---- Nav : repli "scrolled" avant le moteur ---- */
const nav = document.getElementById('nav');
const setNavScrolled = () => { if (nav) nav.classList.toggle('scrolled', scrollY > innerHeight - 90); };
addEventListener('scroll', setNavScrolled, { passive: true });

/* ---- Le widget flottant s'efface quand un CTA de réservation est visible ---- */
const ctaTargets = document.querySelectorAll('.contact-cta, .footer');
if (ctaTargets.length && 'IntersectionObserver' in window) {
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { en.isIntersecting ? seen.add(en.target) : seen.delete(en.target); });
    html.classList.toggle('rdv-off', seen.size > 0);
  }, { rootMargin: '0px' });
  ctaTargets.forEach((el) => io.observe(el));
}

/* ---- Ancres en repli natif (le moteur les reprend avec Lenis) ---- */
function nativeAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const t = document.querySelector(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
    });
  });
}

/* ================================================================== */
/* INTRO-MODE : loader → préchargement → moteur avec intro              */
/* ================================================================== */
if (introMode) {
  const dir = desktop ? 'desktop' : 'mobile';
  // frames interpolées 60 fps (mouvement compensé) — 239 desktop / 191 mobile
  const N = desktop ? 239 : 191;
  const frames = new Array(N);
  const fillEl = document.getElementById('loader-fill');
  const loader = document.getElementById('loader');
  let loaded = 0, started = false;

  const setFill = (p) => { if (fillEl) fillEl.style.width = Math.round(p * 100) + '%'; };

  const start = () => {
    if (started) return;
    started = true;
    import('./motion.js')
      .then((m) => m.initMotion({ withIntro: true, finePointer, frames }))
      .then(() => {
        if (loader) { loader.classList.add('is-out'); setTimeout(() => loader.remove(), 800); }
      })
      .catch(() => {
        // échec du moteur : bascule en accès direct, tout visible
        html.classList.remove('intro-mode');
        html.classList.add('no-intro', 'intro-done');
        if (loader) loader.remove();
        nativeAnchors();
      });
  };

  for (let i = 0; i < N; i++) {
    const img = new Image();
    img.decoding = 'async';
    try { img.fetchPriority = 'low'; } catch (e) {}
    img.onload = img.onerror = () => { if (++loaded >= N) start(); setFill(loaded / N); };
    img.src = `/assets/angelstudio/intro/${dir}/${String(i + 1).padStart(3, '0')}.webp`;
    frames[i] = img;
  }
  // filet : démarre quand même si un préchargement traîne
  setTimeout(start, 12000);

} else {
  /* ================================================================== */
  /* NO-INTRO : hero direct, moteur à la 1re interaction (ou reduced)     */
  /* ================================================================== */
  nativeAnchors();

  if (!reduced) {
    let booted = false;
    const events = ['pointermove', 'wheel', 'scroll', 'touchstart', 'keydown'];
    const boot = () => {
      if (booted) return;
      booted = true;
      events.forEach((ev) => removeEventListener(ev, boot));
      import('./motion.js').then((m) => m.initMotion({ withIntro: false, finePointer })).catch(() => {});
    };
    events.forEach((ev) => addEventListener(ev, boot, { passive: true }));
    addEventListener('load', () => setTimeout(boot, 10000));
  }
}
