import { Download } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { BarList, ColumnChart } from "@/components/charts/column-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, Section } from "@/components/ui/card";
import { LockedFeature } from "@/components/ui/locked-feature";
import { VEHICLE_CATEGORY_LABELS } from "@/core/mission/types";
import { hasFeature, lowestPlanWith, PLAN_LABELS, type FeatureKey } from "@/core/plans/features";
import { formatEuro, formatKm } from "@/core/shared/format";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { getProAnalytics, getProContext } from "@/services/portals/pro-portal";
import { formatMonthLong, formatMonthShort } from "@/utils/dates";

export const metadata: Metadata = { title: "Analytics" };

const planFor = (feature: FeatureKey) => {
  const plan = lowestPlanWith(feature);
  return plan ? PLAN_LABELS[plan] : null;
};

const compactEuro = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export default async function ProAnalyticsPage() {
  await connection();
  const actor = await requirePortal("pro");
  requirePermission(actor, "analytics.read");
  const { account } = await withAccess(() => getProContext(actor));

  if (!hasFeature(account, "analytics_basic")) {
    return (
      <div>
        <PageHeader title="Analytics" description="Suivez vos dépenses de convoyage." />
        <LockedFeature
          title="Analytics non inclus dans votre abonnement"
          description="Dépenses mensuelles, coût moyen par mission et par kilomètre, kilomètres convoyés."
          planLabel={planFor("analytics_basic")}
        />
      </div>
    );
  }

  const analytics = await withAccess(() => getProAnalytics(actor));
  const basic = analytics.basic;
  const canExport = hasFeature(account, "csv_export");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description={<span className="first-letter:uppercase">{formatMonthLong(analytics.month)}</span>}
        className="mb-0"
        actions={
          canExport ? (
            <span className="inline-flex items-center gap-2 text-sm text-faint">
              <Download className="size-4" aria-hidden />
              Export CSV
              <Badge tone="outline">Bientôt</Badge>
            </span>
          ) : null
        }
      />
      {basic ? (
        <>
          <section aria-label="Indicateurs du mois" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Missions confirmées" value={basic.missionCount} />
            <StatTile label="Dépense" value={formatEuro(basic.totalSpendHT)} hint="HT" />
            <StatTile
              label="Coût moyen / mission"
              value={basic.averageCostPerMission !== null ? formatEuro(basic.averageCostPerMission) : "—"}
              hint="HT"
            />
            <StatTile
              label="Coût moyen / km"
              value={basic.averageCostPerKm !== null ? formatEuro(basic.averageCostPerKm, 2) : "—"}
              hint={`${formatKm(basic.convoyedKm)} convoyés`}
            />
          </section>
          <Section title="Dépenses mensuelles (HT)">
            <Card className="p-5">
              <ColumnChart
                label="Dépenses mensuelles HT sur 6 mois"
                series={[{ id: "spend", label: "Dépense HT", color: "--series-1" }]}
                categories={basic.monthly.map((entry) => ({ key: entry.month, label: formatMonthShort(entry.month) }))}
                values={{ spend: basic.monthly.map((entry) => entry.spendHT) }}
                format={compactEuro}
              />
            </Card>
          </Section>
        </>
      ) : null}

      <Section title="Analyse avancée">
        {analytics.advanced ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-4 p-5">
              <p className="font-semibold">Dépense par type de véhicule</p>
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
              <p className="font-semibold">Dépense par collaborateur</p>
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
        ) : (
          <LockedFeature
            title="Analyse avancée"
            description="Répartition par véhicule et par collaborateur, délais de commande, rapports PDF."
            planLabel={planFor("analytics_advanced")}
          />
        )}
      </Section>
    </div>
  );
}
