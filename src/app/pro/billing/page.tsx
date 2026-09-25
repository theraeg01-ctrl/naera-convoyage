import type { Metadata } from "next";
import { connection } from "next/server";
import { InvoiceList } from "@/components/billing/invoice-list";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/filter-chips";
import { LinkSelect } from "@/components/ui/link-select";
import {
  filterInvoices,
  INVOICE_PERIOD_LABELS,
  INVOICE_PERIOD_SLUGS,
  INVOICE_PERIODS,
  INVOICE_VIEW_LABELS,
  INVOICE_VIEW_SLUGS,
  INVOICE_VIEWS,
  invoicePeriodFromSlug,
  invoiceViewFromSlug,
  type InvoicePeriod,
  type InvoiceView,
} from "@/core/billing/invoice-filters";
import { formatEuro } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { getProBilling } from "@/services/portals/pro-portal";

export const metadata: Metadata = { title: "Facturation" };

const EMPTY_TITLES: Record<InvoiceView, string> = {
  TO_PAY: "Rien à régler",
  PAID: "Aucune facture payée",
  ALL: "Aucune facture",
};

export default async function ProBillingPage(props: PageProps<"/pro/billing">) {
  await connection();
  const actor = await requirePortal("pro");
  requirePermission(actor, "billing.read");
  const { onglet, periode } = await props.searchParams;
  const view = invoiceViewFromSlug(onglet);
  const period = invoicePeriodFromSlug(periode);
  const billing = await withAccess(() => getProBilling(actor));
  const { invoices, counts } = filterInvoices(billing.invoices, { view, period }, todayInZone());
  const hrefFor = (next: { view?: InvoiceView; period?: InvoicePeriod }) => {
    const params = new URLSearchParams();
    const nextView = next.view ?? view;
    const nextPeriod = next.period ?? period;
    if (nextView !== "TO_PAY") params.set("onglet", INVOICE_VIEW_SLUGS[nextView]);
    if (nextPeriod !== "ALL") params.set("periode", INVOICE_PERIOD_SLUGS[nextPeriod]);
    const query = params.toString();
    return query ? `/pro/billing?${query}` : "/pro/billing";
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Facturation" description="Une facture par mission terminée." />
      <section aria-label="Synthèse" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="À régler" value={formatEuro(billing.outstandingTTC)} hint="TTC" />
        <StatTile label="Réglé ce mois" value={formatEuro(billing.paidThisMonthTTC)} hint="TTC" />
        <StatTile
          label="Dépenses du mois"
          value={formatEuro(billing.spendThisMonthHT)}
          hint="HT, missions confirmées"
          className="col-span-2 lg:col-span-1"
        />
      </section>
      <Section
        title="Factures"
        action={
          <LinkSelect
            label="Période d'émission"
            value={period}
            options={INVOICE_PERIODS.map((value) => ({
              value,
              label: INVOICE_PERIOD_LABELS[value],
              href: hrefFor({ period: value }),
            }))}
          />
        }
      >
        <FilterChips
          label="Filtrer les factures"
          items={INVOICE_VIEWS.map((value) => ({
            id: value,
            label: INVOICE_VIEW_LABELS[value],
            href: hrefFor({ view: value }),
            count: counts[value],
            current: value === view,
          }))}
        />
        <InvoiceList
          invoices={invoices}
          emptyTitle={EMPTY_TITLES[view]}
          emptyDescription={
            period === "ALL" ? undefined : `Aucune facture sur la période « ${INVOICE_PERIOD_LABELS[period]} ».`
          }
        />
      </Section>
    </div>
  );
}
