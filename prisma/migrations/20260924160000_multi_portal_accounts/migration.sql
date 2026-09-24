-- Migration « plateforme multi-portails »
-- Étapes : 1) création des nouveaux types, tables et colonnes ;
-- 2) reprise des données existantes (aucune perte) ; 3) suppression des
-- colonnes remplacées ; 4) index et clés étrangères.
-- Reprises : Customer PROFESSIONAL -> BusinessAccount, Customer INDIVIDUAL ->
-- PersonalCustomer, Mission.driverId -> DriverProfile + MissionAssignment,
-- User.role -> User.staffRole, options du tarif -> MissionOption.

-- ---------------------------------------------------------------------------
-- 1. Nouveaux types, colonnes et tables (additif)
-- ---------------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'DISPATCHER');

-- CreateEnum
CREATE TYPE "BusinessRole" AS ENUM ('OWNER', 'MANAGER', 'OPERATOR', 'BILLING');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "MissionChannel" AS ENUM ('BACKOFFICE', 'CLIENT_PORTAL', 'PRO_PORTAL', 'API');

-- AlterEnum
ALTER TYPE "ProfessionalSegment" ADD VALUE 'FLEET';

-- AlterTable (ancienne colonne "role" conservée jusqu'à la reprise)
ALTER TABLE "User" ADD COLUMN     "authSubject" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "staffRole" "StaffRole";

-- AlterTable (ancienne colonne "driverId" conservée jusqu'à la reprise)
ALTER TABLE "Mission" ADD COLUMN     "agencyId" TEXT,
ADD COLUMN     "businessAccountId" TEXT,
ADD COLUMN     "channel" "MissionChannel" NOT NULL DEFAULT 'BACKOFFICE',
ADD COLUMN     "costCenterId" TEXT,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "customerReference" TEXT,
ADD COLUMN     "dropoffContactName" TEXT,
ADD COLUMN     "dropoffContactPhone" TEXT,
ADD COLUMN     "personalCustomerId" TEXT,
ADD COLUMN     "pickupContactName" TEXT,
ADD COLUMN     "pickupContactPhone" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "businessAccountId" TEXT,
ADD COLUMN     "personalCustomerId" TEXT;

-- CreateTable
CREATE TABLE "PersonalCustomer" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "legacyCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "siret" TEXT,
    "segment" "ProfessionalSegment",
    "billingEmail" TEXT,
    "address" TEXT,
    "city" TEXT,
    "pricingProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessRole" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "agencyId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessAgency" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,

    CONSTRAINT "BusinessAgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "homeCity" TEXT,
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "hourlyRate" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionAssignment" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PROPOSED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "assignedByUserId" TEXT,

    CONSTRAINT "MissionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionOption" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountHT" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "MissionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "missionId" TEXT,
    "businessAccountId" TEXT,
    "personalCustomerId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "amountHT" DECIMAL(10,2) NOT NULL,
    "vatAmount" DECIMAL(10,2) NOT NULL,
    "amountTTC" DECIMAL(10,2) NOT NULL,
    "lines" JSONB,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monthlyPriceHT" DECIMAL(10,2),

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "limits" JSONB,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("planId","featureId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureOverride" (
    "businessAccountId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,

    CONSTRAINT "FeatureOverride_pkey" PRIMARY KEY ("businessAccountId","featureId")
);

-- ---------------------------------------------------------------------------
-- 2. Reprise des données existantes
-- ---------------------------------------------------------------------------

-- 2a. Rôles back-office
UPDATE "User" SET "staffRole" = 'ADMIN' WHERE "role" = 'ADMIN';
UPDATE "User" SET "staffRole" = 'DISPATCHER' WHERE "role" = 'DISPATCHER';

-- 2b. Profils convoyeurs : utilisateurs DRIVER ou déjà affectés à une mission
INSERT INTO "DriverProfile" ("id", "userId", "firstName", "lastName", "status", "createdAt")
SELECT gen_random_uuid()::text, u."id", split_part(u."name", ' ', 1),
       COALESCE(NULLIF(substr(u."name", length(split_part(u."name", ' ', 1)) + 2), ''), ''), 'ACTIVE', CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" = 'DRIVER' OR EXISTS (SELECT 1 FROM "Mission" m WHERE m."driverId" = u."id");

-- 2c. Affectations issues de Mission.driverId
INSERT INTO "MissionAssignment" ("id", "missionId", "driverProfileId", "status", "assignedAt")
SELECT gen_random_uuid()::text, m."id", d."id", 'ACCEPTED', m."updatedAt"
FROM "Mission" m JOIN "DriverProfile" d ON d."userId" = m."driverId";

-- 2d. Entreprises : une par raison sociale des clients professionnels
INSERT INTO "BusinessAccount" ("id", "name", "segment", "pricingProfileId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c."companyName", MAX(c."segment"::text)::"ProfessionalSegment", MAX(c."pricingProfileId"),
       MIN(c."createdAt"), CURRENT_TIMESTAMP
FROM "Customer" c
WHERE c."type" = 'PROFESSIONAL' AND c."companyName" IS NOT NULL
GROUP BY c."companyName";

UPDATE "Mission" m SET "businessAccountId" = b."id"
FROM "Customer" c JOIN "BusinessAccount" b ON b."name" = c."companyName"
WHERE m."customerId" = c."id" AND c."type" = 'PROFESSIONAL';

-- 2e. Particuliers (et professionnels sans raison sociale)
INSERT INTO "PersonalCustomer" ("id", "firstName", "lastName", "email", "phone", "address", "legacyCustomerId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, COALESCE(c."firstName", ''), COALESCE(c."lastName", c."companyName", 'Client'),
       c."email", c."phone", c."address", c."id", c."createdAt", CURRENT_TIMESTAMP
FROM "Customer" c
WHERE c."type" = 'INDIVIDUAL' OR c."companyName" IS NULL;

UPDATE "Mission" m SET "personalCustomerId" = p."id"
FROM "PersonalCustomer" p
WHERE p."legacyCustomerId" = m."customerId" AND m."businessAccountId" IS NULL;

-- 2f. Options facturées : extraites de l'instantané de tarif
INSERT INTO "MissionOption" ("id", "missionId", "code", "label", "kind", "amountHT")
SELECT gen_random_uuid()::text, m."id", line->>'id', line->>'label', line->>'kind', (line->>'amount')::numeric
FROM "Mission" m, jsonb_array_elements(m."pricing"->'lines') AS line
WHERE line->>'kind' IN ('OPTION', 'SURCHARGE');

-- 2g. Devis : rattachement au locataire de la mission
UPDATE "Quote" q SET "businessAccountId" = m."businessAccountId", "personalCustomerId" = m."personalCustomerId"
FROM "Mission" m WHERE q."missionId" = m."id";

-- ---------------------------------------------------------------------------
-- 3. Suppression des colonnes remplacées (données reprises ci-dessus)
-- ---------------------------------------------------------------------------

-- DropForeignKey
ALTER TABLE "Mission" DROP CONSTRAINT "Mission_driverId_fkey";

-- AlterTable
ALTER TABLE "Mission" DROP COLUMN "driverId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRole";

-- ---------------------------------------------------------------------------
-- 4. Index et clés étrangères
-- ---------------------------------------------------------------------------

-- CreateIndex
CREATE UNIQUE INDEX "PersonalCustomer_userId_key" ON "PersonalCustomer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalCustomer_legacyCustomerId_key" ON "PersonalCustomer"("legacyCustomerId");

-- CreateIndex
CREATE INDEX "PersonalCustomer_lastName_idx" ON "PersonalCustomer"("lastName");

-- CreateIndex
CREATE INDEX "BusinessAccount_name_idx" ON "BusinessAccount"("name");

-- CreateIndex
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessAccountId_userId_key" ON "BusinessMember"("businessAccountId", "userId");

-- CreateIndex
CREATE INDEX "BusinessAgency_businessAccountId_idx" ON "BusinessAgency"("businessAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_businessAccountId_code_key" ON "CostCenter"("businessAccountId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE INDEX "MissionAssignment_driverProfileId_status_idx" ON "MissionAssignment"("driverProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MissionAssignment_missionId_driverProfileId_key" ON "MissionAssignment"("missionId", "driverProfileId");

-- CreateIndex
CREATE INDEX "MissionOption_missionId_idx" ON "MissionOption"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_businessAccountId_issuedAt_idx" ON "Invoice"("businessAccountId", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_personalCustomerId_idx" ON "Invoice"("personalCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_businessAccountId_key" ON "Subscription"("businessAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_externalId_key" ON "Subscription"("externalId");

-- CreateIndex
CREATE INDEX "Mission_businessAccountId_scheduledDate_idx" ON "Mission"("businessAccountId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Mission_personalCustomerId_idx" ON "Mission"("personalCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_authSubject_key" ON "User"("authSubject");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_personalCustomerId_fkey" FOREIGN KEY ("personalCustomerId") REFERENCES "PersonalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "BusinessAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalCustomer" ADD CONSTRAINT "PersonalCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAccount" ADD CONSTRAINT "BusinessAccount_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "PricingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "BusinessAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAgency" ADD CONSTRAINT "BusinessAgency_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAssignment" ADD CONSTRAINT "MissionAssignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAssignment" ADD CONSTRAINT "MissionAssignment_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionOption" ADD CONSTRAINT "MissionOption_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_personalCustomerId_fkey" FOREIGN KEY ("personalCustomerId") REFERENCES "PersonalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureOverride" ADD CONSTRAINT "FeatureOverride_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureOverride" ADD CONSTRAINT "FeatureOverride_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
