import { ArrowRight, CalendarDays, Clock3, FileClock, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { LogoMark } from "@/components/brand/logo";
import { StatTile } from "@/components/dashboard/stat-tile";
import { MissionCard } from "@/components/mission/mission-card";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { matchesMissionFilter, sortMissionsBySchedule } from "@/core/mission/filters";
import { computeDashboardKpis } from "@/core/mission/kpis";
import { formatEuro, formatKm, formatPercent } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { listMissions } from "@/services/use-cases";
import { formatLongDay } from "@/utils/dates";

const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });

export default async function DashboardPage() {
  await connection();
  const missions = await listMissions();
  const today = todayInZone();
  const kpis = computeDashboardKpis(missions, today.slice(0, 7));
  const todays = sortMissionsBySchedule(
    missions.filter((mission) => matchesMissionFilter(mission, "TODAY", today)),
    "asc",
  );
  const recent = [...missions]
    .filter((mission) => !todays.includes(mission))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.reference.localeCompare(a.reference))
    .slice(0, 3);
  const pending = sortMissionsBySchedule(
    missions.filter((mission) => mission.status === "DRAFT" || mission.status === "QUOTED"),
    "asc",
  );
  const month = monthFormatter.format(new Date(`${today}T00:00:00Z`));

  return (
    <div className="space-y-8">
      <header className="space-y-5">
        <div className="flex items-center gap-2 lg:hidden">
          <LogoMark className="size-7" />
          <span className="text-[13px] font-bold tracking-[0.26em]">NAERA</span>
        </div>
        <div>
          <h1 className="text-[34px] leading-tight font-semibold tracking-tight">Bonjour,</h1>
          <p className="mt-1 text-[15px] text-muted first-letter:uppercase">{formatLongDay(today)}</p>
        </div>
      </header>

      <Link
        href="/missions/new"
        className="bg-price group relative flex items-center gap-4 overflow-hidden rounded-[28px] p-5 text-price-fg shadow-float transition-transform active:scale-[0.99]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-10 size-48 rounded-full bg-[radial-gradient(closest-side,rgba(123,150,255,0.3),transparent)]"
        />
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <Plus className="size-6" strokeWidth={2.4} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">Nouvelle mission</span>
          <span className="block text-sm text-price-muted">Estimation en moins de 30 secondes</span>
        </span>
        <ArrowRight className="size-5 text-price-muted transition-transform group-hover:translate-x-1" aria-hidden />
      </Link>

      <Section title="Missions du jour" icon={<CalendarDays className="size-3.5" aria-hidden />}>
        {todays.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {todays.map((mission) => (
              <MissionCard key={mission.id} mission={mission} today={today} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucune mission aujourd'hui"
            description="Les missions planifiées pour aujourd'hui apparaîtront ici."
          />
        )}
      </Section>

      <Section
        title="Missions récentes"
        icon={<Clock3 className="size-3.5" aria-hidden />}
        action={
          <ButtonLink href="/missions" variant="ghost" size="sm" className="-mr-2">
            Tout voir
          </ButtonLink>
        }
      >
        {recent.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {recent.map((mission) => (
              <MissionCard key={mission.id} mission={mission} today={today} />
            ))}
          </div>
        ) : (
          <EmptyState title="Pas encore de mission" description="Crée ta première estimation en quelques secondes." />
        )}
      </Section>

      <Section title="Devis en attente" icon={<FileClock className="size-3.5" aria-hidden />}>
        {pending.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((mission) => (
              <MissionCard key={mission.id} mission={mission} today={today} />
            ))}
          </div>
        ) : (
          <EmptyState title="Aucun devis en attente" />
        )}
      </Section>

      <Section title={`Ce mois-ci · ${month}`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Chiffre d'affaires"
            value={formatEuro(Math.round(kpis.revenueHT))}
            hint="HT, missions confirmées"
          />
          <StatTile
            label="Marge moyenne"
            value={kpis.averageMarginRate === null ? "—" : formatPercent(kpis.averageMarginRate)}
            hint={
              kpis.averageMarginAmount === null
                ? undefined
                : `${formatEuro(Math.round(kpis.averageMarginAmount))} par mission`
            }
          />
          <StatTile label="Missions" value={kpis.missionCount} hint="hors annulations" />
          <StatTile label="Kilomètres convoyés" value={formatKm(kpis.convoyedKm)} hint="missions livrées" />
        </div>
      </Section>
    </div>
  );
}
