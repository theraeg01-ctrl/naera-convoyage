# NAERA Convoyage

Application web (PWA installable) pour **estimer, organiser, tarifer et suivre des missions de convoyage automobile**.
Objectif : estimer une mission standard en moins de 30 secondes et connaître immédiatement sa rentabilité.

> **État : phase 0 (UX/UI et architecture mobile-first) avec le moteur métier du premier parcours.**
> Parcours fonctionnel : **Nouvelle mission → Simulation → Résultat → Sauvegarde → Suivi sur mobile**.
> Tant que les API ne sont pas connectées, itinéraires et transports sont **simulés** et toujours signalés comme tels.

## Sommaire

- [Démarrage rapide](#démarrage-rapide)
- [Commandes](#commandes)
- [Architecture](#architecture)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Mode simulé et mode API réelle](#mode-simulé-et-mode-api-réelle)
- [PWA et hors connexion](#pwa-et-hors-connexion)
- [Tests](#tests)
- [Règles métier](#règles-métier)

## Démarrage rapide

Prérequis : Node.js ≥ 20.9 (22 recommandé).

```bash
npm install          # installe et génère le client Prisma
npm run dev          # http://localhost:3000
```

Aucune configuration n'est nécessaire : sans `DATABASE_URL`, l'application utilise un **stockage local de démonstration**
(`.data/naera-store.json`) et injecte au premier lancement 7 missions de démonstration datées par rapport à aujourd'hui.

## Commandes

| Commande                                 | Rôle                                                           |
| ---------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                            | Serveur de développement (Turbopack)                           |
| `npm run build` / `npm start`            | Build et serveur de production                                 |
| `npm run lint`                           | ESLint                                                         |
| `npm run typecheck`                      | Génération des types de routes + `tsc --noEmit`                |
| `npm test`                               | Tests unitaires (Vitest)                                       |
| `npm run db:migrate`                     | Crée/applique les migrations en développement                  |
| `npm run db:deploy`                      | Applique les migrations en production                          |
| `npm run db:seed`                        | Paramètres par défaut + missions de démonstration (PostgreSQL) |
| `node scripts/generate-brand-assets.mjs` | Régénère icônes PWA et écrans de lancement iOS                 |

## Architecture

```
src/
├── core/            Moteur métier PUR (aucune dépendance Next/React/Node) — réutilisable en React Native
│   ├── pricing/     carburant, durée, coûts, marge, TVA, packages, arrondis, options, rentabilité
│   ├── transport/   types et score des solutions de retour (calculateTransportScore)
│   ├── simulation/  contrat de simulation, schémas Zod, resolveSimulation()
│   ├── mission/     statuts, progression terrain, numérotation NAE-CV, filtres, KPI
│   ├── insights/    recommandations d'optimisation (règles métier, 3 maximum)
│   ├── settings/    types, valeurs initiales, schéma Zod des paramètres
│   └── shared/      calendrier (jours fériés), fuseau Paris, argent, formatage, erreurs
├── services/        Adaptateurs (serveur uniquement)
│   ├── routing/     RoutingService → GoogleRoutesProvider | MockRoutingProvider
│   ├── transport/   ReturnTransportService, TrainService, TransitService, VtcService
│   ├── places/      PlacesService (autocomplétion)
│   ├── fuel/        FuelService
│   ├── simulation/  SimulationService (orchestration)
│   ├── mission/     MissionService (création, progression, démo)
│   ├── settings/    source unique des paramètres
│   ├── container.ts choix des adaptateurs selon la configuration
│   └── use-cases.ts cas d'usage partagés par les Server Actions et l'API REST
├── repositories/    Persistance : Prisma/PostgreSQL ou fichier JSON local (démo)
├── actions/         Server Actions (interface web)
├── app/             Routes Next.js (App Router) + API REST /api/v1
├── features/        Écrans composés (nouvelle mission, détail, paramètres)
├── components/      Design system (ui/) et composants métier
├── hooks/           Hooks client (mode interne/client…)
└── utils/           Utilitaires d'affichage
```

**Principes**

- Le tarif est calculé par une fonction pure (`resolveSimulation`) : **côté client** pour un recalcul instantané à chaque
  choix (itinéraire, retour, stratégie), puis **côté serveur** à l'enregistrement (source de vérité).
- Aucune logique d'API dans les composants. Les écrans passent par les Server Actions ; une future app mobile passera par
  l'API REST, qui appelle **les mêmes cas d'usage** :

| Méthode        | Route                          | Rôle                                   |
| -------------- | ------------------------------ | -------------------------------------- |
| `GET`          | `/api/v1/places?q=`            | Autocomplétion d'adresses              |
| `POST`         | `/api/v1/simulations`          | Simulation (corps : `MissionRequest`)  |
| `GET` / `POST` | `/api/v1/missions`             | Liste / création                       |
| `GET`          | `/api/v1/missions/:id`         | Détail                                 |
| `POST`         | `/api/v1/missions/:id/actions` | Progression (`{ "action": "START" }`…) |
| `GET`          | `/api/v1/settings`             | Paramètres en vigueur                  |

> ⚠️ Pas encore d'authentification (MVP mono-utilisateur) : ne pas exposer publiquement avant d'avoir ajouté l'authentification.

## Variables d'environnement

Voir [`.env.example`](.env.example). Toutes les clés sont lues **côté serveur uniquement** (`src/services/config.ts`).

| Variable                                | Obligatoire             | Rôle                                                  |
| --------------------------------------- | ----------------------- | ----------------------------------------------------- |
| `DATABASE_URL`                          | Non (oui en production) | PostgreSQL. Absente : stockage local de démonstration |
| `LOCAL_DATA_DIR`                        | Non                     | Dossier du stockage local (défaut `./.data`)          |
| `GOOGLE_MAPS_API_KEY`                   | Non                     | Google Routes API (itinéraire, trafic, péages)        |
| `NAVITIA_API_KEY`                       | Non                     | Transports publics (adaptateur à venir)               |
| `SNCF_API_KEY`                          | Non                     | Trains (adaptateur à venir)                           |
| `UBER_CLIENT_ID` / `UBER_CLIENT_SECRET` | Non                     | VTC (adaptateur à venir)                              |
| `NEXT_PUBLIC_APP_NAME`                  | Non                     | Nom affiché (« NAERA Convoyage »)                     |

## Base de données

Prisma 7 (générateur `prisma-client`, adaptateur `@prisma/adapter-pg`) sur **PostgreSQL**. Schéma : `prisma/schema.prisma`.

Modèles : `User`, `Customer`, `Vehicle`, `Mission`, `MissionCost`, `Quote`, `TransportOption`, `MissionPhoto`,
`MissionDocument`, `MissionSignature`, `MissionEvent`, `PricingSettings`, `PricingProfile`, `Package`, `ServiceOption`,
`Sequence`. Les profils tarifaires (`PricingProfile`) préparent le B2B : garages, marchands VO, concessions, loueurs.

```bash
docker compose up -d                                   # PostgreSQL 16 local
echo 'DATABASE_URL="postgresql://naera:naera@localhost:5432/naera?schema=public"' > .env
npm run db:migrate                                     # applique prisma/migrations
npm run db:seed                                        # paramètres + missions de démonstration
npm run dev
```

Numérotation des missions : `NAE-CV-AAAA-NNNN`, incrément atomique par année (table `Sequence`).

## Mode simulé et mode API réelle

| Donnée                                           | Sans clé (défaut)                                      | Avec clé                                      |
| ------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------- |
| Itinéraire, durée avec trafic, péages, variantes | Simulé (référentiel de ~100 villes, scénarios de démo) | **Google Routes API** (`GOOGLE_MAPS_API_KEY`) |
| Autocomplétion d'adresses                        | Simulée (villes françaises)                            | Google Places : à brancher (phase 7)          |
| Train, transports publics                        | Simulés                                                | SNCF / Navitia : à brancher (phase 7)         |
| VTC, taxi, accompagnateur                        | Estimés à partir des tarifs paramétrés                 | Uber : à brancher (phase 7)                   |

- Chaque valeur affiche sa source : **Live**, **Estimé**, **Simulé** ou **Manuel**. Les écrans de démonstration portent
  le bandeau « Données de démonstration ».
- Si l'API échoue, l'application **bascule sur la simulation** et l'indique. Si l'adresse ne peut pas être localisée,
  elle propose une **saisie manuelle** (distance, durée, péages). Les prix de retour et l'itinéraire restent corrigeables
  à la main sur l'écran résultat. L'erreur technique est journalisée côté serveur, jamais affichée.
- L'adaptateur Google Routes (`src/services/routing/google-routes-provider.ts`) est implémenté mais n'a pas encore été
  testé avec une vraie clé.
- Scénarios de démonstration : Paris → Lille, Paris → Lyon, Paris → Rouen, Paris → Bordeaux.

## PWA et hors connexion

- Manifeste (`src/app/manifest.ts`), nom « NAERA Convoyage », `display: standalone`, icônes 192/512 et maskable,
  icône Apple, écrans de lancement iOS (`public/splash`), couleurs de thème clair/sombre.
- Service worker `public/sw.js` (production uniquement) : les pages déjà consultées (accueil, missions, détail d'une
  mission) restent lisibles si la connexion tombe ; les ressources statiques sont mises en cache.
- `experimental.useOffline` : bandeau « Hors connexion » et nouvelle tentative automatique des actions.
- Installation : Chrome/Android propose l'installation ; sur iPhone, Safari → Partager → « Sur l'écran d'accueil »
  (HTTPS requis hors `localhost`).

## Tests

```bash
npm test
```

Couverture actuelle (Vitest) : carburant, durée de mission, coût, TVA, marge, packages, arrondis, options et
majorations (week-end, jours fériés), score transport, rentabilité, numérotation, progression terrain, scénario complet
Paris → Lille, et services simulés (localisation, bascule en cas d'échec d'API, saisie manuelle).

## Règles métier

- **Temps mission** = trajet vers le véhicule + formalités départ (15 min) + inspection (15 min) + conduite (durée avec
  trafic) + formalités livraison (15 min) + attente + retour convoyeur.
- **Coût réel** = temps × coût horaire (18 €/h) + transport aller + carburant (distance × conso / 100 × prix) + péages
  - transport retour + frais fixes (15 €) + frais variables (0,05 €/km) + options + autres coûts.
- **Marge** : pourcentage appliqué au coût (taux de marge = marge / coût, 30 % par défaut) ou montant fixe.
  **Prix minimum rentable** = coût × (1 + marge minimum, 10 %).
- **Contrôle de rentabilité** : le forfait (City, Local+, Regional, France, France+, Long Distance) est comparé au prix
  cible et au prix minimum. Il n'est retenu que s'il couvre la marge cible ; sinon « Tarif package insuffisant pour
  cette mission » ou « Package sous la marge cible », avec le prix recommandé.
- **Arrondi commercial** toujours vers le haut : exact, 5 €, 10 €, ou prix psychologique (…9 €).
- **Majorations automatiques** : week-end (+20 %) ou jour férié (+30 %), sans cumul.
- Toutes ces valeurs sont modifiables dans **Paramètres** (source unique de vérité).
