-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DISPATCHER', 'DRIVER');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'QUOTED', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "ProfessionalSegment" AS ENUM ('GARAGE', 'USED_CAR_DEALER', 'DEALERSHIP', 'RENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('CITY', 'SEDAN', 'SUV', 'VAN', 'PREMIUM');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('TRAIN', 'PUBLIC_TRANSIT', 'VTC', 'TAXI', 'COMPANION', 'PERSONAL_VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "LegDirection" AS ENUM ('ACCESS', 'RETURN');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('LIVE', 'ESTIMATED', 'SIMULATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "RouteKind" AS ENUM ('FASTEST', 'ECONOMIC', 'NO_TOLL');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('DEPARTURE', 'DAMAGE', 'ARRIVAL');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('REGISTRATION', 'MISSION_ORDER', 'TRANSPORT_PROOF', 'TRAIN_TICKET', 'TOLL', 'INVOICE', 'PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "SignatureRole" AS ENUM ('SELLER', 'CUSTOMER', 'DRIVER');

-- CreateEnum
CREATE TYPE "MissionEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'CHECKPOINT', 'NOTE');

-- CreateEnum
CREATE TYPE "MarginMode" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "RoundingMode" AS ENUM ('EXACT', 'UP_5', 'UP_10', 'PSYCHOLOGICAL');

-- CreateEnum
CREATE TYPE "OptimizationStrategy" AS ENUM ('CHEAPEST', 'FASTEST', 'BALANCED');

-- CreateEnum
CREATE TYPE "OptionPricingType" AS ENUM ('FIXED', 'PER_SLICE', 'PERCENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DISPATCHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "segment" "ProfessionalSegment",
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "pricingProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "category" "VehicleCategory" NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "consumptionPer100" DOUBLE PRECISION,
    "make" TEXT,
    "model" TEXT,
    "plate" TEXT,
    "vin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "scheduledDate" TEXT NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "pickupLabel" TEXT NOT NULL,
    "pickupCity" TEXT,
    "pickupPostalCode" TEXT,
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "dropoffLabel" TEXT NOT NULL,
    "dropoffCity" TEXT,
    "dropoffPostalCode" TEXT,
    "dropoffLat" DOUBLE PRECISION,
    "dropoffLng" DOUBLE PRECISION,
    "routeKind" "RouteKind" NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "trafficDurationMin" INTEGER NOT NULL,
    "tollsEur" DECIMAL(10,2) NOT NULL,
    "routeSummary" TEXT NOT NULL,
    "routePolyline" TEXT,
    "routeSource" "DataSource" NOT NULL,
    "strategy" "OptimizationStrategy" NOT NULL,
    "dataMode" TEXT NOT NULL,
    "priceHT" DECIMAL(10,2) NOT NULL,
    "vatAmount" DECIMAL(10,2) NOT NULL,
    "priceTTC" DECIMAL(10,2) NOT NULL,
    "costTotal" DECIMAL(10,2) NOT NULL,
    "marginAmount" DECIMAL(10,2) NOT NULL,
    "request" JSONB NOT NULL,
    "pricing" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "inspectedAt" TIMESTAMP(3),
    "drivingAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "customerId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionCost" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "driver" DECIMAL(10,2) NOT NULL,
    "access" DECIMAL(10,2) NOT NULL,
    "fuel" DECIMAL(10,2) NOT NULL,
    "tolls" DECIMAL(10,2) NOT NULL,
    "returnCost" DECIMAL(10,2) NOT NULL,
    "fixedFees" DECIMAL(10,2) NOT NULL,
    "variableFees" DECIMAL(10,2) NOT NULL,
    "options" DECIMAL(10,2) NOT NULL,
    "other" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "totalMinutes" INTEGER NOT NULL,
    "fuelQuantity" DOUBLE PRECISION NOT NULL,
    "fuelUnit" TEXT NOT NULL,
    "fuelUnitPrice" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "MissionCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportOption" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "optionKey" TEXT NOT NULL,
    "direction" "LegDirection" NOT NULL,
    "mode" "TransportMode" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "connections" INTEGER NOT NULL,
    "simplicity" DOUBLE PRECISION NOT NULL,
    "detail" TEXT NOT NULL,
    "departureTime" TEXT,
    "arrivalTime" TEXT,
    "fromStation" TEXT,
    "toStation" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "source" "DataSource" NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER,

    CONSTRAINT "TransportOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "priceHT" DECIMAL(10,2) NOT NULL,
    "vatAmount" DECIMAL(10,2) NOT NULL,
    "priceTTC" DECIMAL(10,2) NOT NULL,
    "lines" JSONB NOT NULL,
    "customerSnapshot" JSONB,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionPhoto" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "kind" "PhotoKind" NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionDocument" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionSignature" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "role" "SignatureRole" NOT NULL,
    "signerName" TEXT,
    "imageUrl" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionEvent" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "type" "MissionEventType" NOT NULL,
    "label" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PricingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL,
    "baseCity" TEXT NOT NULL,
    "vatPercent" DECIMAL(5,2) NOT NULL,
    "hourlyDriverCost" DECIMAL(10,2) NOT NULL,
    "marginMode" "MarginMode" NOT NULL,
    "marginPercent" DECIMAL(6,2) NOT NULL,
    "marginFixedAmount" DECIMAL(10,2) NOT NULL,
    "minimumMarginPercent" DECIMAL(6,2) NOT NULL,
    "roundingMode" "RoundingMode" NOT NULL,
    "fixedFees" JSONB NOT NULL,
    "variableFeePerKm" DECIMAL(10,3) NOT NULL,
    "quoteValidityDays" INTEGER NOT NULL,
    "petrolPrice" DECIMAL(10,3) NOT NULL,
    "dieselPrice" DECIMAL(10,3) NOT NULL,
    "electricityPrice" DECIMAL(10,3) NOT NULL,
    "consumption" JSONB NOT NULL,
    "departureFormalitiesMin" INTEGER NOT NULL,
    "inspectionMin" INTEGER NOT NULL,
    "deliveryFormalitiesMin" INTEGER NOT NULL,
    "companionCostPerKm" DECIMAL(10,3) NOT NULL,
    "personalVehicleCostPerKm" DECIMAL(10,3) NOT NULL,
    "vtcBaseFare" DECIMAL(10,2) NOT NULL,
    "vtcPerKm" DECIMAL(10,3) NOT NULL,
    "taxiBaseFare" DECIMAL(10,2) NOT NULL,
    "taxiPerKm" DECIMAL(10,3) NOT NULL,
    "defaultStrategy" "OptimizationStrategy" NOT NULL,
    "scoreWeights" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "segment" "ProfessionalSegment",
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "marginPercent" DECIMAL(6,2),
    "discountPercent" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "pricingProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minKm" INTEGER NOT NULL,
    "maxKm" INTEGER,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "pricePerKm" DECIMAL(10,3) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOption" (
    "id" TEXT NOT NULL,
    "pricingProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pricingType" "OptionPricingType" NOT NULL,
    "amount" DECIMAL(10,2),
    "percent" DECIMAL(6,2),
    "sliceMinutes" INTEGER,
    "internalCost" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ServiceOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Customer_companyName_idx" ON "Customer"("companyName");

-- CreateIndex
CREATE INDEX "Customer_lastName_idx" ON "Customer"("lastName");

-- CreateIndex
CREATE INDEX "Vehicle_plate_idx" ON "Vehicle"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_reference_key" ON "Mission"("reference");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "Mission"("status");

-- CreateIndex
CREATE INDEX "Mission_scheduledDate_idx" ON "Mission"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "MissionCost_missionId_key" ON "MissionCost"("missionId");

-- CreateIndex
CREATE INDEX "TransportOption_missionId_direction_idx" ON "TransportOption"("missionId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE INDEX "MissionPhoto_missionId_kind_idx" ON "MissionPhoto"("missionId", "kind");

-- CreateIndex
CREATE INDEX "MissionDocument_missionId_idx" ON "MissionDocument"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionSignature_missionId_role_key" ON "MissionSignature"("missionId", "role");

-- CreateIndex
CREATE INDEX "MissionEvent_missionId_at_idx" ON "MissionEvent"("missionId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Package_pricingProfileId_code_key" ON "Package"("pricingProfileId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOption_pricingProfileId_code_key" ON "ServiceOption"("pricingProfileId", "code");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "PricingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionCost" ADD CONSTRAINT "MissionCost_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportOption" ADD CONSTRAINT "TransportOption_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionPhoto" ADD CONSTRAINT "MissionPhoto_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionDocument" ADD CONSTRAINT "MissionDocument_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionSignature" ADD CONSTRAINT "MissionSignature_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionEvent" ADD CONSTRAINT "MissionEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "PricingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOption" ADD CONSTRAINT "ServiceOption_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "PricingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
