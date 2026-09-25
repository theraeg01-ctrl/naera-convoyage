import { assertNonNegative } from "../shared/errors";
import { roundMoney } from "../shared/money";

export interface VatBreakdown {
  ht: number;
  vatPercent: number;
  vat: number;
  ttc: number;
}

export function computeVat(amountHT: number, vatPercent: number): VatBreakdown {
  assertNonNegative(amountHT, "Montant HT");
  assertNonNegative(vatPercent, "Taux de TVA");
  const ht = roundMoney(amountHT);
  const vat = roundMoney((ht * vatPercent) / 100);
  return { ht, vatPercent, vat, ttc: roundMoney(ht + vat) };
}
