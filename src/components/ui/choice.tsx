"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface ChoiceOption<T extends string> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}

interface SegmentedProps<T extends string> {
  name: string;
  legend: string;
  hideLegend?: boolean;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Sélecteur segmenté fondé sur de vrais boutons radio :
 * navigation clavier (flèches) et lecteurs d'écran natifs.
 */
export function Segmented<T extends string>({
  name,
  legend,
  hideLegend,
  options,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedProps<T>) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={cn("mb-2 text-[15px] font-semibold", hideLegend && "sr-only")}>{legend}</legend>
      <div className="flex gap-1 rounded-2xl bg-surface-2 p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "relative flex min-w-0 flex-auto cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-center font-semibold text-muted transition-colors",
              size === "sm" ? "h-9 text-[13px]" : "h-11 text-sm",
              "has-checked:bg-surface has-checked:text-foreground has-checked:shadow-card",
              "has-focus-visible:outline-2 has-focus-visible:outline-accent",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            <span className="truncate">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ChipGroupProps<T extends string> {
  legend: string;
  hideLegend?: boolean;
  options: readonly ChoiceOption<T>[];
  className?: string;
}

interface SingleChipProps<T extends string> extends ChipGroupProps<T> {
  name: string;
  value: T;
  onChange: (value: T) => void;
}

const chipClass = cn(
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground shadow-card transition-colors",
  "hover:border-border-strong has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent",
  "has-focus-visible:outline-2 has-focus-visible:outline-accent [&_svg]:size-4 [&_svg]:shrink-0",
);

/** Puces à choix unique (radio). */
export function ChipRadioGroup<T extends string>({
  legend,
  hideLegend,
  options,
  name,
  value,
  onChange,
  className,
}: SingleChipProps<T>) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={cn("mb-2 text-[15px] font-semibold", hideLegend && "sr-only")}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={chipClass}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            <span className="flex flex-col leading-tight">
              <span>{option.label}</span>
              {option.hint ? <span className="text-xs font-normal text-faint">{option.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface MultiChipProps<T extends string> extends ChipGroupProps<T> {
  values: readonly T[];
  onChange: (values: T[]) => void;
}

/** Puces à choix multiples (cases à cocher). */
export function ChipCheckboxGroup<T extends string>({
  legend,
  hideLegend,
  options,
  values,
  onChange,
  className,
}: MultiChipProps<T>) {
  const toggle = (value: T) =>
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={cn("mb-2 text-[15px] font-semibold", hideLegend && "sr-only")}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={chipClass}>
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="sr-only"
            />
            {option.icon}
            <span className="flex flex-col leading-tight">
              <span>{option.label}</span>
              {option.hint ? <span className="text-xs font-normal text-faint">{option.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
