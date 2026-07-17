# Angel Studio chez Allure — Coiffeur à Paris 8e

Site vitrine one-page **cinématique** — on **visite** le salon, on ne le lit pas.
Même moteur technique que Millenium Studio (intro drone scrubée sur `<canvas>`,
Lenis, révélations chorégraphiées, grain/vignette, curseur custom) — mais
**l'inverse sur le texte** : aucune grosse écriture, aucun titre display. Tout
chuchote. Serif fin (Cormorant Garamond / Italiana), micro-infos Inter, énormément
de vide. Noir laqué dominant, fuchsia au compte-gouttes, chrome en filets.

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
aucune dépendance réseau au runtime (polices, images et « carte » auto-hébergées).

## L'intro (drone scrubé sur canvas, plein écran)

- **Desktop** : les **121 frames** sont préchargées (loader sobre à fine ligne
  chrome), puis dessinées plein écran sur un `<canvas>` piloté au scroll (section
  pinnée, `end:'+=250%'`). L'intro va de la devanture « ANGEL STUDIO » → l'entrée
  → le tour du salon → l'arrêt sur les bacs roses. Tout à la fin, le texte
  minuscule (accroche + micro-ligne) se révèle par-dessus, sous un masque.
- **Mobile** : mêmes frames en version allégée (**97 frames**, `frames_mobile`),
  intro identique. Le poster (dernière frame) est le LCP, préchargé en priorité ;
  les frames se chargent derrière en `fetchpriority=low`.
- **Connexion lente / `prefers-reduced-motion`** : poster direct + nav, aucune
  intro, Lenis off, animations coupées, contenu visible.
- La **dernière frame (121) = fond du hero** → continuité invisible intro → hero.

Régler la durée de l'intro : `end:'+=250%'` dans `src/motion.js`.

## Direction artistique (la retenue = le luxe)

- **Aucun titre display.** Le texte principal ne dépasse jamais ~2rem. Seul le
  wordmark du footer (Italiana) est grand — mais élégant, coupé par le bord bas.
- Un seul easing partout : `cubic-bezier(0.16,1,0.3,1)`. Révélations décalées
  (masque `overflow:hidden` + `yPercent`), jamais de fade brut ni de rebond.
- Grain film + vignette globaux ; halos rose très doux placés en asymétrie ;
  transitions par fondu de fond (surface continue, jamais de coupe).
- Micro-interactions : curseur chrome, boutons magnétiques (±6px), soulignement
  de nav tracé, miniature de prestation qui suit le curseur au survol.
- Fuchsia **rare** (un filet, un hover, le marqueur de carte) ; noir laqué
  dominant ; chrome en filets. Un seul widget flottant (« Réserver »).

## Données réelles (Planity — rien d'inventé)

- **Prestations & tarifs** : Femme, Homme, Enfant (réservation par téléphone),
  Technique — reproduits fidèlement (40 → 270 €).
- **Adresse** : 41 rue Pasquier, 75008 Paris · **Tél** : 01 42 27 60 60.
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
| `intro/desktop/001…121.webp` | Frames de l'intro scrubée (desktop) |
| `intro/mobile/001…097.webp` | Frames allégées (mobile) |
| `hero.jpg` / `.webp` / `.avif` | Poster = frame 121 (bacs roses) = fond du hero |
| `salon-1…3.*` | Photos du salon (postes, cheminée + chevreuil rose, bacs) |
| `thumb-*.*` | Miniatures hover des prestations (femme / homme / enfant / technique) |
| `rdv.jpg`, `favicon.png` | Widget « Réserver » & favicon |
| `../fonts/*.woff2` | Cormorant Garamond (300/400/500/it.), Italiana, Inter — auto-hébergées |

Régénérer depuis le kit : `npm run intro` (nettoie le filigrane, convertit en
WebP, décline le poster, recadre les photos de sections).

## Performance & accessibilité

`transform`/`opacity` uniquement, `will-change` retiré, ≤ 4 `backdrop-filter`.
Mesuré (preview local) : **LCP desktop ~0,2 s · mobile ~0,15 s · CLS 0**.
`prefers-reduced-motion` : Lenis off, poster direct, animations coupées.
H1 unique mais visuellement discret, `alt` réels, `schema.org HairSalon`,
OG image = poster du hero.
