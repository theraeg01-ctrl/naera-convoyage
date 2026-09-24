import { ArrowRight, CalendarDays, Clock3, FileClock, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { StatTile } from "@/components/dashboard/stat-tile";
import { MissionViewCard, shortPlace } from "@/components/mission/mission-view-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { CustomerMissionView } from "@/core/access/projections";
import { can } from "@/core/access/permissions";
import { vehicleDisplayName } from "@/core/mission/types";
import { PLAN_LABELS } from "@/core/plans/features";
import { formatEuro, formatKm } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getProContext, getProDashboard } from "@/services/portals/pro-portal";
import { formatLongDay } from "@/utils/dates";

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

export default async function ProDashboardPage() {
  await connection();
  const actor = await requirePortal("pro");
  const [{ account }, data] = await withAccess(() => Promise.all([getProContext(actor), getProDashboard(actor)]));
  const today = todayInZone();
  const { kpis } = data;
  const planCode = account.entitlements.planCode;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-muted">{account.name}</p>
          {planCode ? <Badge tone="outline">{PLAN_LABELS[planCode]}</Badge> : null}
        </div>
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight">Bonjour {actor.name.split(" ")[0]},</h1>
        <p className="text-[15px] text-muted first-letter:uppercase">{formatLongDay(today)}</p>
      </header>

      {can(actor, "missions.create") ? (
        <Link
          href="/pro/missions/new"
          className="bg-price group relative flex items-center gap-4 overflow-hidden rounded-[28px] p-5 text-price-fg shadow-float transition-transform active:scale-[0.99]"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Plus className="size-6" strokeWidth={2.4} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold">Nouvelle mission</span>
            <span className="block text-sm text-price-muted">Tarif immédiat, commande en 1 minute</span>
          </span>
          <ArrowRight className="size-5 text-price-muted transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      ) : null}

      <section aria-label="Indicateurs" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Missions du jour" value={kpis.missionsToday} />
        <StatTile label="En cours" value={kpis.inProgress} />
        <StatTile
          label="Terminées ce mois"
          value={kpis.completedThisMonth}
          hint={`${kpis.missionsThisMonth} missions ce mois`}
        />
        <StatTile
          label="À confirmer"
          value={kpis.toConfirm}
          hint={kpis.toConfirm > 0 ? "Devis en attente" : undefined}
        />
        <StatTile label="Dépenses du mois" value={formatEuro(kpis.spendThisMonthHT)} hint="HT" />
        <StatTile label="Km convoyés ce mois" value={formatKm(kpis.convoyedKmThisMonth)} />
      </section>

      {data.toConfirm.length > 0 ? (
        <Section title="À confirmer" icon={<FileClock className="size-3.5" aria-hidden />}>
          <MissionList missions={data.toConfirm} today={today} />
        </Section>
      ) : null}

      <Section title="En cours" icon={<Clock3 className="size-3.5" aria-hidden />}>
        {data.inProgress.length > 0 ? (
          <MissionList missions={data.inProgress} today={today} />
        ) : (
          <EmptyState title="Aucune mission en cours" description="Les convoyages démarrés apparaîtront ici." />
        )}
      </Section>

      <Section
        title="Dernières livrées"
        icon={<CalendarDays className="size-3.5" aria-hidden />}
        action={
          <ButtonLink href="/pro/missions" variant="ghost" size="sm" className="-mr-2">
            Tout voir
            <ArrowRight aria-hidden />
          </ButtonLink>
        }
      >
        <MissionList missions={data.recent} today={today} />
      </Section>
    </div>
  );
}
