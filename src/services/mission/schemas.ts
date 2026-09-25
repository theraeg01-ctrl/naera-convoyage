import { z } from "zod";
import { CUSTOMER_TYPES } from "@/core/mission/types";
import { simulationResultSchema, simulationSelectionsSchema } from "@/core/simulation/schema";

/** Texte optionnel : les chaînes vides deviennent undefined. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .optional()
    .transform((value) => (value ? value : undefined));

export const customerInputSchema = z
  .object({
    type: z.enum(CUSTOMER_TYPES),
    firstName: optionalText(60),
    lastName: optionalText(60),
    companyName: optionalText(100),
    phone: optionalText(30),
    email: z
      .union([z.literal(""), z.email("Adresse e-mail invalide")])
      .optional()
      .transform((value) => (value ? value : undefined)),
    address: optionalText(200),
  })
  .nullable();

export const vehicleDetailsSchema = z.object({
  make: optionalText(40),
  model: optionalText(60),
  plate: optionalText(15),
});

export const saveMissionInputSchema = z.object({
  simulation: simulationResultSchema,
  selections: simulationSelectionsSchema,
  customer: customerInputSchema,
  vehicle: vehicleDetailsSchema,
  /** Consignes visibles du convoyeur. */
  notes: optionalText(1000),
  /** Note interne Naera, jamais exposée hors back-office. */
  internalNotes: optionalText(1000),
});

export type SaveMissionInput = z.input<typeof saveMissionInputSchema>;
export type CustomerInput = z.input<typeof customerInputSchema>;
