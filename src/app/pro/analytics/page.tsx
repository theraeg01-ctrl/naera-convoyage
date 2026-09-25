import type { Metadata } from "next";
import { connection } from "next/server";
import { BarList, ColumnChart } from "@/components/charts/column-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Section } from "@/components/ui/card";
import { PlanDiscover } from "@/components/ui/plan-discover";
import { VEHICLE_CATEGORY_LABELS } from "@/core/mission/types";
import { formatEuro, formatKm } from "@/core/shared/format";
import { requireFeature, requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { getPlanOffer, getProAnalytics, getProContext } from "@/services/portals/pro-portal";
import { formatMonthLong, formatMonthShort } from "@/utils/dates";

export const metadata: Metadata = { title: "Analytics" };

const compactEuro = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

/** Analyse des dépenses du compte (montants facturés, jamais de coût Naera). */
export default async function ProAnalyticsPage() {
  await connection();
  const actor = await requirePortal("pro");
  requirePermission(actor, "analytics.read");
  const { account } = await withAccess(() => getProContext(actor));
  requireFeature(account, "analytics_basic");
  const [analytics, advancedOffer] = await withAccess(() =>
    Promise.all([getProAnalytics(actor), getPlanOffer(actor, "analytics_advanced")]),
  );
  const basic = analytics.basic;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description={<span className="first-letter:uppercase">{formatMonthLong(analytics.month)}</span>}
        className="mb-0"
      />
      {basic ? (
        <>
          <section aria-label="Dépenses du mois" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Missions confirmées" value={basic.missionCount} />
            <StatTile label="Dépenses" value={formatEuro(basic.totalSpendHT)} hint="HT" />
            <StatTile
              label="Dépense moyenne par mission"
              value={basic.averageSpendPerMission !== null ? formatEuro(basic.averageSpendPerMission) : "—"}
              hint="HT"
            />
            <StatTile
              label="Dépense moyenne par kilomètre"
              value={basic.averageSpendPerKm !== null ? formatEuro(basic.averageSpendPerKm, 2) : "—"}
              hint={`${formatKm(basic.convoyedKm)} convoyés`}
            />
          </section>
          <Section title="Dépenses mensuelles (HT)">
            <Card className="p-5">
              <ColumnChart
                label="Dépenses mensuelles HT sur 6 mois"
                series={[{ id: "spend", label: "Dépenses HT", color: "--series-1" }]}
                categories={basic.monthly.map((entry) => ({ key: entry.month, label: formatMonthShort(entry.month) }))}
                values={{ spend: basic.monthly.map((entry) => entry.spendHT) }}
                format={compactEuro}
              />
            </Card>
          </Section>
        </>
      ) : null}

      {analytics.advanced ? (
        <Section title="Analyse avancée">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-4 p-5">
              <p className="font-semibold">Dépenses par type de véhicule</p>
              <BarList
                rows={analytics.advanced.spendByVehicleCategory.map((row) => ({
                  key: row.category,
                  label: VEHICLE_CATEGORY_LABELS[row.category],
                  value: row.spendHT,
                  hint: `${row.missions} missions`,
                }))}
                format={compactEuro}
              />
            </Card>
            <Card className="space-y-4 p-5">
              <p className="font-semibold">Dépenses par collaborateur</p>
              <BarList
                rows={analytics.advanced.spendByUser.map((row) => ({
                  key: row.userId ?? "none",
                  label: row.userId ? (analytics.authors[row.userId] ?? "Ancien membre") : "Naera",
                  value: row.spendHT,
                  hint: `${row.missions} missions`,
                }))}
                format={compactEuro}
              />
              {analytics.advanced.averageLeadTimeDays !== null ? (
                <p className="border-t border-border pt-3 text-sm text-muted">
                  Délai moyen de commande : {analytics.advanced.averageLeadTimeDays} jours
                </p>
              ) : null}
            </Card>
          </div>
        </Section>
      ) : advancedOffer ? (
        <PlanDiscover title="Analytics avancés" planLabel={advancedOffer.planLabel} features={advancedOffer.features} />
      ) : null}
    </div>
  );
}
