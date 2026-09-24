import { isWeekend, publicHolidayName } from "../shared/calendar";
import { assertNonNegative } from "../shared/errors";
import { roundMoney, sumMoney } from "../shared/money";
import type { SelectableOptionId, ServiceOptionDef, ServiceOptionId } from "../settings/types";

export type PriceLineKind = "SERVICE" | "OPTION" | "SURCHARGE";

export interface PriceLine {
  id: string;
  label: string;
  detail?: string;
  amount: number;
  kind: PriceLineKind;
}

export interface OptionSelection {
  optionIds: readonly SelectableOptionId[];
  waitingMin: number;
  /** Date de mission (YYYY-MM-DD) : déclenche les majorations week-end / férié. */
  date: string;
}

function findOption(defs: readonly ServiceOptionDef[], id: ServiceOptionId): ServiceOptionDef | undefined {
  return defs.find((def) => def.id === id);
}

function fixedAmount(def: ServiceOptionDef): number {
  return def.pricing.type === "FIXED" ? def.pricing.amount : 0;
}

function waitingLine(def: ServiceOptionDef | undefined, waitingMin: number): PriceLine | null {
  if (!def || waitingMin <= 0 || def.pricing.type !== "PER_SLICE") return null;
  const slices = Math.ceil(waitingMin / def.pricing.sliceMinutes);
  return {
    id: def.id,
    label: def.label,
    detail: `${slices} × ${def.pricing.sliceMinutes} min`,
    amount: roundMoney(slices * def.pricing.amount),
    kind: "OPTION",
  };
}

/** Majoration automatique : jour férié prioritaire sur le week-end (pas de cumul). */
function surchargeLine(defs: readonly ServiceOptionDef[], date: string, basePrice: number): PriceLine | null {
  const holiday = publicHolidayName(date);
  const def = holiday ? findOption(defs, "HOLIDAY") : isWeekend(date) ? findOption(defs, "WEEKEND") : undefined;
  if (!def || def.pricing.type !== "PERCENT" || def.pricing.percent === 0) return null;
  return {
    id: def.id,
    label: def.label,
    detail: holiday ? `${holiday} · +${def.pricing.percent} %` : `+${def.pricing.percent} %`,
    amount: roundMoney((basePrice * def.pricing.percent) / 100),
    kind: "SURCHARGE",
  };
}

/** Lignes d'options et de majorations à ajouter à la prestation de base. */
export function computeOptionLines(
  basePrice: number,
  selection: OptionSelection,
  defs: readonly ServiceOptionDef[],
): PriceLine[] {
  assertNonNegative(basePrice, "Prix de base");
  assertNonNegative(selection.waitingMin, "Attente prévue");
  const lines: PriceLine[] = [];
  for (const id of selection.optionIds) {
    const def = findOption(defs, id);
    if (def) lines.push({ id: def.id, label: def.label, amount: roundMoney(fixedAmount(def)), kind: "OPTION" });
  }
  const waiting = waitingLine(findOption(defs, "WAITING"), selection.waitingMin);
  if (waiting) lines.push(waiting);
  const surcharge = surchargeLine(defs, selection.date, basePrice);
  if (surcharge) lines.push(surcharge);
  return lines;
}

/** Coût interne des options choisies (temps, matériel…). */
export function computeOptionsInternalCost(
  selection: Pick<OptionSelection, "optionIds" | "waitingMin">,
  defs: readonly ServiceOptionDef[],
): number {
  const ids: ServiceOptionId[] = [...selection.optionIds];
  if (selection.waitingMin > 0) ids.push("WAITING");
  return sumMoney(ids.map((id) => findOption(defs, id)?.internalCost ?? 0));
}
