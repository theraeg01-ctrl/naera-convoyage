import { ArrowRight, CircleCheck, Clock3, History, Plus, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MissionRowList, shortReference } from "@/components/mission/mission-row";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PlanDiscover } from "@/components/ui/plan-discover";
import { can } from "@/core/access/permissions";
import { hasFeature } from "@/core/plans/features";
import { PERIMETER_LABELS } from "@/core/analytics/business-analytics";
import { formatEuro } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { toProMissionRow } from "@/features/pro/mission-rows";
import { getPlanOffer, getProContext, getProDashboard } from "@/services/portals/pro-portal";
import { formatEventTime, formatLongDay } from "@/utils/dates";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard professionnel : d'abord ce qui demande une action, puis ce qui
 * est en cours, les dépenses du mois et l'activité récente. Pas de BI ici :
 * l'analyse détaillée a son propre espace (selon l'offre).
 */
export default async function ProDashboardPage() {
  await connection();
  const actor = await requirePortal("pro");
  const [{ account }, data] = await withAccess(() => Promise.all([getProContext(actor), getProDashboard(actor)]));
  const analyticsOffer =
    can(actor, "analytics.read") && !hasFeature(account, "analytics_basic")
      ? await withAccess(() => getPlanOffer(actor, "analytics_basic"))
      : null;
  const today = todayInZone();
  const { metrics } = data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[30px] leading-tight font-semibold tracking-tight">Bonjour {actor.name.split(" ")[0]}</h1>
          <p className="text-[15px] text-muted first-letter:uppercase">{formatLongDay(today)}</p>
        </div>
        {can(actor, "missions.create") ? (
          <ButtonLink href="/pro/missions/new" className="hidden lg:inline-flex">
            <Plus aria-hidden />
            Nouvelle mission
          </ButtonLink>
        ) : null}
      </header>

      <Section title="À traiter" icon={<CircleCheck className="size-3.5" aria-hidden />}>
        {data.toConfirm.length > 0 ? (
          <>
            <p className="px-1 text-sm text-muted">
              {data.toConfirm.length === 1 ? "Un devis attend" : `${data.toConfirm.length} devis attendent`} votre
              confirmation.
            </p>
            <MissionRowList missions={data.toConfirm.map(toProMissionRow)} today={today} />
          </>
        ) : (
          <Card className="px-5 py-4 text-[15px] text-muted">Aucune action en attente.</Card>
        )}
      </Section>

      <Section
        title={`En cours${data.inProgress.length > 0 ? ` · ${data.inProgress.length}` : ""}`}
        icon={<Clock3 className="size-3.5" aria-hidden />}
      >
        {data.inProgress.length > 0 ? (
          <MissionRowList missions={data.inProgress.map(toProMissionRow)} today={today} />
        ) : (
          <EmptyState title="Aucune mission en cours" description="Les convoyages démarrés apparaissent ici." />
        )}
      </Section>

      <Section
        title="Dépenses du mois"
        icon={<Wallet className="size-3.5" aria-hidden />}
        action={
          can(actor, "billing.read") ? (
            <ButtonLink href="/pro/billing" variant="ghost" size="sm" className="-mr-2">
              Facturation
              <ArrowRight aria-hidden />
            </ButtonLink>
          ) : null
        }
      >
        <Card className="p-5">
          <p className="text-[32px] leading-none font-semibold tracking-tight tabular">
            {formatEuro(metrics.confirmed.spendHT)}
          </p>
          <p className="mt-1.5 text-sm text-muted">HT · missions confirmées du mois</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
            {[
              { label: `${PERIMETER_LABELS.REQUESTED} ce mois`, value: metrics.requested.missionCount },
              { label: PERIMETER_LABELS.CONFIRMED, value: metrics.confirmed.missionCount },
              { label: PERIMETER_LABELS.DELIVERED, value: metrics.delivered.missionCount },
              { label: "En cours", value: metrics.inProgress },
            ].map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="text-[13px] text-muted">{item.label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        {analyticsOffer ? (
          <PlanDiscover
            title="Analyse des dépenses"
            planLabel={analyticsOffer.planLabel}
            features={analyticsOffer.features}
          />
        ) : null}
      </Section>

      <Section title="Activité récente" icon={<History className="size-3.5" aria-hidden />}>
        {data.activity.length > 0 ? (
          <Card className="divide-y divide-border px-5">
            {data.activity.map((item) => (
              <Link
                key={item.id}
                href={`/pro/missions/${item.missionId}`}
                className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{item.label}</span>
                  <span className="block truncate text-sm text-muted">
                    {item.route}
                    <span className="ml-2 font-mono text-xs text-faint" title={item.reference}>
                      {shortReference(item.reference)}
                    </span>
                  </span>
                </span>
                <time dateTime={item.at} className="shrink-0 text-sm text-faint tabular">
                  {formatEventTime(item.at)}
                </time>
              </Link>
            ))}
          </Card>
        ) : (
          <EmptyState title="Pas encore d'activité" />
        )}
      </Section>
    </div>
  );
}
