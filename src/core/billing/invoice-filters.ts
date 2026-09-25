import type { Invoice, InvoiceStatus } from "../accounts/types";

/** Onglets de la facturation : ce qui reste à régler, l'historique payé, tout. */
export const INVOICE_VIEWS = ["TO_PAY", "PAID", "ALL"] as const;
export type InvoiceView = (typeof INVOICE_VIEWS)[number];

export const INVOICE_VIEW_LABELS: Record<InvoiceView, string> = {
  TO_PAY: "À régler",
  PAID: "Payées",
  ALL: "Toutes",
};

export const INVOICE_VIEW_SLUGS: Record<InvoiceView, string> = {
  TO_PAY: "a-regler",
  PAID: "payees",
  ALL: "toutes",
};

const VIEW_STATUSES: Record<InvoiceView, readonly InvoiceStatus[] | null> = {
  /** Émises ou en retard : ce que le compte doit encore payer. */
  TO_PAY: ["ISSUED", "OVERDUE"],
  PAID: ["PAID"],
  ALL: null,
};

/** Période d'émission (filtre facultatif). */
export const INVOICE_PERIODS = ["ALL", "MONTH", "QUARTER", "YEAR"] as const;
export type InvoicePeriod = (typeof INVOICE_PERIODS)[number];

export const INVOICE_PERIOD_LABELS: Record<InvoicePeriod, string> = {
  ALL: "Toutes les dates",
  MONTH: "Ce mois-ci",
  QUARTER: "3 derniers mois",
  YEAR: "Cette année",
};

export const INVOICE_PERIOD_SLUGS: Record<InvoicePeriod, string> = {
  ALL: "tout",
  MONTH: "mois",
  QUARTER: "trimestre",
  YEAR: "annee",
};

function fromSlug<T extends string>(values: readonly T[], slugs: Record<T, string>, slug: unknown, fallback: T): T {
  const value = Array.isArray(slug) ? slug[0] : slug;
  return values.find((candidate) => slugs[candidate] === value) ?? fallback;
}

export function invoiceViewFromSlug(slug: unknown): InvoiceView {
  return fromSlug(INVOICE_VIEWS, INVOICE_VIEW_SLUGS, slug, "TO_PAY");
}

export function invoicePeriodFromSlug(slug: unknown): InvoicePeriod {
  return fromSlug(INVOICE_PERIODS, INVOICE_PERIOD_SLUGS, slug, "ALL");
}

/** Premier mois (« YYYY-MM ») inclus dans la période, null si toutes les dates. */
function firstMonthOf(period: InvoicePeriod, today: string): string | null {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  switch (period) {
    case "ALL":
      return null;
    case "MONTH":
      return today.slice(0, 7);
    case "QUARTER": {
      const index = year * 12 + (month - 1) - 2;
      return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
    }
    case "YEAR":
      return `${year}-01`;
  }
}

export function matchesInvoicePeriod(invoice: Pick<Invoice, "issuedAt">, period: InvoicePeriod, today: string) {
  const first = firstMonthOf(period, today);
  return first === null || invoice.issuedAt.slice(0, 7) >= first;
}

export function matchesInvoiceView(invoice: Pick<Invoice, "status">, view: InvoiceView) {
  const statuses = VIEW_STATUSES[view];
  return statuses === null || statuses.includes(invoice.status);
}

/** Factures d'un onglet sur une période, et le nombre de factures de chaque onglet. */
export function filterInvoices<T extends Pick<Invoice, "status" | "issuedAt">>(
  invoices: readonly T[],
  query: { view: InvoiceView; period: InvoicePeriod },
  today: string,
): { invoices: T[]; counts: Record<InvoiceView, number> } {
  const inPeriod = invoices.filter((invoice) => matchesInvoicePeriod(invoice, query.period, today));
  return {
    invoices: inPeriod.filter((invoice) => matchesInvoiceView(invoice, query.view)),
    counts: Object.fromEntries(
      INVOICE_VIEWS.map((view) => [view, inPeriod.filter((invoice) => matchesInvoiceView(invoice, view)).length]),
    ) as Record<InvoiceView, number>,
  };
}
