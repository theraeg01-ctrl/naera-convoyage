import { addDays } from "@/core/shared/calendar";
import { formatEuro, formatPercent } from "@/core/shared/format";
import type { OptionPricing } from "@/core/settings/types";
import type { OrderFormState, OrderOptionChoice } from "./order-flow";

/** Prix affiché d'une option (prix de vente, jamais de coût interne). */
export function optionPriceLabel(pricing: OptionPricing): string {
  switch (pricing.type) {
    case "FIXED":
      return `+${formatEuro(pricing.amount)}`;
    case "PERCENT":
      return `+${formatPercent(pricing.percent)}`;
    case "PER_SLICE":
      return `${formatEuro(pricing.amount)} / ${pricing.sliceMinutes} min`;
  }
}

export function toOptionChoices(
  options: { id: OrderOptionChoice["id"]; label: string; pricing: OptionPricing }[],
): OrderOptionChoice[] {
  return options.map((option) => ({
    id: option.id,
    label: option.label,
    priceLabel: optionPriceLabel(option.pricing),
  }));
}

interface Prefill {
  pickupAddress?: string;
  dropoffAddress?: string;
  time?: string;
  vehicle?: {
    category?: OrderFormState["category"];
    fuelType?: OrderFormState["fuelType"];
    make?: string;
    model?: string;
    plate?: string;
  };
  optionIds?: OrderFormState["optionIds"];
  pickupContact?: { name?: string; phone?: string } | null;
  dropoffContact?: { name?: string; phone?: string } | null;
  customerReference?: string;
}

/** Valeurs initiales du formulaire (commande vierge ou duplication). */
export function orderFormDefaults(today: string, prefill?: Prefill | null): OrderFormState {
  return {
    pickupAddress: prefill?.pickupAddress ?? "",
    dropoffAddress: prefill?.dropoffAddress ?? "",
    date: addDays(today, 1),
    time: prefill?.time ?? "09:00",
    category: prefill?.vehicle?.category ?? "SEDAN",
    fuelType: prefill?.vehicle?.fuelType ?? "DIESEL",
    make: prefill?.vehicle?.make ?? "",
    model: prefill?.vehicle?.model ?? "",
    plate: prefill?.vehicle?.plate ?? "",
    optionIds: prefill?.optionIds ?? [],
    pickupContactName: prefill?.pickupContact?.name ?? "",
    pickupContactPhone: prefill?.pickupContact?.phone ?? "",
    dropoffContactName: prefill?.dropoffContact?.name ?? "",
    dropoffContactPhone: prefill?.dropoffContact?.phone ?? "",
    customerReference: "",
    notes: "",
  };
}
