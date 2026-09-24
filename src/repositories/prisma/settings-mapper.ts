import type { AppSettings, OptionPricing, PackageTier, ServiceOptionDef } from "@/core/settings/types";
import type { Package, PricingSettings, Prisma, ServiceOption } from "@/generated/prisma/client";

export const DEFAULT_PROFILE_NAME = "Grille standard";

const num = (value: Prisma.Decimal | number | null): number => Number(value ?? 0);

function optionPricing(row: ServiceOption): OptionPricing {
  switch (row.pricingType) {
    case "PER_SLICE":
      return { type: "PER_SLICE", amount: num(row.amount), sliceMinutes: row.sliceMinutes ?? 30 };
    case "PERCENT":
      return { type: "PERCENT", percent: num(row.percent) };
    case "FIXED":
      return { type: "FIXED", amount: num(row.amount) };
  }
}

/** Reconstitue les paramètres depuis les tables ; normalisés et validés ensuite par le service des paramètres. */
export function toAppSettings(row: PricingSettings, packages: Package[], options: ServiceOption[]): AppSettings {
  return {
    company: { name: row.companyName, baseCity: row.baseCity },
    pricing: {
      vatPercent: num(row.vatPercent),
      hourlyDriverCost: num(row.hourlyDriverCost),
      marginMode: row.marginMode,
      marginPercent: num(row.marginPercent),
      marginFixedAmount: num(row.marginFixedAmount),
      minimumMarginPercent: num(row.minimumMarginPercent),
      roundingMode: row.roundingMode,
      fixedFees: row.fixedFees as unknown as AppSettings["pricing"]["fixedFees"],
      variableFeePerKm: num(row.variableFeePerKm),
      quoteValidityDays: row.quoteValidityDays,
    },
    fuel: {
      petrolPrice: num(row.petrolPrice),
      dieselPrice: num(row.dieselPrice),
      electricityPrice: num(row.electricityPrice),
      consumption: row.consumption as unknown as AppSettings["fuel"]["consumption"],
    },
    times: {
      departureFormalitiesMin: row.departureFormalitiesMin,
      inspectionMin: row.inspectionMin,
      deliveryFormalitiesMin: row.deliveryFormalitiesMin,
    },
    transport: {
      companionCostPerKm: num(row.companionCostPerKm),
      personalVehicleCostPerKm: num(row.personalVehicleCostPerKm),
      vtcBaseFare: num(row.vtcBaseFare),
      vtcPerKm: num(row.vtcPerKm),
      taxiBaseFare: num(row.taxiBaseFare),
      taxiPerKm: num(row.taxiPerKm),
      defaultStrategy: row.defaultStrategy,
      weights: row.scoreWeights as unknown as AppSettings["transport"]["weights"],
    },
    packages: packages.map((pkg) => ({
      id: pkg.code as PackageTier["id"],
      name: pkg.name,
      minKm: pkg.minKm,
      maxKm: pkg.maxKm,
      basePrice: num(pkg.basePrice),
      pricePerKm: num(pkg.pricePerKm),
    })),
    options: options.map((option): ServiceOptionDef => ({
      id: option.code as ServiceOptionDef["id"],
      label: option.label,
      pricing: optionPricing(option),
      internalCost: num(option.internalCost),
    })),
  };
}

export function settingsToRows(settings: AppSettings) {
  const { company, pricing, fuel, times, transport } = settings;
  const json = (value: unknown) => value as Prisma.InputJsonValue;
  return {
    settings: {
      id: "default",
      companyName: company.name,
      baseCity: company.baseCity,
      vatPercent: pricing.vatPercent,
      hourlyDriverCost: pricing.hourlyDriverCost,
      marginMode: pricing.marginMode,
      marginPercent: pricing.marginPercent,
      marginFixedAmount: pricing.marginFixedAmount,
      minimumMarginPercent: pricing.minimumMarginPercent,
      roundingMode: pricing.roundingMode,
      fixedFees: json(pricing.fixedFees),
      variableFeePerKm: pricing.variableFeePerKm,
      quoteValidityDays: pricing.quoteValidityDays,
      petrolPrice: fuel.petrolPrice,
      dieselPrice: fuel.dieselPrice,
      electricityPrice: fuel.electricityPrice,
      consumption: json(fuel.consumption),
      departureFormalitiesMin: times.departureFormalitiesMin,
      inspectionMin: times.inspectionMin,
      deliveryFormalitiesMin: times.deliveryFormalitiesMin,
      companionCostPerKm: transport.companionCostPerKm,
      personalVehicleCostPerKm: transport.personalVehicleCostPerKm,
      vtcBaseFare: transport.vtcBaseFare,
      vtcPerKm: transport.vtcPerKm,
      taxiBaseFare: transport.taxiBaseFare,
      taxiPerKm: transport.taxiPerKm,
      defaultStrategy: transport.defaultStrategy,
      scoreWeights: json(transport.weights),
    } satisfies Prisma.PricingSettingsCreateInput,
    packages: settings.packages.map((pkg, index) => ({
      code: pkg.id,
      name: pkg.name,
      minKm: pkg.minKm,
      maxKm: pkg.maxKm,
      basePrice: pkg.basePrice,
      pricePerKm: pkg.pricePerKm,
      sortOrder: index,
    })),
    options: settings.options.map((option, index) => ({
      code: option.id,
      label: option.label,
      pricingType: option.pricing.type,
      amount: option.pricing.type === "PERCENT" ? null : option.pricing.amount,
      percent: option.pricing.type === "PERCENT" ? option.pricing.percent : null,
      sliceMinutes: option.pricing.type === "PER_SLICE" ? option.pricing.sliceMinutes : null,
      internalCost: option.internalCost,
      sortOrder: index,
    })),
  };
}
