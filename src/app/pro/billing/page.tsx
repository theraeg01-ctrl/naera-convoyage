import type { Metadata } from "next";
import { connection } from "next/server";
import { InvoiceList } from "@/components/billing/invoice-list";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/ui/card";
import { formatEuro } from "@/core/shared/format";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { getProBilling } from "@/services/portals/pro-portal";

export const metadata: Metadata = { title: "Facturation" };

export default async function ProBillingPage() {
  await connection();
  const actor = await requirePortal("pro");
  requirePermission(actor, "billing.read");
  const billing = await withAccess(() => getProBilling(actor));
  return (
    <div className="space-y-8">
      <PageHeader title="Facturation" description="Une facture par mission terminée." className="mb-0" />
      <section aria-label="Synthèse" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="À régler" value={formatEuro(billing.outstandingTTC)} hint="TTC" />
        <StatTile label="Réglé ce mois" value={formatEuro(billing.paidThisMonthTTC)} hint="TTC" />
        <StatTile label="Dépenses du mois" value={formatEuro(billing.spendThisMonthHT)} hint="HT, missions engagées" />
      </section>
      <Section title="Factures">
        <InvoiceList invoices={billing.invoices} />
      </Section>
    </div>
  );
}
