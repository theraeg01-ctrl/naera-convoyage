import type { AppSettings } from "./types";

/**
 * Valeurs initiales. Elles ne sont utilisées qu'à la création des paramètres :
 * ensuite, tous les calculs lisent les paramètres sauvegardés (source unique).
 */
export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: "Naera Automobile",
    baseCity: "Paris",
  },
  pricing: {
    vatPercent: 20,
    hourlyDriverCost: 18,
    marginMode: "PERCENT",
    marginPercent: 30,
    marginFixedAmount: 80,
    minimumMarginPercent: 10,
    roundingMode: "PSYCHOLOGICAL",
    fixedFees: [
      { id: "insurance", label: "Assurance mission", amount: 6 },
      { id: "admin", label: "Administratif", amount: 3 },
      { id: "platform", label: "Plateforme & outils", amount: 2 },
      { id: "phone", label: "Téléphone", amount: 1 },
      { id: "file", label: "Gestion de dossier", amount: 3 },
    ],
    variableFeePerKm: 0.05,
    quoteValidityDays: 30,
  },
  fuel: {
    petrolPrice: 1.85,
    dieselPrice: 1.75,
    electricityPrice: 0.45,
    consumption: {
      PETROL: 6.5,
      DIESEL: 6.5,
      HYBRID: 5,
      ELECTRIC: 18,
    },
  },
  times: {
    departureFormalitiesMin: 15,
    inspectionMin: 15,
    deliveryFormalitiesMin: 15,
  },
  transport: {
    companionCostPerKm: 0.4,
    personalVehicleCostPerKm: 0.35,
    vtcBaseFare: 2.5,
    vtcPerKm: 0.85,
    taxiBaseFare: 4.2,
    taxiPerKm: 1.3,
    defaultStrategy: "BALANCED",
    weights: {
      CHEAPEST: { price: 1, duration: 0, connections: 0, simplicity: 0 },
      FASTEST: { price: 0, duration: 1, connections: 0, simplicity: 0 },
      BALANCED: { price: 0.45, duration: 0.35, connections: 0.1, simplicity: 0.1 },
    },
  },
  packages: [
    { id: "CITY", name: "City", minKm: 0, maxKm: 50, basePrice: 89, pricePerKm: 0 },
    { id: "LOCAL_PLUS", name: "Local+", minKm: 51, maxKm: 150, basePrice: 149, pricePerKm: 0 },
    { id: "REGIONAL", name: "Regional", minKm: 151, maxKm: 300, basePrice: 249, pricePerKm: 0 },
    { id: "FRANCE", name: "France", minKm: 301, maxKm: 500, basePrice: 349, pricePerKm: 0 },
    { id: "FRANCE_PLUS", name: "France+", minKm: 501, maxKm: 800, basePrice: 499, pricePerKm: 0 },
    {
      id: "LONG_DISTANCE",
      name: "Long Distance",
      minKm: 801,
      maxKm: null,
      basePrice: 49,
      pricePerKm: 0.65,
    },
  ],
  options: [
    {
      id: "PHOTO_INSPECTION",
      label: "État des lieux photo",
      pricing: { type: "FIXED", amount: 25 },
      internalCost: 0,
    },
    {
      id: "PHOTO_REPORT",
      label: "Rapport photo complet",
      pricing: { type: "FIXED", amount: 20 },
      internalCost: 0,
    },
    {
      id: "REINFORCED_CHECK",
      label: "Contrôle renforcé",
      pricing: { type: "FIXED", amount: 35 },
      internalCost: 0,
    },
    {
      id: "KEY_HANDOVER",
      label: "Remise des clés",
      pricing: { type: "FIXED", amount: 15 },
      internalCost: 0,
    },
    {
      id: "PRIORITY",
      label: "Livraison prioritaire",
      pricing: { type: "FIXED", amount: 25 },
      internalCost: 0,
    },
    {
      id: "GUARANTEED_SLOT",
      label: "Créneau garanti",
      pricing: { type: "FIXED", amount: 30 },
      internalCost: 0,
    },
    {
      id: "WAITING",
      label: "Attente client",
      pricing: { type: "PER_SLICE", amount: 15, sliceMinutes: 30 },
      internalCost: 0,
    },
    {
      id: "WEEKEND",
      label: "Majoration week-end",
      pricing: { type: "PERCENT", percent: 20 },
      internalCost: 0,
    },
    {
      id: "HOLIDAY",
      label: "Majoration jour férié",
      pricing: { type: "PERCENT", percent: 30 },
      internalCost: 0,
    },
  ],
};
