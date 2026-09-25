-- Clarification des données client et des notes.
--
-- 1. Mission.customerSnapshot : contact client FIGÉ au moment de la commande.
--    Il remplace l'écriture d'une ligne dans la table historique "Customer"
--    (une ligne par mission). "Customer" devient LEGACY : conservée, plus
--    alimentée, lue seulement en secours. Suppression planifiée (docs/data-model.md).
-- 2. Mission.internalNotes : notes internes Naera, séparées des consignes
--    ("notes") visibles du convoyeur et du client.
--
-- Migration additive, sans perte : aucune colonne ni table supprimée.

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "customerSnapshot" JSONB,
ADD COLUMN     "internalNotes" TEXT;

-- Reprise : snapshot construit depuis la ligne "Customer" liée à chaque mission.
UPDATE "Mission" AS m
SET "customerSnapshot" = jsonb_strip_nulls(jsonb_build_object(
    'type', c."type",
    'firstName', c."firstName",
    'lastName', c."lastName",
    'companyName', c."companyName",
    'phone', c."phone",
    'email', c."email",
    'address', c."address"
))
FROM "Customer" AS c
WHERE m."customerId" = c."id"
  AND m."customerSnapshot" IS NULL;

-- Reprise : les notes saisies dans le back-office avant cette séparation sont
-- considérées comme internes (choix prudent : elles ne deviennent pas visibles
-- du convoyeur ou du client). Les consignes saisies depuis les portails restent.
UPDATE "Mission"
SET "internalNotes" = "notes",
    "notes" = NULL
WHERE "channel" = 'BACKOFFICE'
  AND "notes" IS NOT NULL
  AND "internalNotes" IS NULL;
