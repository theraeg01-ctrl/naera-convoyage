<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Règles du projet NAERA Convoyage

- **`src/core/` reste pur** : aucun import de Next.js, React, Prisma ou Node (`fs`, `crypto`…). Seul Zod est autorisé. Ce code sera réutilisé tel quel par l'application React Native.
- **Aucune logique d'API dans les composants.** Les composants appellent des Server Actions (`src/actions/`) ou l'API `/api/v1`, qui passent par `src/services/use-cases.ts`.
- **Source unique des tarifs** : toute valeur chiffrée vient des paramètres (`getSettings()`), jamais d'une constante dans un composant. Les valeurs initiales sont dans `src/core/settings/defaults.ts`.
- **API absente = simulation, jamais de plantage.** Chaque donnée externe porte sa source (`LIVE`, `ESTIMATED`, `SIMULATED`, `MANUAL`) et l'interface l'affiche.
- **Messages utilisateur en français, compréhensibles** ; les détails techniques vont dans `logTechnicalError`.
- **Design system** : uniquement les jetons sémantiques de `globals.css` (`bg-surface`, `text-muted`…), jamais de couleur brute. Le mode sombre a ses propres valeurs.
- **Mobile d'abord** : cibles tactiles ≥ 44 px, aucune barre de défilement horizontale (375 → 1440 px), action principale en bas d'écran sur mobile.
- Avant de livrer : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
