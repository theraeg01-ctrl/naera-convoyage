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
      />
      <section aria-label="Indicateurs du mois" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="Chiffre d'affaires"
          value={formatEuro(month.revenueHT)}
          hint={`Prix de vente HT · ${month.missions} missions confirmées`}
        />
        <StatTile
          label="Coût interne"
          value={formatEuro(month.internalCostHT)}
          hint="Convoyeurs, transports, carburant, péages, frais"
        />
        <StatTile
          label="Marge brute"
          value={formatEuro(month.grossMarginHT)}
          hint={
            month.grossMarginRate !== null
              ? `Taux de marge sur vente : ${formatPercent(month.grossMarginRate, 1)}`
              : undefined
          }
        />
        <StatTile label="Encours clients" value={formatEuro(finance.receivablesTTC)} hint="Factures à encaisser, TTC" />
        <StatTile label="Encaissé ce mois" value={formatEuro(finance.paidThisMonthTTC)} hint="TTC" />
      </section>
      <Section title="Chiffre d'affaires et marge brute (HT)">
        <Card className="p-5">
          <ColumnChart
            label="Chiffre d'affaires et marge brute HT sur 6 mois"
            series={[
              { id: "revenue", label: "Chiffre d'affaires", color: "--series-1" },
              { id: "margin", label: "Marge brute", color: "--series-2" },
            ]}
            categories={finance.months.map((entry) => ({ key: entry.month, label: formatMonthShort(entry.month) }))}
            values={{
              revenue: finance.months.map((entry) => entry.revenueHT),
              margin: finance.months.map((entry) => entry.grossMarginHT),
            }}
            format={compactEuro}
          />
        </Card>
      </Section>
      <Section
        title="Rentabilité par compte pro (mois)"
        description="Marge brute et taux de marge sur vente, missions confirmées"
      >
        {finance.topAccounts.length > 0 ? (
          <Card className="divide-y divide-border px-5">
            {finance.topAccounts.map((row) => (
              <div key={row.name} className="py-3">
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="min-w-0 truncate font-medium">{row.name}</span>
                  <span className="shrink-0 font-semibold tabular">{formatEuro(row.grossMarginHT)}</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3 text-sm text-muted tabular">
                  <span className="min-w-0 truncate">CA {formatEuro(row.revenueHT)} HT</span>
                  {row.grossMarginRate !== null ? (
                    <span className="shrink-0">{formatPercent(row.grossMarginRate, 1)} sur vente</span>
                  ) : null}
                </div>
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
