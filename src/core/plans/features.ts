/**
 * Plans professionnels et fonctionnalités activables.
 * Les composants ne testent jamais un plan : ils demandent une fonctionnalité
 * via hasFeature(). Aucun prix d'abonnement n'est défini ici.
 */

export const FEATURE_KEYS = [
  "analytics_basic",
  "analytics_advanced",
  "csv_export",
  "pdf_reporting",
  "team_management",
  "cost_centers",
  "multi_agency",
  "api_access",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  analytics_basic: "Analytics essentiels",
  analytics_advanced: "Analytics avancés",
  csv_export: "Export CSV",
  pdf_reporting: "Rapports PDF",
  team_management: "Gestion d'équipe",
  cost_centers: "Centres d'imputation",
  multi_agency: "Multi-agences",
  api_access: "Accès API",
};

export const PLAN_CODES = ["PRO_ESSENTIAL", "PRO_PLUS", "PRO_ANALYTICS", "ENTERPRISE"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const PLAN_LABELS: Record<PlanCode, string> = {
  PRO_ESSENTIAL: "Pro Essentiel",
  PRO_PLUS: "Pro Plus",
  PRO_ANALYTICS: "Pro Analytics",
  ENTERPRISE: "Entreprise",
};

/**
 * Catalogue initial (données d'amorçage de Plan / PlanFeature). À l'exécution,
 * les droits viennent de l'abonnement enregistré, pas de cette constante.
 */
export const DEFAULT_PLAN_FEATURES: Record<PlanCode, readonly FeatureKey[]> = {
  PRO_ESSENTIAL: [],
  PRO_PLUS: ["analytics_basic", "csv_export", "team_management"],
  PRO_ANALYTICS: [
    "analytics_basic",
    "analytics_advanced",
    "csv_export",
    "pdf_reporting",
    "team_management",
    "cost_centers",
  ],
  ENTERPRISE: FEATURE_KEYS,
};

export const SUBSCRIPTION_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Essai",
  ACTIVE: "Actif",
  PAST_DUE: "Paiement en attente",
  CANCELED: "Résilié",
};

/** Droits effectifs d'un compte professionnel. */
export interface Entitlements {
  planCode: PlanCode | null;
  status: SubscriptionStatus | null;
  features: FeatureKey[];
}

export interface FeatureOverride {
  feature: FeatureKey;
  enabled: boolean;
}

const LIVE_STATUSES: readonly SubscriptionStatus[] = ["TRIALING", "ACTIVE", "PAST_DUE"];

/** Calcule les droits : fonctionnalités du plan ± dérogations propres au compte. */
export function resolveEntitlements(input: {
  planCode: PlanCode | null;
  status: SubscriptionStatus | null;
  planFeatures: readonly string[];
  overrides?: readonly FeatureOverride[];
}): Entitlements {
  const active = input.status !== null && LIVE_STATUSES.includes(input.status);
  const features = new Set<FeatureKey>(
    active
      ? input.planFeatures.filter((key): key is FeatureKey => (FEATURE_KEYS as readonly string[]).includes(key))
      : [],
  );
  for (const override of input.overrides ?? []) {
    if (override.enabled) features.add(override.feature);
    else features.delete(override.feature);
  }
  return {
    planCode: input.planCode,
    status: input.status,
    features: FEATURE_KEYS.filter((key) => features.has(key)),
  };
}

export const NO_ENTITLEMENTS: Entitlements = { planCode: null, status: null, features: [] };

/** Point unique de décision « ce compte a-t-il accès à cette fonctionnalité ? ». */
export function hasFeature(account: { entitlements: Entitlements } | null | undefined, feature: FeatureKey): boolean {
  return account?.entitlements.features.includes(feature) ?? false;
}

/** Plan le plus accessible incluant une fonctionnalité (message « disponible avec… »). */
export function lowestPlanWith(feature: FeatureKey): PlanCode | null {
  return PLAN_CODES.find((plan) => DEFAULT_PLAN_FEATURES[plan].includes(feature)) ?? null;
}
