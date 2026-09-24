"use client";

import { MapPinOff } from "lucide-react";
import { useState } from "react";
import { manualRouteSchema } from "@/core/simulation/schema";
import type { MissionRequest } from "@/core/simulation/types";
import { Button } from "@/components/ui/button";
import { AffixInput, Field } from "@/components/ui/field";
import { parseDecimal } from "./form-schema";

type ManualRoute = NonNullable<MissionRequest["manualRoute"]>;

/** Saisie de secours : l'utilisateur peut toujours terminer son estimation. */
export function ManualRouteCard({
  message,
  onSubmit,
  pending,
}: {
  message: string;
  onSubmit: (route: ManualRoute) => void;
  pending: boolean;
}) {
  const [values, setValues] = useState({ distance: "", duration: "", tolls: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({});

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const hours = parseDecimal(values.duration);
    const parsed = manualRouteSchema.safeParse({
      distanceKm: parseDecimal(values.distance),
      durationMin: hours === undefined ? undefined : Math.round(hours * 60),
      tollsEur: parseDecimal(values.tolls) ?? 0,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "distanceKm") next.distance = "Distance invalide";
        if (issue.path[0] === "durationMin") next.duration = "Durée invalide";
        if (issue.path[0] === "tollsEur") next.tolls = "Montant invalide";
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="animate-rise space-y-5 rounded-3xl border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning">
          <MapPinOff className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold">Itinéraire à compléter</p>
          <p className="mt-0.5 text-sm text-muted">{message}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Distance" htmlFor="manual-distance" error={errors.distance}>
          <AffixInput
            id="manual-distance"
            inputMode="decimal"
            suffix="km"
            value={values.distance}
            onChange={(e) => setValues({ ...values, distance: e.target.value })}
          />
        </Field>
        <Field label="Durée" htmlFor="manual-duration" hint="En heures, ex. 2,5" error={errors.duration}>
          <AffixInput
            id="manual-duration"
            inputMode="decimal"
            suffix="h"
            value={values.duration}
            onChange={(e) => setValues({ ...values, duration: e.target.value })}
          />
        </Field>
        <Field label="Péages" htmlFor="manual-tolls" error={errors.tolls}>
          <AffixInput
            id="manual-tolls"
            inputMode="decimal"
            suffix="€"
            placeholder="0"
            value={values.tolls}
            onChange={(e) => setValues({ ...values, tolls: e.target.value })}
          />
        </Field>
      </div>
      <Button type="submit" size="lg" block disabled={pending}>
        Calculer avec ces valeurs
      </Button>
    </form>
  );
}
