/**
 * Intègre les photos HQ du client dans le site.
 *
 * 1. Déposer les photos dans le dossier photos_hq/ (à la racine du repo),
 *    nommées d'après leur emplacement (jpg, jpeg, png ou webp acceptés) :
 *
 *      hero.jpg            → fond du hero, fin du film (les bacs roses) — PAYSAGE, ≥ 2400px
 *      salon-1.jpg         → l'enfilade des postes de coiffage — paysage 16:10, ≥ 1800px
 *      salon-2.jpg         → la cheminée + chevreuil rose — portrait 4:5, ≥ 1400px
 *      salon-3.jpg         → les bacs, plan large — paysage 21:9, ≥ 1800px
 *      thumb-femme.jpg     → miniature survol « Femme » (poste + miroir), ≥ 900px
 *      thumb-homme.jpg     → miniature survol « Homme » (fauteuil), ≥ 900px
 *      thumb-enfant.jpg    → miniature survol « Enfant », ≥ 900px
 *      thumb-technique.jpg → miniature survol « Technique » (étagère couleur), ≥ 900px
 *      rdv.jpg             → pastille du widget « Réserver » (détail), ≥ 700px
 *
 * 2. Lancer :  npm run photos
 *    → chaque photo trouvée est redimensionnée et déclinée en JPG/WebP/AVIF
 *      dans public/assets/angelstudio/ sous le bon nom. Les photos absentes
 *      sont simplement ignorées (on peut remplacer une seule photo à la fois).
 */
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SRC = new URL('../photos_hq/', import.meta.url).pathname;
const OUT = new URL('../public/assets/angelstudio/', import.meta.url).pathname;

const TARGETS = {
  'hero':            { width: 2400 },
  'salon-1':         { width: 1800 },
  'salon-2':         { width: 1400 },
  'salon-3':         { width: 1800 },
  'thumb-femme':     { width: 900 },
  'thumb-homme':     { width: 900 },
  'thumb-enfant':    { width: 900 },
  'thumb-technique': { width: 900 },
  'rdv':             { width: 700 },
};

if (!existsSync(SRC)) {
  console.error('Dossier photos_hq/ introuvable — créez-le à la racine et déposez-y les photos.');
  process.exit(1);
}

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
if (!files.length) { console.log('Aucune photo dans photos_hq/ — rien à faire.'); process.exit(0); }

let done = 0;
for (const f of files) {
  const name = f.replace(/\.(jpe?g|png|webp)$/i, '').toLowerCase();
  const t = TARGETS[name];
  if (!t) { console.warn(`⚠ ${f} ignorée — nom inconnu (attendus : ${Object.keys(TARGETS).join(', ')})`); continue; }
  const base = sharp(`${SRC}${f}`).rotate().resize({ width: t.width, withoutEnlargement: true });
  await base.clone().jpeg({ quality: 84, mozjpeg: true }).toFile(`${OUT}${name}.jpg`);
  await base.clone().webp({ quality: 80 }).toFile(`${OUT}${name}.webp`);
  await base.clone().avif({ quality: 62 }).toFile(`${OUT}${name}.avif`);
  const meta = await sharp(`${OUT}${name}.jpg`).metadata();
  console.log(`✓ ${name} → ${meta.width}x${meta.height} (jpg/webp/avif)`);
  done++;
}
console.log(done ? `${done} photo(s) intégrée(s). Rebuild : npm run build` : 'Rien d’intégré.');
