import { describe, expect, it } from "vitest";
import type { InvoiceStatus } from "../accounts/types";
import { filterInvoices, invoicePeriodFromSlug, invoiceViewFromSlug } from "../billing/invoice-filters";

const invoice = (status: InvoiceStatus, issuedAt: string) => ({ status, issuedAt });

describe("Facturation pro : onglets et période", () => {
  const today = "2026-03-15";
  const invoices = [
    invoice("ISSUED", "2026-03-02T10:00:00Z"),
    invoice("OVERDUE", "2026-01-20T10:00:00Z"),
    invoice("PAID", "2026-03-01T10:00:00Z"),
    invoice("PAID", "2025-12-12T10:00:00Z"),
    invoice("PAID", "2025-06-12T10:00:00Z"),
  ];

  it("À régler = émises ou en retard ; Payées ; Toutes", () => {
    const { counts } = filterInvoices(invoices, { view: "ALL", period: "ALL" }, today);
    expect(counts).toEqual({ TO_PAY: 2, PAID: 3, ALL: 5 });
    const toPay = filterInvoices(invoices, { view: "TO_PAY", period: "ALL" }, today).invoices;
    expect(toPay.map((item) => item.status)).toEqual(["ISSUED", "OVERDUE"]);
  });

  it("période : ce mois, 3 derniers mois (à cheval sur l'année), cette année", () => {
    expect(filterInvoices(invoices, { view: "ALL", period: "MONTH" }, today).counts.ALL).toBe(2);
    expect(filterInvoices(invoices, { view: "ALL", period: "QUARTER" }, today).counts.ALL).toBe(3);
    expect(filterInvoices(invoices, { view: "PAID", period: "QUARTER" }, "2026-02-10").invoices).toHaveLength(2);
    expect(filterInvoices(invoices, { view: "ALL", period: "YEAR" }, today).counts.ALL).toBe(3);
  });

  it("paramètres d'URL inconnus : onglet À régler, toutes les dates", () => {
    expect(invoiceViewFromSlug("payees")).toBe("PAID");
    expect(invoiceViewFromSlug("n'importe")).toBe("TO_PAY");
    expect(invoicePeriodFromSlug(undefined)).toBe("ALL");
    expect(invoicePeriodFromSlug(["mois"])).toBe("MONTH");
  });
});
