import { describePackageRange } from "@/core/pricing/packages";
import { ROUNDING_LABELS } from "@/core/pricing/rounding";
import { FUEL_TYPE_LABELS } from "@/core/mission/types";
import { FUEL_TYPES, OPTIMIZATION_STRATEGIES, ROUNDING_MODES, type AppSettings } from "@/core/settings/types";
import { STRATEGY_LABELS } from "@/core/transport/score";

/**
 * Description des champs éditables des paramètres. Elle sert à la fois à
 * l'affichage (formulaire) et de liste blanche côté serveur (Server Action).
 */
export type SettingsField =
  | {
      kind: "number";
      path: string;
      label: string;
      unit?: string;
      hint?: string;
      step?: number;
      /** Facteur d'affichage : 100 pour éditer 0,45 sous la forme 45 %. */
      scale?: number;
    }
  | { kind: "select"; path: string; label: string; options: { value: string; label: string }[] }
  | { kind: "text"; path: string; label: string; hint?: string };

export interface SettingsSection {
  id: string;
  title: string;
  description: string;
  fields: SettingsField[];
}

export function buildSettingsSections(settings: AppSettings): SettingsSection[] {
  return [
    {
      id: "pricing",
      title: "Tarification",
      description: "Coût horaire, marge sur prix de vente, TVA et arrondi commercial",
      fields: [
        { kind: "number", path: "pricing.hourlyDriverCost", label: "Coût convoyeur", unit: "€/h", step: 0.5 },
        {
          kind: "select",
          path: "pricing.marginMode",
          label: "Méthode de marge",
          options: [
            { value: "PERCENT", label: "Taux de marge sur prix de vente" },
            { value: "FIXED", label: "Marge brute fixe (€)" },
          ],
        },
        {
          kind: "number",
          path: "pricing.marginPercent",
          label: "Marge cible",
          unit: "%",
          hint: "Taux de marge sur prix de vente HT : prix = coût interne ÷ (1 − taux). 30 % n'est pas +30 % sur le coût.",
          step: 1,
        },
        { kind: "number", path: "pricing.marginFixedAmount", label: "Marge brute fixe", unit: "€", step: 1 },
        {
          kind: "number",
          path: "pricing.minimumMarginPercent",
          label: "Marge minimum",
          unit: "%",
          hint: "Taux de marge sur prix de vente sous lequel une mission n'est pas rentable (prix minimum rentable)",
          step: 1,
        },
        { kind: "number", path: "pricing.vatPercent", label: "TVA", unit: "%", step: 0.1 },
        {
          kind: "select",
          path: "pricing.roundingMode",
          label: "Arrondi commercial",
          options: ROUNDING_MODES.map((mode) => ({ value: mode, label: ROUNDING_LABELS[mode] })),
        },
        { kind: "number", path: "pricing.quoteValidityDays", label: "Validité des devis", unit: "jours", step: 1 },
      ],
    },
    {
      id: "fees",
      title: "Frais",
      description: "Frais fixes par mission et frais kilométriques",
      fields: [
        ...settings.pricing.fixedFees.map((fee, index): SettingsField => ({
          kind: "number",
          path: `pricing.fixedFees.${index}.amount`,
          label: fee.label,
          unit: "€",
          step: 0.5,
        })),
        { kind: "number", path: "pricing.variableFeePerKm", label: "Frais variables", unit: "€/km", step: 0.01 },
      ],
    },
    {
      id: "fuel",
      title: "Carburant & véhicules",
      description: "Prix des énergies et consommations par défaut",
      fields: [
        { kind: "number", path: "fuel.petrolPrice", label: "Prix essence", unit: "€/L", step: 0.01 },
        { kind: "number", path: "fuel.dieselPrice", label: "Prix diesel", unit: "€/L", step: 0.01 },
        { kind: "number", path: "fuel.electricityPrice", label: "Prix recharge électrique", unit: "€/kWh", step: 0.01 },
        ...FUEL_TYPES.map((fuel): SettingsField => ({
          kind: "number",
          path: `fuel.consumption.${fuel}`,
          label: `Consommation ${FUEL_TYPE_LABELS[fuel].toLowerCase()}`,
          unit: fuel === "ELECTRIC" ? "kWh/100" : "L/100",
          step: 0.1,
        })),
      ],
    },
    {
      id: "transport",
      title: "Transport convoyeur",
      description: "Base, accompagnateur, VTC, taxi et classement des solutions",
      fields: [
        {
          kind: "text",
          path: "company.baseCity",
          label: "Ville de base du convoyeur",
          hint: "Départ de l'aller, arrivée du retour",
        },
        { kind: "number", path: "transport.companionCostPerKm", label: "Accompagnateur", unit: "€/km", step: 0.01 },
        {
          kind: "number",
          path: "transport.personalVehicleCostPerKm",
          label: "Véhicule personnel",
          unit: "€/km",
          step: 0.01,
        },
        { kind: "number", path: "transport.vtcBaseFare", label: "VTC — prise en charge", unit: "€", step: 0.5 },
        { kind: "number", path: "transport.vtcPerKm", label: "VTC — prix au km", unit: "€/km", step: 0.01 },
        { kind: "number", path: "transport.taxiBaseFare", label: "Taxi — prise en charge", unit: "€", step: 0.1 },
        { kind: "number", path: "transport.taxiPerKm", label: "Taxi — prix au km", unit: "€/km", step: 0.01 },
        {
          kind: "select",
          path: "transport.defaultStrategy",
          label: "Priorité par défaut",
          options: OPTIMIZATION_STRATEGIES.map((strategy) => ({ value: strategy, label: STRATEGY_LABELS[strategy] })),
        },
        {
          kind: "number",
          path: "transport.weights.BALANCED.price",
          label: "Compromis — poids du prix",
          unit: "%",
          step: 5,
          scale: 100,
        },
        {
          kind: "number",
          path: "transport.weights.BALANCED.duration",
          label: "Compromis — poids de la durée",
          unit: "%",
          step: 5,
          scale: 100,
        },
        {
          kind: "number",
          path: "transport.weights.BALANCED.connections",
          label: "Compromis — poids des correspondances",
          unit: "%",
          step: 5,
          scale: 100,
        },
        {
          kind: "number",
          path: "transport.weights.BALANCED.simplicity",
          label: "Compromis — poids de la simplicité",
          unit: "%",
          step: 5,
          scale: 100,
        },
      ],
    },
    {
      id: "times",
      title: "Temps",
      description: "Formalités et inspection comptées dans le temps convoyeur",
      fields: [
        { kind: "number", path: "times.departureFormalitiesMin", label: "Formalités de départ", unit: "min", step: 5 },
        { kind: "number", path: "times.inspectionMin", label: "Inspection du véhicule", unit: "min", step: 5 },
        {
          kind: "number",
          path: "times.deliveryFormalitiesMin",
          label: "Formalités de livraison",
          unit: "min",
          step: 5,
        },
      ],
    },
    {
      id: "packages",
      title: "Packages",
      description: "Grille commerciale — toujours comparée au coût interne",
      fields: settings.packages.flatMap((pkg, index): SettingsField[] => {
        const base: SettingsField = {
          kind: "number",
          path: `packages.${index}.basePrice`,
          label: `${pkg.name}`,
          hint: describePackageRange(pkg),
          unit: "€ HT",
          step: 1,
        };
        if (pkg.maxKm !== null) return [base];
        return [
          { ...base, label: `${pkg.name} — base` },
          {
            kind: "number",
            path: `packages.${index}.pricePerKm`,
            label: `${pkg.name} — prix au km`,
            unit: "€/km",
            step: 0.01,
          },
        ];
      }),
    },
    {
      id: "options",
      title: "Options",
      description: "Options client et majorations automatiques",
      fields: settings.options.map((option, index): SettingsField => {
        switch (option.pricing.type) {
          case "PERCENT":
            return {
              kind: "number",
              path: `options.${index}.pricing.percent`,
              label: option.label,
              unit: "%",
              step: 1,
            };
          case "PER_SLICE":
            return {
              kind: "number",
              path: `options.${index}.pricing.amount`,
              label: option.label,
              unit: `€ / ${option.pricing.sliceMinutes} min`,
              step: 1,
            };
          case "FIXED":
            return { kind: "number", path: `options.${index}.pricing.amount`, label: option.label, unit: "€", step: 1 };
        }
      }),
    },
  ];
}
