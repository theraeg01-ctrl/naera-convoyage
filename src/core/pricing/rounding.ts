import { assertNonNegative } from "../shared/errors";
import { roundMoney } from "../shared/money";
import type { RoundingMode } from "../settings/types";

export const ROUNDING_LABELS: Record<RoundingMode, string> = {
  EXACT: "Exact",
  UP_5: "5 € supérieur",
  UP_10: "10 € supérieur",
  PSYCHOLOGICAL: "Prix psychologique (…9 €)",
};

/**
 * Arrondi commercial, toujours vers le haut pour ne jamais rogner la marge.
 * Prix psychologique : prochain prix se terminant par 9 (219, 249, 299…).
 */
export function commercialRounding(value: number, mode: RoundingMode): number {
  assertNonNegative(value, "Prix");
  const exact = roundMoney(value);
  if (exact === 0) return 0;
  switch (mode) {
    case "EXACT":
      return exact;
    case "UP_5":
      return Math.ceil(exact / 5) * 5;
    case "UP_10":
      return Math.ceil(exact / 10) * 10;
    case "PSYCHOLOGICAL":
      return Math.ceil((exact + 1) / 10) * 10 - 1;
  }
}
