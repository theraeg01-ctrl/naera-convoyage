import { ArrowRight, CircleCheck, Clock3, History, Plus, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MissionViewCard, shortPlace } from "@/components/mission/mission-view-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PlanDiscover } from "@/components/ui/plan-discover";
import type { CustomerMissionView } from "@/core/access/projections";
import { can } from "@/core/access/permissions";
import { vehicleDisplayName } from "@/core/mission/types";
import { hasFeature, PLAN_LABELS } from "@/core/plans/features";
import { formatEuro, formatKm } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getPlanOffer, getProContext, getProDashboard } from "@/services/portals/pro-portal";
import { formatEventTime, formatLongDay } from "@/utils/dates";

export const metadata: Metadata = { title: "Dashboard" };

function MissionList({ missions, today }: { missions: CustomerMissionView[]; today: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {missions.map((mission) => (
        <MissionViewCard
          key={mission.id}
          href={`/pro/missions/${mission.id}`}
          reference={mission.reference}
          isDemo={mission.isDemo}
          status={mission.status}
          from={shortPlace(mission.pickup)}
          to={shortPlace(mission.dropoff)}
          subtitle={[vehicleDisplayName(mission.vehicle), mission.customerReference].filter(Boolean).join(" · ")}
          scheduledDate={mission.scheduledDate}
          scheduledTime={mission.scheduledTime}
          today={today}
          amount={formatEuro(mission.totals.ht)}
          amountHint="HT"
        />
      ))}
    </div>
  );
}

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
  const { kpis } = data;
  const planCode = account.entitlements.planCode;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-muted">{account.name}</p>
            {planCode ? <Badge tone="outline">{PLAN_LABELS[planCode]}</Badge> : null}
          </div>
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
            <MissionList missions={data.toConfirm} today={today} />
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
          <MissionList missions={data.inProgress} today={today} />
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
          <p className="text-[32px] leading-none font-semibold tracking-tight">
            {formatEuro(kpis.spendThisMonthHT)} <span className="text-base font-medium text-muted">HT</span>
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <dt className="text-faint">Missions</dt>
              <dd className="text-[17px] font-semibold tabular">{kpis.missionsThisMonth}</dd>
            </div>
            <div>
              <dt className="text-faint">Livrées</dt>
              <dd className="text-[17px] font-semibold tabular">{kpis.completedThisMonth}</dd>
            </div>
            <div>
              <dt className="text-faint">Convoyés</dt>
              <dd className="text-[17px] font-semibold tabular">{formatKm(kpis.convoyedKmThisMonth)}</dd>
            </div>
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
                    <span className="font-mono text-xs">{item.reference}</span> · {item.route}
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
