"use client";

import { Eye, Pencil, Sparkles, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { AppSettings } from "@/core/settings/types";
import type { ResolvedSimulation } from "@/core/simulation/resolve";
import type { SimulationResult, SimulationSelections } from "@/core/simulation/types";
import { formatEuro, formatMinutes } from "@/core/shared/format";
import { TRANSPORT_MODE_LABELS } from "@/core/transport/types";
import { DemoBanner } from "@/components/layout/demo-banner";
import { RouteSummary } from "@/components/mission/route-summary";
import { CostBreakdown } from "@/components/pricing/cost-breakdown";
import { DurationBreakdown } from "@/components/pricing/duration-breakdown";
import { InsightsList } from "@/components/pricing/insights-list";
import { PriceCard } from "@/components/pricing/price-card";
import { ProfitabilityCard } from "@/components/pricing/profitability-card";
import { QuoteSummary } from "@/components/pricing/quote-summary";
import { TransportIcon } from "@/components/transport/transport-icon";
import { ActionBar } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { Segmented } from "@/components/ui/choice";
import { Disclosure } from "@/components/ui/disclosure";
import type { ViewMode } from "@/hooks/use-view-mode";
import { RouteVariants } from "./route-variants";
import { AccessSection, ReturnSection } from "./transport-section";

interface ResultViewProps {
  simulation: SimulationResult;
  settings: AppSettings;
  selections: SimulationSelections;
  resolved: ResolvedSimulation;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onSelectionsChange: (patch: Partial<SimulationSelections>) => void;
  onEdit: () => void;
  onAdjust: () => void;
  onSave: () => void;
}

export function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <Segmented
      name="view-mode"
      legend="Mode d'affichage"
      hideLegend
      size="sm"
      value={mode}
      onChange={onChange}
      className="w-48"
      options={[
        { value: "internal", label: "Interne" },
        { value: "client", label: "Client", icon: <Eye className="size-3.5" /> },
      ]}
    />
  );
}

/** Étape 2 : résultat et prix. Le prix HT domine ; les détails suivent par ordre d'importance. */
export function ResultView({
  simulation,
  settings,
  selections,
  resolved,
  mode,
  onModeChange,
  onSelectionsChange,
  onEdit,
  onAdjust,
  onSave,
}: ResultViewProps) {
  const [showInsights, setShowInsights] = useState(false);
  const internal = mode === "internal";
  const { pricing, route } = resolved;
  const warnings = simulation.notices.filter((notice) => notice.level === "warning");
  const hasOverrides = Object.keys(selections.overrides).length > 0;
  const returnLabel = resolved.return.selected
    ? `Transport (${TRANSPORT_MODE_LABELS[resolved.return.selected.mode].toLowerCase()})`
    : "Transport";

  return (
    <div className="animate-rise space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onEdit} className="-ml-2">
          <Pencil aria-hidden />
          Modifier
        </Button>
        <ViewModeToggle mode={mode} onChange={onModeChange} />
      </div>

      {internal && simulation.dataMode !== "LIVE" ? (
        <DemoBanner>
          {simulation.dataMode === "DEMO"
            ? simulation.demoScenario
              ? `Scénario ${simulation.demoScenario} : itinéraire, trafic, péages et transports simulés.`
              : undefined
            : "Certaines données sont simulées : repère les badges sur chaque valeur."}
        </DemoBanner>
      ) : null}

      {internal && warnings.length > 0 ? (
        <div role="alert" className="flex gap-2.5 rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            {warnings.map((notice) => (
              <p key={notice.message}>{notice.message}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <RouteSummary pickup={simulation.pickup} dropoff={simulation.dropoff} route={route} showSource={internal} />
        {internal ? (
          <RouteVariants
            routes={simulation.routes}
            value={selections.routeKind}
            onChange={(routeKind) => onSelectionsChange({ routeKind })}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start lg:gap-8">
        <div className="order-first space-y-4 lg:sticky lg:top-8 lg:order-2">
          <PriceCard pricing={pricing} mode={mode} />
          {internal ? <ProfitabilityCard pricing={pricing} /> : null}
          {!internal ? (
            <>
              <QuoteSummary pricing={pricing} />
              <p className="px-1 text-sm text-faint">Mode client : coûts internes, marge et logistique masqués.</p>
            </>
          ) : null}
        </div>

        {internal ? (
          <div className="space-y-8 lg:order-1">
            <Section
              title="Retour convoyeur"
              description={`Depuis ${simulation.dropoff.city ?? "le lieu de livraison"} vers ${simulation.base.city ?? "la base"}`}
            >
              <ReturnSection
                leg={resolved.return}
                strategy={selections.strategy}
                onStrategyChange={(strategy) =>
                  onSelectionsChange({ strategy, returnOptionId: null, accessOptionId: null })
                }
                onSelect={(returnOptionId) => onSelectionsChange({ returnOptionId })}
              />
            </Section>

            {resolved.access.selected ? (
              <Section title="Rejoindre le véhicule">
                <Disclosure
                  icon={<TransportIcon mode={resolved.access.selected.mode} />}
                  summary={`${TRANSPORT_MODE_LABELS[resolved.access.selected.mode]} · ${formatEuro(resolved.access.selected.price)}`}
                  hint={`${formatMinutes(resolved.access.selected.durationMin)} · ${resolved.access.selected.detail}`}
                >
                  <AccessSection
                    leg={resolved.access}
                    onSelect={(accessOptionId) => onSelectionsChange({ accessOptionId })}
                  />
                </Disclosure>
              </Section>
            ) : null}

            <Section title="Optimisation">
              {showInsights ? (
                <InsightsList insights={resolved.insights} />
              ) : (
                <Button variant="secondary" size="lg" block onClick={() => setShowInsights(true)}>
                  <Sparkles aria-hidden />
                  Optimiser la mission
                </Button>
              )}
            </Section>

            <Section title="Répartition du prix HT">
              <Card className="p-5">
                <CostBreakdown pricing={pricing} returnLabel={returnLabel} />
              </Card>
            </Section>

            <Section title="Temps de mission">
              <DurationBreakdown pricing={pricing} hourlyRate={settings.pricing.hourlyDriverCost} />
            </Section>

            <Section title="Détail du prix">
              <QuoteSummary pricing={pricing} />
            </Section>

            <Button
              variant="ghost"
              onClick={onAdjust}
              className="h-auto min-h-12 w-full justify-start py-3 text-left whitespace-normal text-muted"
            >
              <SlidersHorizontal aria-hidden />
              {hasOverrides
                ? "Corrections manuelles appliquées — modifier"
                : "Corriger manuellement distance, durée, péages ou retour"}
            </Button>
          </div>
        ) : null}
      </div>

      <ActionBar>
        <Button variant="secondary" size="lg" onClick={onEdit} className="lg:hidden" aria-label="Modifier la saisie">
          <Pencil aria-hidden />
        </Button>
        <Button size="lg" block onClick={onSave}>
          Enregistrer la mission
        </Button>
      </ActionBar>
    </div>
  );
}
