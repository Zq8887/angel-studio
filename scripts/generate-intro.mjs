/**
 * Prépare l'intro scrubée d'Angel Studio à partir du kit v2 :
 *  - frames desktop (121) / mobile (97) converties en WebP, filigrane CapCut
 *    (coin haut-gauche) nettoyé (flou + assombrissement doux, lu comme vignette),
 *  - hero-poster (frame 121 = les bacs roses) décliné en jpg/webp/avif = fond du hero,
 *  - photos de sections recadrées AVEC INTENTION depuis des frames choisies
 *    (bar noir laqué + fauteuils fuchsia, poste de coiffage, cheminée + chevreuil,
 *    étagère produits) — recadrées loin du coin, donc sans filigrane.
 *
 *   node scripts/generate-intro.mjs [<dossier kit>]
 */
import sharp from 'sharp';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';

const SRC = process.argv[2] || '/home/user/angelstudio_kit/angel_kit_v2/interp';
if (!SRC || !existsSync(SRC)) { console.error('Usage: node scripts/generate-intro.mjs <dossier kit>'); process.exit(1); }
const OUT = new URL('../public/assets/angelstudio/', import.meta.url).pathname;
const D = `${OUT}intro/desktop/`, M = `${OUT}intro/mobile/`;
await rm(`${OUT}intro`, { recursive: true, force: true });
await mkdir(D, { recursive: true });
await mkdir(M, { recursive: true });

/* masque dégradé qui assombrit le coin haut-gauche (cache le filigrane flouté) —
   fondu doux, se lit comme une vignette cinéma sous le grain du site. */
const gradSvg = (w, h) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
  `<defs><radialGradient id="g" cx="0" cy="0" r="1">` +
  `<stop offset="0" stop-color="#000" stop-opacity="0.92"/>` +
  `<stop offset="0.5" stop-color="#000" stop-opacity="0.66"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="0"/>` +
  `</radialGradient></defs>` +
  `<rect x="${-w * 0.03}" y="${-w * 0.03}" width="${w * 0.24}" height="${w * 0.115}" fill="url(#g)"/></svg>`
);

/** retire le filigrane : floute le coin haut-gauche puis l'assombrit */
async function clean(file, w, h) {
  const rw = Math.round(w * 0.16), rh = Math.round(w * 0.058);
  const region = await sharp(file).extract({ left: 0, top: 0, width: rw, height: rh }).blur(Math.max(7, w * 0.008)).toBuffer();
  return sharp(file).composite([{ input: region, left: 0, top: 0 }, { input: gradSvg(w, h), left: 0, top: 0 }]);
}

/* frames — qualité maximale possible depuis la source :
   - desktop : upscale lanczos 1470→1920 + accentuation → plus net que
     l'upscale bilinéaire du navigateur (l'écran affiche ~2100px en cover) ;
   - mobile : recadrage CENTRE 800x630 des frames desktop (l'écran portrait
     n'affiche qu'une tranche ~300px : autant la servir depuis la source la
     plus définie). Le recadrage élimine le coin filigrané → aucun nettoyage. */
const dm = await sharp(`${SRC}/frames_desktop/001.jpg`).metadata();
const dfiles = (await readdir(`${SRC}/frames_desktop`)).filter((f) => /\.jpe?g$/i.test(f)).sort();
let nd = 0, nm = 0;
for (const f of dfiles) {
  const n = String(++nd).padStart(3, '0');
  const cleaned = await (await clean(`${SRC}/frames_desktop/${f}`, dm.width, dm.height)).jpeg({ quality: 96 }).toBuffer();
  await sharp(cleaned).resize({ width: 1920, kernel: 'lanczos3' }).sharpen({ sigma: 0.55 }).webp({ quality: 72 }).toFile(`${D}${n}.webp`);
  await sharp(`${SRC}/frames_desktop/${f}`)
    .extract({ left: Math.round((dm.width - 800) / 2), top: 0, width: 800, height: dm.height })
    .sharpen({ sigma: 0.5 }).webp({ quality: 70 }).toFile(`${M}${n}.webp`);
  nm++;
}
console.log(`frames desktop: ${nd} (1920px, upscale+sharpen), mobile: ${nm} (crop centre 800x${dm.height})`);

