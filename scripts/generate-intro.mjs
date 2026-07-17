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

const SRC = process.argv[2] || '/home/user/angelstudio_kit/angel_kit_v2';
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

async function convert(dir, out, w, h, quality) {
  const files = (await readdir(dir)).filter((f) => /\.jpe?g$/i.test(f)).sort();
  let i = 0;
  for (const f of files) {
    const n = String(++i).padStart(3, '0');
    const img = await clean(`${dir}/${f}`, w, h);
    await img.webp({ quality }).toFile(`${out}${n}.webp`);
  }
  return i;
}

/* frames */
const dm = await sharp(`${SRC}/frames_desktop/001.jpg`).metadata();
const mm = await sharp(`${SRC}/frames_mobile/001.jpg`).metadata();
const nd = await convert(`${SRC}/frames_desktop`, D, dm.width, dm.height, 72);
const nm = await convert(`${SRC}/frames_mobile`, M, mm.width, mm.height, 68);
console.log(`frames desktop: ${nd} (${dm.width}x${dm.height}), mobile: ${nm} (${mm.width}x${mm.height})`);

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
await emit('salon-1', '030', { left: 150, top: 30, width: 1170, height: 570 });   // enfilade des postes + enseigne
await emit('salon-2', '060', { left: 300, top: 0,  width: 1000, height: 600 });   // cheminée + chevreuil rose
await emit('salon-3', '112', { left: 330, top: 250, width: 1000, height: 380 });  // bacs roses, fauteuils fuchsia

/* PRESTATIONS — miniatures hover (près du curseur), une par catégorie */
await emit('thumb-femme',    '090', { left: 140, top: 90,  width: 470, height: 470 }); // miroir + coiffage
await emit('thumb-homme',    '030', { left: 300, top: 200, width: 420, height: 420 }); // fauteuil transparent
await emit('thumb-enfant',   '110', { left: 380, top: 290, width: 430, height: 330 }); // bac rose doux
await emit('thumb-technique','090', { left: 1010, top: 120, width: 430, height: 470 }); // étagère produits couleur

/* widget flottant « Réserver » */
await emit('rdv', '112', { left: 420, top: 300, width: 470, height: 320 }, { q: 82 });

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
