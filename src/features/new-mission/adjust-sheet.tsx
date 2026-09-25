"use client";

import { useState } from "react";
import type { ManualOverrides } from "@/core/simulation/types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { AffixInput, Field } from "@/components/ui/field";
import { parseDecimal } from "./form-schema";

interface AdjustSheetProps {
  open: boolean;
  onClose: () => void;
  current: { distanceKm: number; durationMin: number; tollsEur: number; returnPrice: number | null };
  overrides: ManualOverrides;
  onApply: (overrides: ManualOverrides) => void;
}

const text = (value: number | undefined) => (value === undefined ? "" : String(value).replace(".", ","));

/** Corrections manuelles : les valeurs saisies sont marquées « MANUEL ». */
export function AdjustSheet({ open, onClose, current, overrides, onApply }: AdjustSheetProps) {
  const [values, setValues] = useState(() => ({
    distanceKm: text(overrides.distanceKm),
    durationMin: text(overrides.durationMin),
    tollsEur: text(overrides.tollsEur),
    returnPrice: text(overrides.returnPrice),
  }));
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const next: ManualOverrides = {};
    const entries: Array<[keyof ManualOverrides, string, number, number]> = [
      ["distanceKm", values.distanceKm, 0.1, 3000],
      ["durationMin", values.durationMin, 1, 2880],
      ["tollsEur", values.tollsEur, 0, 1000],
      ["returnPrice", values.returnPrice, 0, 5000],
    ];
    for (const [key, raw, min, max] of entries) {
      if (raw.trim() === "") continue;
      const parsed = parseDecimal(raw);
      if (parsed === undefined || parsed < min || parsed > max) {
        setError("Une valeur est invalide : vérifie les champs.");
        return;
      }
      next[key] = key === "durationMin" ? Math.round(parsed) : parsed;
    }
    setError(null);
    onApply(next);
    onClose();
  };

  const field = (key: keyof typeof values, label: string, suffix: string, placeholder: number | null) => (
    <Field label={label} htmlFor={`adjust-${key}`}>
      <AffixInput
        id={`adjust-${key}`}
        inputMode="decimal"
        suffix={suffix}
        placeholder={placeholder === null ? "" : text(placeholder)}
        value={values[key]}
        onChange={(event) => setValues({ ...values, [key]: event.target.value })}
      />
    </Field>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Corriger manuellement"
      description="Laisse vide pour garder la valeur calculée."
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              onApply({});
              onClose();
            }}
          >
            Réinitialiser
          </Button>
          <Button size="lg" block onClick={apply}>
            Appliquer
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4 pt-2">
        {field("distanceKm", "Distance", "km", current.distanceKm)}
        {field("durationMin", "Durée (trafic)", "min", current.durationMin)}
        {field("tollsEur", "Péages", "€", current.tollsEur)}
        {field("returnPrice", "Prix du retour", "€", current.returnPrice)}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </BottomSheet>
  );
}
