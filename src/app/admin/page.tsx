import { ArrowRight, CalendarDays, Clock3, FileClock, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { StatTile } from "@/components/dashboard/stat-tile";
import { MissionCard } from "@/components/mission/mission-card";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { matchesMissionFilter, sortMissionsBySchedule } from "@/core/mission/filters";
import { computeDashboardKpis } from "@/core/mission/kpis";
import { formatEuro, formatKm, formatPercent } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { listAdminMissions } from "@/services/portals/admin-portal";
import { formatLongDay } from "@/utils/dates";

const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });

export default async function AdminDashboardPage() {
  await connection();
  const actor = await requirePortal("admin");
  const missions = await withAccess(() => listAdminMissions(actor));
  const today = todayInZone();
  const kpis = computeDashboardKpis(missions, today.slice(0, 7));
  const todays = sortMissionsBySchedule(
    missions.filter((mission) => matchesMissionFilter(mission, "TODAY", today)),
    "asc",
  );
  const recent = [...missions]
    .filter((mission) => !todays.includes(mission))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.reference.localeCompare(a.reference))
    .slice(0, 8);
  const pending = sortMissionsBySchedule(
    missions.filter((mission) => mission.status === "DRAFT" || mission.status === "QUOTED"),
    "asc",
  );
  // Pilotage : missions confirmées qui n'ont pas encore de convoyeur.
  const unassigned = sortMissionsBySchedule(
    missions.filter((mission) => mission.status === "CONFIRMED" && !mission.assignment),
    "asc",
  );
  const listed = new Set([...todays, ...pending, ...unassigned].map((mission) => mission.id));
  const recentOthers = recent.filter((mission) => !listed.has(mission.id)).slice(0, 3);
  const month = monthFormatter.format(new Date(`${today}T00:00:00Z`));

  return (
    <div className="space-y-8">
      <header>
        <div>
          <h1 className="text-[34px] leading-tight font-semibold tracking-tight">
            Bonjour {actor.name.split(" ")[0]},
          </h1>
          <p className="mt-1 text-[15px] text-muted first-letter:uppercase">{formatLongDay(today)}</p>
        </div>
      </header>

      <Link
        href="/admin/missions/new"
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

      <Section title={`Ce mois-ci · ${month}`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Chiffre d'affaires"
            value={formatEuro(kpis.revenueHT, 0)}
            hint="Prix de vente HT, missions confirmées"
          />
          <StatTile
            label="Taux de marge sur vente"
            value={kpis.grossMarginRate === null ? "—" : formatPercent(kpis.grossMarginRate, 1)}
            hint={`Marge brute ${formatEuro(kpis.grossMarginHT, 0)}`}
          />
          <StatTile
            label="Missions confirmées"
            value={kpis.missions}
            hint={
              kpis.averageGrossMargin === null
                ? undefined
                : `${formatEuro(kpis.averageGrossMargin, 0)} de marge brute par mission`
            }
          />
          <StatTile label="Kilomètres convoyés" value={formatKm(kpis.convoyedKm)} hint="missions livrées" />
        </div>
      </Section>

      <Section title="Sans convoyeur" icon={<Truck className="size-3.5" aria-hidden />}>
        {unassigned.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {unassigned.map((mission) => (
              <MissionCard key={mission.id} mission={mission} today={today} />
            ))}
          </div>
        ) : (
          <EmptyState title="Toutes les missions confirmées ont un convoyeur" />
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
          <ButtonLink href="/admin/missions" variant="ghost" size="sm" className="-mr-2">
            Tout voir
          </ButtonLink>
        }
      >
        {recentOthers.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {recentOthers.map((mission) => (
              <MissionCard key={mission.id} mission={mission} today={today} />
            ))}
          </div>
        ) : (
          <EmptyState title="Pas encore de mission" description="Crée ta première estimation en quelques secondes." />
        )}
      </Section>
    </div>
  );
}
