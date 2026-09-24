import type { MissionPricing } from "../pricing/mission-pricing";
import type { RouteOption } from "../routing/types";
import type { AppSettings } from "../settings/types";
import { timeToMinutes } from "../shared/calendar";
import { formatEuro, formatMinutes, formatPercent } from "../shared/format";
import { roundMoney } from "../shared/money";
import type { RankedTransportOption } from "../transport/score";
import { TRANSPORT_MODE_LABELS, type TransportOption } from "../transport/types";

export type InsightTone = "saving" | "warning" | "info";

export interface MissionInsight {
  id: string;
  tone: InsightTone;
  title: string;
  detail?: string;
  /** Impact estimé en euros, utilisé pour prioriser. */
  impactEur: number;
}

export interface InsightContext {
  routes: readonly RouteOption[];
  route: RouteOption;
  returnLeg: { ranked: readonly RankedTransportOption[]; selected: TransportOption | null };
  pricing: MissionPricing;
  time: string;
  settings: AppSettings;
}

export const MAX_INSIGHTS = 3;

function modeName(option: TransportOption): string {
  return TRANSPORT_MODE_LABELS[option.mode].toLowerCase();
}

function vtcComparison({ returnLeg }: InsightContext): MissionInsight | null {
  const selected = returnLeg.selected;
  const vtc = returnLeg.ranked.find((entry) => entry.option.mode === "VTC")?.option;
  if (!selected || !vtc || selected.mode === "VTC") return null;
  const saving = roundMoney(vtc.price - selected.price);
  if (saving < 10) return null;
  return {
    id: "return-vs-vtc",
    tone: "saving",
    title: `Le ${modeName(selected)} économise ${formatEuro(Math.round(saving))} par rapport au VTC.`,
    impactEur: saving,
  };
}

function cheaperReturn({ returnLeg, settings }: InsightContext): MissionInsight | null {
  const selected = returnLeg.selected;
  if (!selected) return null;
  const cheapest = [...returnLeg.ranked].sort((a, b) => a.option.price - b.option.price)[0]?.option;
  if (!cheapest || cheapest.id === selected.id) return null;
  const extraMin = Math.max(0, cheapest.durationMin - selected.durationMin);
  const net = roundMoney(selected.price - cheapest.price - (extraMin / 60) * settings.pricing.hourlyDriverCost);
  if (net < 10) return null;
  return {
    id: "cheaper-return",
    tone: "saving",
    title: `Retour en ${modeName(cheapest)} : ${formatEuro(Math.round(net))} d'économie nette.`,
    detail: extraMin > 0 ? `Trajet plus long de ${formatMinutes(extraMin)}, temps convoyeur inclus.` : undefined,
    impactEur: net,
  };
}

function returnShare({ returnLeg, pricing }: InsightContext): MissionInsight | null {
  const selected = returnLeg.selected;
  if (!selected || pricing.costs.total === 0) return null;
  const share = (selected.price / pricing.costs.total) * 100;
  if (share < 20) return null;
  return {
    id: "return-share",
    tone: "info",
    title: `Le retour représente ${formatPercent(share)} du coût de la mission.`,
    impactEur: selected.price * 0.1,
  };
}

function packageCheck({ pricing }: InsightContext): MissionInsight | null {
  const { profitability } = pricing;
  if (profitability.status === "PROFITABLE") return null;
  const insufficient = profitability.status === "INSUFFICIENT";
  return {
    id: "package-check",
    tone: "warning",
    title: `Le forfait ${pricing.package.name} (${formatEuro(pricing.package.price)} HT) est ${
      insufficient ? "insuffisant" : "sous la marge cible"
    }.`,
    detail: `Prix conseillé : ${formatEuro(pricing.basePrice)} HT pour la prestation.`,
    impactEur: roundMoney(pricing.basePrice - pricing.package.price),
  };
}

function trafficCheck({ route, time, settings }: InsightContext): MissionInsight | null {
  const delay = route.trafficDurationMin - route.durationMin;
  if (delay < 15) return null;
  const departure = timeToMinutes(time);
  const suggestion = departure >= 7 * 60 && departure < 10 * 60 ? " (avant 7 h)" : "";
  return {
    id: "traffic",
    tone: "info",
    title: `Un départ plus tôt${suggestion} pourrait réduire le trafic.`,
    detail: `${formatMinutes(delay)} de ralentissements prévus à ${time.replace(":", " h ")}.`,
    impactEur: roundMoney((delay / 60) * settings.pricing.hourlyDriverCost),
  };
}

function noTollRoute({ routes, route, pricing, settings }: InsightContext): MissionInsight | null {
  const noToll = routes.find((candidate) => candidate.kind === "NO_TOLL");
  if (!noToll || route.kind === "NO_TOLL" || route.tollsEur === 0) return null;
  const extraMin = Math.max(0, noToll.trafficDurationMin - route.trafficDurationMin);
  const extraKm = Math.max(0, noToll.distanceKm - route.distanceKm);
  const perKm = (pricing.fuel.consumptionPer100 * pricing.fuel.unitPrice) / 100 + settings.pricing.variableFeePerKm;
  const net = roundMoney(
    route.tollsEur - noToll.tollsEur - (extraMin / 60) * settings.pricing.hourlyDriverCost - extraKm * perKm,
  );
  if (net < 5) return null;
  return {
    id: "no-toll",
    tone: "saving",
    title: `La route sans péage économiserait ${formatEuro(Math.round(net))}.`,
    detail: `Trajet plus long de ${formatMinutes(extraMin)}, temps convoyeur inclus.`,
    impactEur: net,
  };
}

const RULES = [packageCheck, vtcComparison, cheaperReturn, noTollRoute, returnShare, trafficCheck];

const TONE_PRIORITY: Record<InsightTone, number> = { warning: 0, saving: 1, info: 2 };

/** Recommandations par règles métier : 3 maximum, alertes d'abord puis par impact. */
export function buildMissionInsights(context: InsightContext): MissionInsight[] {
  return RULES.map((rule) => rule(context))
    .filter((insight): insight is MissionInsight => insight !== null)
    .sort((a, b) => TONE_PRIORITY[a.tone] - TONE_PRIORITY[b.tone] || b.impactEur - a.impactEur)
    .slice(0, MAX_INSIGHTS);
}
