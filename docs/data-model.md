# Modèle de données clients : sources de vérité, snapshots, legacy

Une information n'a qu'**une** source de vérité. Les copies sont des
**snapshots** assumés (historique figé) ou des données **legacy** en cours
d'extinction.

## Qui est quoi

| Donnée                                                   | Rôle                                                                                                      | Statut                                                       | Modifiable ?                                | Visible par                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `PersonalCustomer`                                       | Le client particulier : identité et coordonnées **actuelles**                                             | **Source de vérité**                                         | Oui (compte client, Naera)                  | Le client lui-même, Naera                                                    |
| `BusinessAccount`                                        | L'entreprise cliente (locataire) : raison sociale, e-mail de facturation, ville, offre                    | **Source de vérité**                                         | Oui (Naera, propriétaire du compte)         | Ses membres, Naera                                                           |
| `BusinessMember` + `User`                                | Les personnes d'une entreprise et leur rôle ; coordonnées de chaque utilisateur                           | **Source de vérité**                                         | Oui                                         | Membres (selon rôle), Naera                                                  |
| `Mission.customerSnapshot`                               | Le contact client **tel qu'il était au moment de la commande** (nom, société, téléphone, e-mail, adresse) | **Snapshot historique**                                      | Non : figé à la création                    | Naera ; le client voit son propre snapshot ; le convoyeur ne voit que le nom |
| `Mission.businessAccountId` / `personalCustomerId`       | Rattachement de la mission à son locataire                                                                | **Source de vérité** du rattachement (isolation des données) | Non par les portails (déduit de la session) | Utilisé par le serveur pour filtrer                                          |
| `Mission` contacts (`pickupContact*`, `dropoffContact*`) | Personnes à joindre sur place pour **cette** mission                                                      | **Donnée de mission** (propre à la mission, pas au client)   | Saisis à la commande                        | Client (auteur), convoyeur affecté, Naera                                    |
| `Mission.notes`                                          | Consignes opérationnelles (accès, clés…)                                                                  | Donnée de mission                                            | Oui                                         | Client (auteur), convoyeur, Naera                                            |
| `Mission.internalNotes`                                  | Notes internes Naera                                                                                      | Donnée interne                                               | Oui (Naera)                                 | **Naera uniquement**                                                         |
| `Quote.customerSnapshot`, `Invoice`                      | Contact et montants figés sur le devis / la facture                                                       | **Snapshot historique** (document)                           | Non                                         | Client concerné, Naera                                                       |
| `Customer` (table)                                       | Ancien « client » de la phase 0 : une ligne par mission                                                   | **LEGACY**                                                   | Plus aucune écriture                        | Lu en secours uniquement                                                     |
| `PersonalCustomer.legacyCustomerId`                      | Trace de migration vers la ligne `Customer` d'origine                                                     | **LEGACY** (temporaire)                                      | Non                                         | Interne                                                                      |

### Pourquoi un snapshot sur la mission ?

Une mission, son devis et sa facture doivent rester exacts même si le client
change ensuite de téléphone, d'adresse ou de raison sociale. Le snapshot est
écrit **une seule fois**, à la création, à partir de la source de vérité :

- espace professionnel : `BusinessAccount` (raison sociale, e-mail de facturation) + `User` (nom, téléphone du commanditaire) ;
- espace particulier : `PersonalCustomer` ;
- back-office Naera : contact saisi par l'exploitation.

Les portails n'envoient jamais le snapshot : il est construit par le serveur
(`src/services/portals/orders.ts`). Pour afficher les coordonnées **actuelles**
d'un client, on lit toujours `PersonalCustomer` / `BusinessAccount`, jamais le
snapshot.

## Ce qui a changé (migration `20260925090000_customer_snapshot_internal_notes`)

1. Ajout de `Mission.customerSnapshot` (JSON) et reprise depuis la ligne
   `Customer` liée à chaque mission.
2. Les nouvelles missions **n'écrivent plus** dans `Customer`.
3. Lecture : `customerSnapshot`, puis en secours l'ancienne ligne `Customer`
   (missions qui n'auraient pas été reprises).
4. Ajout de `Mission.internalNotes`. Les notes saisies dans le back-office avant
   cette séparation deviennent des notes internes (choix prudent : elles ne sont
   pas rendues visibles au convoyeur ni au client).

Migration additive : aucune table ni colonne supprimée.

## Plan de suppression de `Customer` (à exécuter plus tard)

| Étape    | Action                                                                                                                                                                                                                                        | Condition pour passer à la suivante         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1 — fait | Snapshot écrit sur la mission, `Customer` n'est plus alimentée, reprise des données                                                                                                                                                           | Migration appliquée en production           |
| 2        | Contrôle en production : `SELECT count(*) FROM "Mission" WHERE "customerId" IS NOT NULL AND "customerSnapshot" IS NULL;` doit renvoyer 0                                                                                                      | Résultat 0, sauvegarde de la base effectuée |
| 3        | Retirer la lecture de secours (`legacyCustomerSnapshot` dans `src/repositories/prisma/mission-mapper.ts`) et l'`include` `customer`                                                                                                           | Une version en production sans erreur       |
| 4        | Migration de suppression : contraintes et colonnes `Mission.customerId`, `Vehicle.customerId`, relation `PricingProfile.customers`, `PersonalCustomer.legacyCustomerId`, puis table `Customer` et type `CustomerType` s'il n'est plus utilisé | Export archivé de la table `Customer`       |

`CustomerType` (particulier / professionnel) reste utilisé par le snapshot.
