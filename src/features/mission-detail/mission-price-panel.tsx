"use client";

import type { MissionPricing } from "@/core/pricing/mission-pricing";
import { CostBreakdown } from "@/components/pricing/cost-breakdown";
import { PriceCard } from "@/components/pricing/price-card";
import { ProfitabilityCard } from "@/components/pricing/profitability-card";
import { QuoteSummary } from "@/components/pricing/quote-summary";
import { Card } from "@/components/ui/card";
import { useViewMode } from "@/hooks/use-view-mode";
import { ViewModeToggle } from "../new-mission/result-view";

/** Prix de la mission : mode interne (coût, marge, rentabilité) ou client (HT, TVA, TTC). */
export function MissionPricePanel({ pricing, returnLabel }: { pricing: MissionPricing; returnLabel: string }) {
  const [mode, setMode] = useViewMode();
  const internal = mode === "internal";
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewModeToggle mode={mode} onChange={setMode} />
      </div>
      <PriceCard pricing={pricing} mode={mode} label="Prix de la mission" />
      {internal ? (
        <>
          <ProfitabilityCard pricing={pricing} />
          <Card className="p-5">
            <CostBreakdown pricing={pricing} returnLabel={returnLabel} />
          </Card>
        </>
      ) : null}
      <QuoteSummary pricing={pricing} />
    </div>
  );
}
