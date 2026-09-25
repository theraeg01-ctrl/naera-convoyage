# Cycle de vie d'une mission

Règles appliquées partout (moteur `src/core/mission`, portails, indicateurs).

## Statuts

| Statut        | Libellé      | Signification                                                                                                                                        | Qui le déclenche |
| ------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `DRAFT`       | Brouillon    | Mission préparée par Naera, non envoyée                                                                                                              | Naera            |
| `QUOTED`      | Devis envoyé | Tarif proposé, en attente de l'accord du client                                                                                                      | Naera            |
| `CONFIRMED`   | Confirmée    | Le client a validé le tarif (commande en ligne ou devis accepté)                                                                                     | Client ou Naera  |
| `ASSIGNED`    | Assignée     | Un convoyeur est affecté                                                                                                                             | Naera            |
| `IN_PROGRESS` | En cours     | Le convoyeur a démarré : prise en charge, inspection, route                                                                                          | Convoyeur        |
| `DELIVERED`   | Livrée       | **Véhicule livré : remise physique réalisée** au destinataire (arrivée, kilométrage d'arrivée, remise des clés)                                      | Convoyeur        |
| `COMPLETED`   | Terminée     | **Mission terminée : formalités finalisées** (PV de livraison signé, photos et documents rattachés, frais justifiés). La mission devient facturable. | Naera            |
| `CANCELLED`   | Annulée      | La mission n'aura pas lieu                                                                                                                           | Naera            |

**Véhicule livré ≠ Mission terminée.** Le convoyeur confirme la remise physique ; Naera clôture
ensuite, une fois le dossier complet. Une facture n'est émise que pour une mission terminée.

## Suivi client (6 étapes)

1. Commande enregistrée — création de la demande.
2. Mission confirmée — tarif validé par le client (« En attente de votre confirmation » tant que le devis n'est pas accepté).
3. Véhicule pris en charge — inspection au départ faite.
4. En route — le véhicule a quitté le point de départ.
5. Véhicule livré — remise physique réalisée.
6. Mission terminée — formalités finalisées.

## Indicateurs professionnels (périmètres)

Source unique : `src/core/analytics/business-analytics.ts`. Mois = date de prise en charge prévue.

| Libellé             | Statuts                                                          | Usage                                                      |
| ------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Demandes            | tous sauf `CANCELLED` (devis compris)                            | Volume de demandes du mois                                 |
| Missions confirmées | `CONFIRMED`, `ASSIGNED`, `IN_PROGRESS`, `DELIVERED`, `COMPLETED` | **Dépenses**, dépense moyenne par mission et par kilomètre |
| Livrées             | `DELIVERED`, `COMPLETED`                                         | Missions dont le véhicule a été remis                      |
| En cours            | `IN_PROGRESS` (toutes dates)                                     | Missions en route maintenant                               |
| À confirmer         | `QUOTED` (toutes dates)                                          | Devis en attente                                           |

Toute moyenne est calculée dans le périmètre de son numérateur : dépense moyenne par kilomètre =
dépenses des missions confirmées ÷ kilomètres de ces mêmes missions.
