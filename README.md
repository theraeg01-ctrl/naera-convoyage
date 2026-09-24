# NAERA Convoyage

Application web (PWA installable) pour **estimer, organiser, tarifer et suivre des missions de convoyage automobile**.
Objectif : estimer une mission standard en moins de 30 secondes et connaître immédiatement sa rentabilité.

> **État : phase 0 + architecture multi-portails.** Quatre espaces séparés côté serveur : **Naera** (back-office,
> vue complète coûts/marges), **professionnels** (multi-utilisateurs, rôles, plans), **particuliers** et **convoyeurs**.
> Parcours fonctionnel Naera : **Nouvelle mission → Simulation → Résultat → Sauvegarde → Suivi**. Parcours client :
> **Départ → Destination → Véhicule → Date → Options → Tarif → Commande → Suivi**.
> Tant que les API ne sont pas connectées, itinéraires et transports sont **simulés** et toujours signalés comme tels.

## Sommaire

- [Démarrage rapide](#démarrage-rapide)
- [Commandes](#commandes)
- [Architecture](#architecture)
- [Plateforme multi-portails](#plateforme-multi-portails)
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
(`.data/naera-store.json`) et injecte au premier lancement le jeu de démonstration (comptes, rôles, plans, convoyeurs,
~33 missions datées par rapport à aujourd'hui, factures). L'écran d'accueil propose ensuite de **choisir un profil**
(connexion de démonstration, active par défaut hors production).

## Commandes

| Commande                                 | Rôle                                                      |
| ---------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                            | Serveur de développement (Turbopack)                      |
| `npm run build` / `npm start`            | Build et serveur de production                            |
| `npm run lint`                           | ESLint                                                    |
| `npm run typecheck`                      | Génération des types de routes + `tsc --noEmit`           |
| `npm test`                               | Tests unitaires (Vitest)                                  |
| `npm run db:migrate`                     | Crée/applique les migrations en développement             |
| `npm run db:deploy`                      | Applique les migrations en production                     |
| `npm run db:seed`                        | Paramètres par défaut + jeu de démonstration (PostgreSQL) |
| `node scripts/generate-brand-assets.mjs` | Régénère icônes PWA et écrans de lancement iOS            |

## Architecture

```
src/
├── core/            Moteur métier PUR (aucune dépendance Next/React/Node) — réutilisable en React Native
│   ├── pricing/     carburant, durée, coûts, marge, TVA, packages, arrondis, options, rentabilité
│   ├── transport/   types et score des solutions de retour (calculateTransportScore)
│   ├── simulation/  contrat de simulation, schémas Zod, resolveSimulation()
│   ├── mission/     statuts, progression terrain, suivi client, numérotation NAE-CV, filtres, KPI
│   ├── accounts/    utilisateurs, particuliers, entreprises, membres, convoyeurs, factures
│   ├── access/      acteurs, permissions par rôle, périmètres (tenant), vues projetées, actions autorisées
│   ├── plans/       plans pro, fonctionnalités, droits effectifs, hasFeature()
│   ├── navigation/  navigation de chaque portail (filtrée par rôle ET par plan)
│   ├── analytics/   indicateurs des comptes pro (prix client uniquement)
│   ├── insights/    recommandations d'optimisation (règles métier, 3 maximum)
│   ├── settings/    types, valeurs initiales, schéma Zod des paramètres
│   └── shared/      calendrier (jours fériés), fuseau Paris, argent, formatage, erreurs
├── services/        Adaptateurs (serveur uniquement)
│   ├── routing/     RoutingService → GoogleRoutesProvider | MockRoutingProvider
│   ├── transport/   ReturnTransportService, TrainService, TransitService, VtcService
│   ├── places/      PlacesService (autocomplétion)
│   ├── fuel/        FuelService
│   ├── simulation/  SimulationService (orchestration)
│   ├── mission/     MissionService (création, progression, affectation)
│   ├── auth/        POINT D'AUTHENTIFICATION (session) et gardes des pages (401/403)
│   ├── portals/     POINT D'AUTORISATION : un service par portail (admin, pro, client, driver, commandes)
│   ├── demo/        jeu de démonstration multi-portails (versionné)
│   ├── settings/    source unique des paramètres
│   ├── container.ts choix des adaptateurs selon la configuration
│   └── use-cases.ts cas d'usage du back-office partagés par les Server Actions et l'API REST
├── repositories/    Persistance : Prisma/PostgreSQL ou fichier JSON local (démo)
├── actions/         Server Actions (interface web)
├── app/             Routes Next.js : / (choix du profil), /admin, /pro, /client, /driver + API REST /api/v1
├── features/        Écrans composés (nouvelle mission, commande client, détail, paramètres)
├── components/      Design system (ui/) et composants métier
├── hooks/           Hooks client (mode interne/client…)
└── utils/           Utilitaires d'affichage
```

**Principes**

- Le tarif est calculé par une fonction pure (`resolveSimulation`) : **côté client** pour un recalcul instantané à chaque
  choix (itinéraire, retour, stratégie), puis **côté serveur** à l'enregistrement (source de vérité).
- Aucune logique d'API dans les composants. Les écrans passent par les Server Actions ; une future app mobile passera par
  l'API REST, qui appelle **les mêmes cas d'usage** :

Toutes les routes exigent une session (401 sinon) et renvoient la **vue du portail de l'acteur** :

| Méthode | Route                          | Qui              | Rôle                                                     |
| ------- | ------------------------------ | ---------------- | -------------------------------------------------------- |
| `GET`   | `/api/v1/me`                   | tous             | Acteur, permissions, fonctionnalités, navigation         |
| `GET`   | `/api/v1/places?q=`            | tous             | Autocomplétion d'adresses                                |
| `GET`   | `/api/v1/missions`             | tous             | Missions du périmètre (vue complète / client / terrain)  |
| `GET`   | `/api/v1/missions/:id`         | tous             | Détail — 404 hors périmètre                              |
| `POST`  | `/api/v1/missions/:id/actions` | tous             | Naera : pilotage ; convoyeur : étapes ; client : CONFIRM |
| `POST`  | `/api/v1/orders/quote`         | pro, particulier | Tarif client (prix de vente uniquement)                  |
| `POST`  | `/api/v1/orders`               | pro, particulier | Commande (tarif recalculé, rattachement par la session)  |
| `POST`  | `/api/v1/missions`             | Naera            | Création depuis une simulation                           |
| `POST`  | `/api/v1/simulations`          | Naera            | Simulation détaillée (coûts internes)                    |
| `GET`   | `/api/v1/settings`             | Naera            | Paramètres de tarification                               |

## Plateforme multi-portails

| Portail       | Route     | Utilisateurs                                      | Navigation                                                                           |
| ------------- | --------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Naera         | `/admin`  | `ADMIN`, `DISPATCHER`                             | Dashboard, Missions, Clients, Professionnels, Convoyeurs, Devis, Finance, Paramètres |
| Professionnel | `/pro`    | membres `OWNER`, `MANAGER`, `OPERATOR`, `BILLING` | Dashboard, Missions, Nouvelle mission, Facturation, Analytics*, Équipe*              |
| Particulier   | `/client` | client particulier                                | Accueil, Commander, Mes convoyages, Compte                                           |
| Convoyeur     | `/driver` | convoyeur                                         | Missions (affectées uniquement), Compte                                              |

\* selon le plan. Les anciennes adresses `/missions` et `/settings` redirigent vers `/admin`.

**Sécurité côté serveur (jamais seulement dans l'interface)**

1. **Authentification** — `src/services/auth/session.ts` : cookie httpOnly signé (HMAC) contenant l'utilisateur et le
   contexte actif ; le contexte est **revérifié en base à chaque requête** (membre désactivé = accès coupé). La connexion
   de démonstration (choix d'un profil) sera remplacée par un fournisseur d'identité (OIDC, lien magique…) : seul ce
   module change (`User.authSubject` est prévu).
2. **Autorisation** — `src/core/access/permissions.ts` (matrice rôle → permissions) appliquée par les gardes des pages
   (`requirePortal`, `requirePermission` → pages 401/403) **et** par chaque service de portail (`src/services/portals`).
3. **Isolation des données** — `MissionScope` (Naera : tout ; pro : son `BusinessAccount` ; particulier : son
   `PersonalCustomer` ; convoyeur : ses affectations) transformé en clause `WHERE` dans les dépôts : une mission d'une
   autre entreprise n'est jamais chargée, même avec son identifiant (404).
4. **Projections** — les portails clients et convoyeurs ne reçoivent que des vues construites en liste blanche
   (`src/core/access/projections.ts`) : aucun coût, marge, rémunération, coût de transport ni rentabilité.
5. **Commandes** — le navigateur n'envoie qu'une demande ; trajet, transports et tarif sont **recalculés par le
   serveur**, et le rattachement (entreprise/particulier, auteur) vient de la session, jamais de la saisie.

**Plans et fonctionnalités** — `Plan`, `Feature`, `PlanFeature`, `Subscription`, `FeatureOverride`. Plans :
`PRO_ESSENTIAL`, `PRO_PLUS`, `PRO_ANALYTICS`, `ENTERPRISE` (aucun prix codé, pas de Stripe). Fonctionnalités :
`analytics_basic`, `analytics_advanced`, `csv_export`, `pdf_reporting`, `team_management`, `cost_centers`,
`multi_agency`, `api_access`. Un seul point de décision : `hasFeature(account, feature)`. Les **options payantes par
mission** (rapport photo, contrôle renforcé, livraison prioritaire, créneau garanti, week-end, jour férié, attente) sont
indépendantes des abonnements et configurables dans les paramètres.

**Profils de démonstration** : Inès Moreau (admin Naera), Karim Haddad (exploitation), Julien Martin / Léa Petit /
Nadia Roux (Garage Martin, Pro Plus : propriétaire, opérateur, facturation), Thomas Lefèvre (Loc'Auto Nord, Pro
Essentiel), Sophie Durand (particulier, commande en cours), Marc Dubois et 3 autres convoyeurs. Garage Martin : 12
missions ce mois (8 terminées, 3 en cours, 1 à confirmer).

## Variables d'environnement

Voir [`.env.example`](.env.example). Toutes les clés sont lues **côté serveur uniquement** (`src/services/config.ts`).

| Variable                                | Obligatoire             | Rôle                                                   |
| --------------------------------------- | ----------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                          | Non (oui en production) | PostgreSQL. Absente : stockage local de démonstration  |
| `LOCAL_DATA_DIR`                        | Non                     | Dossier du stockage local (défaut `./.data`)           |
| `GOOGLE_MAPS_API_KEY`                   | Non                     | Google Routes API (itinéraire, trafic, péages)         |
| `NAVITIA_API_KEY`                       | Non                     | Transports publics (adaptateur à venir)                |
| `SNCF_API_KEY`                          | Non                     | Trains (adaptateur à venir)                            |
| `UBER_CLIENT_ID` / `UBER_CLIENT_SECRET` | Non                     | VTC (adaptateur à venir)                               |
| `NEXT_PUBLIC_APP_NAME`                  | Non                     | Nom affiché (« NAERA Convoyage »)                      |
| `NAERA_DEMO_AUTH`                       | Non                     | Connexion de démonstration (défaut : active hors prod) |
| `NAERA_SESSION_SECRET`                  | Oui en production       | Secret de signature des sessions                       |

## Base de données

Prisma 7 (générateur `prisma-client`, adaptateur `@prisma/adapter-pg`) sur **PostgreSQL**. Schéma : `prisma/schema.prisma`.

Modèles : `User`, `Customer` (contact figé, historique), `PersonalCustomer`, `BusinessAccount`, `BusinessMember`,
`BusinessAgency`, `CostCenter`, `DriverProfile`, `Vehicle`, `Mission`, `MissionAssignment`, `MissionOption`,
`MissionCost`, `Quote`, `Invoice`, `TransportOption`, `MissionPhoto`, `MissionDocument`, `MissionSignature`,
`MissionEvent`, `PricingSettings`, `PricingProfile`, `Package`, `ServiceOption`, `Plan`, `Feature`, `PlanFeature`,
`Subscription`, `FeatureOverride`, `Sequence`.

La migration `20260924160000_multi_portal_accounts` est **non destructive** : elle ajoute les nouvelles tables et
colonnes, reprend les données existantes (rôles, convoyeurs et affectations, comptes entreprise et particuliers déduits
des clients, options facturées), puis seulement retire `Mission.driverId` et `User.role`. `npm run db:seed` réinjecte
le jeu de démonstration sans toucher aux données réelles.

```bash
docker compose up -d                                   # PostgreSQL 16 local
echo 'DATABASE_URL="postgresql://naera:naera@localhost:5432/naera?schema=public"' > .env
npm run db:migrate                                     # applique prisma/migrations
npm run db:seed                                        # paramètres + jeu de démonstration
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
- Service worker `public/sw.js` (production uniquement) : les listes et fiches de mission déjà consultées (tous
  portails, notamment la fiche convoyeur) restent lisibles si la connexion tombe ; seules les réponses 200 sont gardées
  et ce cache est vidé à la déconnexion et au changement de profil. Les ressources statiques sont mises en cache.
- `experimental.useOffline` : bandeau « Hors connexion » et nouvelle tentative automatique des actions.
- Installation : Chrome/Android propose l'installation ; sur iPhone, Safari → Partager → « Sur l'écran d'accueil »
  (HTTPS requis hors `localhost`).

## Tests

```bash
npm test
```

Couverture actuelle (Vitest) : carburant, durée de mission, coût, TVA, marge, packages, arrondis, options et
majorations (week-end, jours fériés), score transport, rentabilité, numérotation, progression terrain, scénario complet
Paris → Lille, services simulés (localisation, bascule en cas d'échec d'API, saisie manuelle), et **séparation des
données** : matrice des permissions, périmètres, projections sans donnée interne, navigation par rôle et par plan,
jeton de session, et tests de bout en bout des services de portail sur le jeu de démonstration (isolation entre
entreprises, refus par rôle et par plan, rattachement des commandes imposé par la session).

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
