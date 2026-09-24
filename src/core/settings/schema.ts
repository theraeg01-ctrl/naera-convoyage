import { z } from "zod";
import {
  FUEL_TYPES,
  MARGIN_MODES,
  OPTIMIZATION_STRATEGIES,
  PACKAGE_IDS,
  ROUNDING_MODES,
  SERVICE_OPTION_IDS,
  type AppSettings,
} from "./types";

/** Montant en euros : fini, positif ou nul, borné pour éviter les saisies aberrantes. */
export const moneySchema = z.number().nonnegative().max(1_000_000);
const percentSchema = z.number().min(0).max(1000);
const minutesSchema = z
  .number()
  .int()
  .min(0)
  .max(24 * 60);

const weightsSchema = z.object({
  price: z.number().min(0).max(1),
  duration: z.number().min(0).max(1),
  connections: z.number().min(0).max(1),
  simplicity: z.number().min(0).max(1),
});

const optionPricingSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("FIXED"), amount: moneySchema }),
  z.object({
    type: z.literal("PER_SLICE"),
    amount: moneySchema,
    sliceMinutes: z.number().int().min(5).max(240),
  }),
  z.object({ type: z.literal("PERCENT"), percent: percentSchema }),
]);

const packageSchema = z.object({
  id: z.enum(PACKAGE_IDS),
  name: z.string().trim().min(1).max(40),
  minKm: z.number().int().min(0),
  maxKm: z.number().int().positive().nullable(),
  basePrice: moneySchema,
  pricePerKm: z.number().min(0).max(100),
});

export const appSettingsSchema = z
  .object({
    company: z.object({
      name: z.string().trim().min(1).max(80),
      baseCity: z.string().trim().min(2).max(80),
    }),
    pricing: z.object({
      vatPercent: z.number().min(0).max(100),
      hourlyDriverCost: moneySchema,
      marginMode: z.enum(MARGIN_MODES),
      marginPercent: percentSchema,
      marginFixedAmount: moneySchema,
      minimumMarginPercent: percentSchema,
      roundingMode: z.enum(ROUNDING_MODES),
      fixedFees: z
        .array(z.object({ id: z.string().min(1), label: z.string().trim().min(1).max(60), amount: moneySchema }))
        .max(20),
      variableFeePerKm: z.number().min(0).max(100),
      quoteValidityDays: z.number().int().min(1).max(365),
    }),
    fuel: z.object({
      petrolPrice: z.number().min(0).max(20),
      dieselPrice: z.number().min(0).max(20),
      electricityPrice: z.number().min(0).max(20),
      consumption: z.record(z.enum(FUEL_TYPES), z.number().positive().max(100)),
    }),
    times: z.object({
      departureFormalitiesMin: minutesSchema,
      inspectionMin: minutesSchema,
      deliveryFormalitiesMin: minutesSchema,
    }),
    transport: z.object({
      companionCostPerKm: z.number().min(0).max(100),
      personalVehicleCostPerKm: z.number().min(0).max(100),
      vtcBaseFare: moneySchema,
      vtcPerKm: z.number().min(0).max(100),
      taxiBaseFare: moneySchema,
      taxiPerKm: z.number().min(0).max(100),
      defaultStrategy: z.enum(OPTIMIZATION_STRATEGIES),
      weights: z.record(z.enum(OPTIMIZATION_STRATEGIES), weightsSchema),
    }),
    packages: z.array(packageSchema).length(PACKAGE_IDS.length),
    options: z
      .array(
        z.object({
          id: z.enum(SERVICE_OPTION_IDS),
          label: z.string().trim().min(1).max(60),
          pricing: optionPricingSchema,
          internalCost: moneySchema,
        }),
      )
      .length(SERVICE_OPTION_IDS.length),
  })
  .superRefine((settings, ctx) => {
    const packages = settings.packages;
    packages.forEach((tier, index) => {
      const isLast = index === packages.length - 1;
      if (isLast !== (tier.maxKm === null)) {
        ctx.addIssue({
          code: "custom",
          path: ["packages", index, "maxKm"],
          message: "Seul le dernier package peut être sans limite de distance",
        });
      }
      if (tier.maxKm !== null && tier.maxKm < tier.minKm) {
        ctx.addIssue({
          code: "custom",
          path: ["packages", index, "maxKm"],
          message: "La distance maximale doit être supérieure à la distance minimale",
        });
      }
      const previous = packages[index - 1];
      if (previous && previous.maxKm !== null && tier.minKm !== previous.maxKm + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["packages", index, "minKm"],
          message: "Les tranches de distance doivent se suivre sans trou",
        });
      }
    });
    const ids = new Set(settings.options.map((option) => option.id));
    if (ids.size !== settings.options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Options en double" });
    }
  });

export function parseAppSettings(input: unknown): AppSettings {
  return appSettingsSchema.parse(input) as AppSettings;
}
