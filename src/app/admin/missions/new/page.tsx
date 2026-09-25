import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SELECTABLE_OPTION_IDS } from "@/core/settings/types";
import { addDays } from "@/core/shared/calendar";
import { formatEuro, formatPercent } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import type { NewMissionConfig } from "@/features/new-mission/config";
import { NewMissionFlow } from "@/features/new-mission/new-mission-flow";
import { DEMO_SCENARIOS } from "@/services/demo/scenarios";
import { requirePermission, requirePortal } from "@/services/auth/guards";
import { getSettings } from "@/services/settings/settings-service";

export const metadata: Metadata = { title: "Nouvelle mission" };

export default async function NewMissionPage() {
  await connection();
  const actor = await requirePortal("admin");
  requirePermission(actor, "missions.manage");
  const settings = await getSettings();
  const optionById = new Map(settings.options.map((option) => [option.id, option]));
  const waiting = optionById.get("WAITING")?.pricing;

  const config: NewMissionConfig = {
    defaultDate: addDays(todayInZone(), 1),
    defaultTime: "09:00",
    defaultStrategy: settings.transport.defaultStrategy,
    consumption: settings.fuel.consumption,
    marginSummary:
      settings.pricing.marginMode === "PERCENT"
        ? `${formatPercent(settings.pricing.marginPercent)} sur vente`
        : formatEuro(settings.pricing.marginFixedAmount),
    baseCity: settings.company.baseCity,
    options: SELECTABLE_OPTION_IDS.flatMap((id) => {
      const option = optionById.get(id);
      if (!option || option.pricing.type !== "FIXED") return [];
      return [{ id, label: option.label, priceLabel: `+${formatEuro(option.pricing.amount)}` }];
    }),
    waitingPriceLabel:
      waiting?.type === "PER_SLICE"
        ? `${formatEuro(waiting.amount)} / ${waiting.sliceMinutes} min`
        : "selon paramètres",
    demoScenarios: DEMO_SCENARIOS.map((scenario) => ({
      id: scenario.id,
      label: scenario.label,
      from: scenario.from,
      to: scenario.to,
    })),
  };

  return (
    <Suspense>
      <NewMissionFlow config={config} />
    </Suspense>
  );
}
