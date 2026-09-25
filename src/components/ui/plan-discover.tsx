"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface PlanDiscoverProps {
  title: string;
  planLabel: string;
  features: string[];
  className?: string;
}

/**
 * Fonctionnalité non incluse : un encart sobre (titre, offre, « Découvrir »),
 * jamais un écran bloqué. Aucun prix : le changement d'offre passe par Naera.
 */
export function PlanDiscover({ title, planLabel, features, className }: PlanDiscoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4 shadow-card",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted">Disponible avec {planLabel}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
        Découvrir
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={planLabel}
        description="Ce que comprend cette offre"
      >
        <ul className="space-y-2.5 pb-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-[15px]">
              <Check className="size-4 shrink-0 text-success" aria-hidden />
              {feature}
            </li>
          ))}
        </ul>
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
          Pour changer d&apos;offre, contactez votre interlocuteur Naera. Rien n&apos;est modifié automatiquement.
        </p>
      </BottomSheet>
    </div>
  );
}
