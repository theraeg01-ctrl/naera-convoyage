import type { Metadata } from "next";
import { connection } from "next/server";
import { ColumnChart } from "@/components/charts/column-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatEuro, formatPercent } from "@/core/shared/format";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { getFinanceOverview } from "@/services/portals/admin-portal";
import { formatMonthLong, formatMonthShort } from "@/utils/dates";

export const metadata: Metadata = { title: "Finance" };

const compactEuro = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export default async function AdminFinancePage() {
  await connection();
  const actor = await requirePortal("admin");
  requirePermission(actor, "finance.read");
  const finance = await withAccess(() => getFinanceOverview(actor));
  const { month } = finance;
  return (
    <div className="space-y-8">
      <PageHeader
        title="Finance"
        description={
          <span className="first-letter:uppercase">{formatMonthLong(month.month)} · données internes Naera</span>
        }
        className="mb-0"
      />
      <section aria-label="Indicateurs du mois" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="Chiffre d'affaires"
          value={formatEuro(month.revenueHT)}
          hint={`HT · ${month.missions} missions`}
        />
        <StatTile label="Coûts" value={formatEuro(month.costHT)} hint="Convoyeurs, transports, carburant, péages" />
        <StatTile
          label="Marge"
          value={formatEuro(month.marginHT)}
          hint={finance.marginRate !== null ? `${formatPercent(finance.marginRate)} du coût` : undefined}
        />
        <StatTile label="Encours clients" value={formatEuro(finance.receivablesTTC)} hint="Factures à encaisser, TTC" />
        <StatTile label="Encaissé ce mois" value={formatEuro(finance.paidThisMonthTTC)} hint="TTC" />
      </section>
      <Section title="Chiffre d'affaires et marge (HT)">
        <Card className="p-5">
          <ColumnChart
            label="Chiffre d'affaires et marge HT sur 6 mois"
            series={[
              { id: "revenue", label: "Chiffre d'affaires", color: "--series-1" },
              { id: "margin", label: "Marge", color: "--series-2" },
            ]}
            categories={finance.months.map((entry) => ({ key: entry.month, label: formatMonthShort(entry.month) }))}
            values={{
              revenue: finance.months.map((entry) => entry.revenueHT),
              margin: finance.months.map((entry) => entry.marginHT),
            }}
            format={compactEuro}
          />
        </Card>
      </Section>
      <Section title="Rentabilité par compte pro (mois)">
        {finance.topAccounts.length > 0 ? (
          <Card className="divide-y divide-border px-5">
            {finance.topAccounts.map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-3 py-3 text-[15px]">
                <span className="truncate">{row.name}</span>
                <span className="shrink-0 tabular">
                  <span className="text-muted">{formatEuro(row.revenueHT)} CA · </span>
                  <span className="font-semibold">{formatEuro(row.marginHT)} marge</span>
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState title="Aucune mission pro ce mois" />
        )}
      </Section>
    </div>
  );
}
