"use client";

import type { OptimizationStrategy } from "@/core/settings/types";
import type { ResolvedLeg } from "@/core/simulation/resolve";
import { STRATEGY_LABELS, recommendationReason } from "@/core/transport/score";
import { TRANSPORT_MODE_LABELS } from "@/core/transport/types";
import { Segmented } from "@/components/ui/choice";
import { RecommendedTransportCard, TransportOptionRow } from "@/components/transport/transport-cards";

interface ReturnSectionProps {
  leg: ResolvedLeg;
  strategy: OptimizationStrategy;
  onStrategyChange: (strategy: OptimizationStrategy) => void;
  onSelect: (optionId: string) => void;
}

/** Comparateur du retour convoyeur : recommandation + alternatives sélectionnables. */
export function ReturnSection({ leg, strategy, onStrategyChange, onSelect }: ReturnSectionProps) {
  const { selected, recommended, ranked } = leg;
  if (!selected) {
    return (
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
        Aucune solution de retour estimée. Ajoute un prix manuellement.
      </p>
    );
  }
  const isRecommended = selected.id === recommended?.id;
  return (
    <div className="space-y-4">
      <Segmented
        name="strategy"
        legend="Priorité"
        hideLegend
        size="sm"
        value={strategy}
        onChange={onStrategyChange}
        options={(["CHEAPEST", "FASTEST", "BALANCED"] as const).map((value) => ({
          value,
          label: value === "BALANCED" ? "Compromis" : STRATEGY_LABELS[value],
        }))}
      />
      <RecommendedTransportCard
        option={selected}
        isRecommended={isRecommended}
        reason={
          isRecommended
            ? `${recommendationReason(strategy)} : ${TRANSPORT_MODE_LABELS[selected.mode].toLowerCase()}`
            : undefined
        }
      />
      {ranked.length > 1 ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 px-1 text-sm font-medium text-muted">Toutes les solutions ({ranked.length})</legend>
          {ranked.map(({ option, score }) => (
            <TransportOptionRow
              key={option.id}
              name="return-option"
              option={option.id === selected.id ? selected : option}
              selected={option.id === selected.id}
              deltaVsSelected={option.price - selected.price}
              score={score}
              onSelect={() => onSelect(option.id)}
            />
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}

/** Trajet du convoyeur jusqu'au véhicule : solution retenue + alternatives. */
export function AccessSection({ leg, onSelect }: { leg: ResolvedLeg; onSelect: (optionId: string) => void }) {
  const { selected, ranked } = leg;
  if (!selected) {
    return <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">Trajet d&apos;approche non estimé.</p>;
  }
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Rejoindre le véhicule</legend>
      {ranked.map(({ option }) => (
        <TransportOptionRow
          key={option.id}
          name="access-option"
          option={option}
          selected={option.id === selected.id}
          deltaVsSelected={option.price - selected.price}
          onSelect={() => onSelect(option.id)}
        />
      ))}
    </fieldset>
  );
}