/* poster = dernière frame (121, les bacs roses) nettoyée = fond du hero */
const files = (await readdir(`${SRC}/frames_desktop`)).filter((f) => /\.jpe?g$/i.test(f)).sort();
const last = `${SRC}/frames_desktop/${files[files.length - 1]}`;
const posterBuf = await (await clean(last, dm.width, dm.height)).jpeg({ quality: 95 }).toBuffer();
const p = sharp(posterBuf).sharpen({ sigma: 0.5 });
await p.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}hero.jpg`);
await p.clone().webp({ quality: 78 }).toFile(`${OUT}hero.webp`);
await p.clone().avif({ quality: 60 }).toFile(`${OUT}hero.avif`);
console.log(`poster ${files[files.length - 1]} → hero.jpg/webp/avif (${dm.width}x${dm.height})`);

/* photos de sections + miniatures — recadrées AVEC INTENTION, loin du coin filigrané.
   region = { left, top, width, height } sur la frame nettoyée (1470x630). */
async function emit(name, frame, region, { q = 80, wq = 76, aq = 58 } = {}) {
  const src = `${SRC}/frames_desktop/${frame}.jpg`;
  let img = await clean(src, dm.width, dm.height);
  let buf = await img.jpeg({ quality: 95 }).toBuffer();
  let s = sharp(buf);
  if (region) s = s.extract(region);
  s = s.sharpen({ sigma: 0.5 });
  await s.clone().jpeg({ quality: q, mozjpeg: true }).toFile(`${OUT}${name}.jpg`);
  await s.clone().webp({ quality: wq }).toFile(`${OUT}${name}.webp`);
  await s.clone().avif({ quality: aq }).toFile(`${OUT}${name}.avif`);
  const meta = await sharp(`${OUT}${name}.jpg`).metadata();
  console.log(`${name} ← ${frame} ${meta.width}x${meta.height}`);
}

/* LE SALON — 3 grandes photos (point de vue net, cadrage asymétrique) */
await emit('salon-1', '059', { left: 150, top: 30, width: 1170, height: 570 });   // enfilade des postes + enseigne
await emit('salon-2', '119', { left: 300, top: 0,  width: 1000, height: 600 });   // cheminée + chevreuil rose
await emit('salon-3', '223', { left: 330, top: 250, width: 1000, height: 380 });  // bacs roses, fauteuils fuchsia

/* PRESTATIONS — miniatures hover (près du curseur), une par catégorie */
await emit('thumb-femme',    '179', { left: 140, top: 90,  width: 470, height: 470 }); // miroir + coiffage
await emit('thumb-homme',    '059', { left: 300, top: 200, width: 420, height: 420 }); // fauteuil transparent
await emit('thumb-enfant',   '219', { left: 380, top: 290, width: 430, height: 330 }); // bac rose doux
await emit('thumb-technique','179', { left: 1010, top: 120, width: 430, height: 470 }); // étagère produits couleur

/* widget flottant « Réserver » */
await emit('rdv', '223', { left: 420, top: 300, width: 470, height: 320 }, { q: 82 });

/* favicon — aile d'ange / A fin, fuchsia sur noir laqué */
const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" rx="60" fill="#0C0A0C"/>
  <rect x="7" y="7" width="242" height="242" rx="53" fill="none" stroke="#E6337F" stroke-opacity=".38" stroke-width="3"/>
  <path d="M128 66 L164 190 L128 162 L92 190 Z" fill="none" stroke="#E6337F" stroke-opacity=".85" stroke-width="9" stroke-linejoin="round"/>
</svg>`;
await sharp(Buffer.from(faviconSvg)).png().toFile(`${OUT}favicon.png`);

/* og / poids ------------------------------------------------------- */
let dtot = 0; for (const f of await readdir(D)) dtot += statSync(D + f).size;
let mtot = 0; for (const f of await readdir(M)) mtot += statSync(M + f).size;
console.log(`intro desktop: ${(dtot/1048576).toFixed(2)} Mo · mobile: ${(mtot/1048576).toFixed(2)} Mo`);
console.log('OK');
