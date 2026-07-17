# Angel Studio chez Allure — Coiffeur à Paris 8e

Site vitrine one-page **cinématique** : on **visite** le salon. Un film d'entrée
scrubé au scroll (drone : la devanture → on entre → le salon → les bacs),
**chapitré** comme un générique, qui s'ouvre sur un corps de page **clair et
chaud** — porcelaine, crème, rose poudré, fuchsia en accent — façon éditorial
parisien. Serif présent (Cormorant Garamond), wordmark Italiana, micro-typo Inter.

## Lancer

```bash
npm install
npm run dev       # développement
npm run build     # build de production → dist/
npm run preview   # prévisualiser le build
```

## Déployer

Projet **Vite statique** — Vercel / Netlify / Cloudflare Pages : build
`npm run build`, sortie `dist/`, Node ≥ 20.19. Aucune variable d'environnement,
aucune dépendance réseau au runtime (polices, images et carte auto-hébergées).

## Le film d'entrée (canvas scrubé, chapitré, CLS 0)

- **Architecture sans pin GSAP** : le wrapper `.hero-intro` est haut dès le
  premier paint (`900svh` desktop · `1200svh` au toucher, où le swipe a de l'inertie) et la scène est `position: sticky`. Aucun spacer inséré au
  runtime → **zéro layout shift, garanti**. Le scrub GSAP mappe la progression
  du wrapper sur un index de frame **fractionnaire** : fondu-enchaîné entre la frame i et la frame i+1 directement sur le `<canvas>` — mouvement lisse quel que soit le rythme, sans un octet de plus (cover, dpr ≤ 2).
- **Chapitres de la visite** calés sur les plans du film :
  `01 — La devanture` · `02 — On entre` · `03 — Le salon` · `04 — Les bacs`,
  crossfade bas-gauche,
  fine ligne de progression rose, bouton **« Passer l'intro »** (avance rapide
  Lenis jusqu'au hero).
- **239 frames des deux côtés** — interpolation de mouvement 60 fps (ffmpeg
  `minterpolate`, mci/aobmc). Desktop : upscale lanczos 1470→1920 + accentuation
  (13,3 Mo, q72). Mobile : recadrage centre 800px des frames desktop — l'écran
  portrait n'affiche qu'une tranche ~300px, servie depuis la source la plus
  définie (5,7 Mo, q70). Fondu sous-frame au dessin → aucune saccade.
  Le poster (photo HQ du client) est le LCP, `fetchpriority=high`.
- **Connexion lente / `prefers-reduced-motion`** : poster direct + contenu
  visible, aucune intro, Lenis off.
- À la fin du film, le canvas s'estompe : le film **résout vers la photo HQ**
  du client (`photos_hq/` + `npm run photos`). Puis voile radial + révélation
  du texte (masques, mot à mot),
  la nav et le widget « Réserver » apparaissent, puis **la feuille claire
  glisse sur le film** (coins arrondis, ombre portée — overlap en `transform`,
  jamais en marge : CLS 0).

Durée du film : la hauteur du wrapper (`.intro-mode .hero-intro`, 900svh desktop / 1200svh toucher)
— monter = plus lent.

## Direction artistique

- **Hero sombre cinématique → corps clair éditorial** : sections porcelaine /
  crème / rose poudré, footer noir. La nav (pill de verre) passe d'elle-même du
  sombre au clair après le hero.
- Typo éditoriale : accroche `clamp(2.5rem → 4.6rem)`, headlines serif
  `clamp(2.1rem → 3.7rem)` avec italiques fuchsia, listes de prix en filets
  pointillés, wordmark monumental Italiana coupé par le bas du footer.
- Un seul easing partout (`cubic-bezier(.16,1,.3,1)`), révélations sous masque
  (SplitType), cascades (`data-reveal-list`), parallax léger des photos,
  wordmark du footer qui remonte au scroll, curseur `mix-blend-mode:difference`,
  boutons magnétiques (±6px), miniature de prestation qui suit le curseur.
- Le widget flottant « Réserver » **s'efface automatiquement** quand un CTA de
  réservation est déjà visible (contact, footer) — jamais deux CTA en collision.
- Carte du 8e stylisée (auto-hébergée, zéro réseau) : rues réelles (Pasquier,
  Mathurins, Haussmann), marqueur fuchsia pulsant, lien Google Maps.
- **Chaque ligne de prestation est un lien Planity** (flèche au survol) ;
  brillance balayée sur les CTA ; zoom doux des photos du salon au survol.
- **Section avis** : déposer `avis-bg.mp4` (~5 s, muet, H.264) dans
  `public/assets/angelstudio/` → fond vidéo + voile sombre + typo claire,
  lecture lazy en vue, retiré proprement si absent (le rose reste).

## Données réelles (Planity — rien d'inventé)

- **Prestations & tarifs** : Femme / Homme / Enfant (jusqu'à 10 ans, réservation
  par téléphone) / Technique — reproduits fidèlement (22 → 270 €).
- **Adresse** : 41 rue Pasquier, 75008 Paris · **Tél** : 01 42 27 60 60 ·
  Métro Saint-Lazare · Saint-Augustin · Madeleine.
- **Horaires** : Lun & Dim fermés · Mar/Mer/Ven/Sam 10h30–18h · Jeu 10h30–12h
  puis 12h30–20h (jour courant surligné automatiquement).
- **Avis** : 4,9 · 1017 avis (Accueil 4,9 · Propreté 4,9 · Cadre 4,9 · Qualité 5,0).
- **Équipe** : Jérôme Guezou, Sébastien Bafcop & Jérôme Debruxelles — équipe
  artistique L'Oréal Professionnel.
- Tous les CTA pointent vers Planity :
  <https://www.planity.com/angel-studio-chez-allure-75017-paris>

## Assets — `public/assets/angelstudio/`

| Fichier | Rôle |
| --- | --- |
| `intro/desktop/001…239.webp` | Frames 1920px interpolées 60 fps (13,3 Mo) |
| `intro/mobile/001…239.webp` | Frames crop centre 800px (5,7 Mo) |
| `hero.jpg/.webp/.avif` | Photo HQ des bacs = fin du film + fond du hero (LCP) |
| `salon-1…3.jpg/.webp/.avif` | Photos du salon (`<picture>` AVIF/WebP/JPG) |
| `thumb-*.jpg` | Miniatures hover des prestations |
| `rdv.jpg`, `favicon.png` | Widget « Réserver » & favicon |
| `../fonts/*.woff2` | Cormorant Garamond (300/400/500/it.), Italiana, Inter |

Régénérer depuis le kit : `npm run intro` (frames interpolées : dossier
`interp/` du kit — nettoie le filigrane, convertit en WebP, recadre les photos
de sections). Intégrer des photos HQ : les déposer dans `photos_hq/` puis
`npm run photos`.

## Performance & accessibilité (mesuré, build de prod)

- **LCP ~156 ms desktop · ~172 ms mobile · CLS 0 · 0 erreur console** (preview
  local, Chromium). `transform`/`opacity` uniquement, dpr canvas ≤ 2,
  ≤ 4 `backdrop-filter`.
- `prefers-reduced-motion` : poster direct, tout visible, animations coupées.
- H1 unique, `alt` réels, `schema.org` HairSalon complet (adresse, tél, note
  4,9/1017, horaires), OG image = poster du hero.
