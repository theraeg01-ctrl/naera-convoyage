import { ArrowRight, CalendarClock, CircleCheck, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MissionViewCard, shortPlace } from "@/components/mission/mission-view-card";
import { StatusBadge } from "@/components/mission/status-badge";
import { Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DriverMissionView } from "@/core/access/projections";
import { vehicleDisplayName } from "@/core/mission/types";
import { formatKm, formatMinutes } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { listDriverMissions } from "@/services/portals/driver-portal";
import { formatLongDay, formatMissionDay } from "@/utils/dates";

export const metadata: Metadata = { title: "Mes missions" };

function DriverList({ missions, today }: { missions: DriverMissionView[]; today: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {missions.map((mission) => (
        <MissionViewCard
          key={mission.id}
          href={`/driver/missions/${mission.id}`}
          reference={mission.reference}
          isDemo={mission.isDemo}
          status={mission.status}
          from={shortPlace(mission.pickup)}
          to={shortPlace(mission.dropoff)}
          subtitle={`${vehicleDisplayName(mission.vehicle)}${mission.vehicle.plate ? ` · ${mission.vehicle.plate}` : ""}`}
          scheduledDate={mission.scheduledDate}
          scheduledTime={mission.scheduledTime}
          today={today}
        />
      ))}
    </div>
  );
}

/** Contact utile maintenant : départ tant que le véhicule n'a pas quitté le point de collecte, sinon arrivée. */
function contactNow(mission: DriverMissionView) {
  return mission.progress.drivingAt ? mission.dropoff.contact : mission.pickup.contact;
}

/** Mission à exécuter en priorité : ce qu'il faut faire maintenant, en grand. */
function FocusMission({ mission, step, today }: { mission: DriverMissionView; step: string | null; today: string }) {
  const contact = contactNow(mission);
  return (
    <div className="bg-price overflow-hidden rounded-[28px] p-5 text-price-fg shadow-float">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-price-muted">{mission.reference}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {shortPlace(mission.pickup)} → {shortPlace(mission.dropoff)}
          </p>
          <p className="mt-1 text-sm text-price-muted">
            {vehicleDisplayName(mission.vehicle)}
            {mission.vehicle.plate ? ` · ${mission.vehicle.plate}` : ""} ·{" "}
            {formatMissionDay(mission.scheduledDate, today)} {mission.scheduledTime}
          </p>
          <p className="mt-1 text-sm text-price-muted">
            {formatKm(mission.route.distanceKm)} · {formatMinutes(mission.route.trafficDurationMin)}
          </p>
        </div>
        <StatusBadge status={mission.status} />
      </div>
      {step ? (
        <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-[15px]">
          Étape suivante : <span className="font-semibold">{step}</span>
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Link
          href={`/driver/missions/${mission.id}`}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-base font-semibold text-black transition-transform active:scale-[0.98]"
        >
          Ouvrir la mission
          <ArrowRight className="size-5" aria-hidden />
        </Link>
        {contact?.phone ? (
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            aria-label={`Appeler ${contact.name}`}
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15"
          >
            <Phone className="size-5" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Espace convoyeur : orienté exécution. Aucun montant, aucune donnée financière. */
export default async function DriverHomePage() {
  await connection();
  const actor = await requirePortal("driver");
  const list = await withAccess(() => listDriverMissions(actor));
  const today = todayInZone();
  const [focus, ...otherCurrent] = list.current.length > 0 ? list.current : list.upcoming;
  const upcoming = list.current.length > 0 ? list.upcoming : list.upcoming.slice(1);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight">Bonjour {actor.name.split(" ")[0]}</h1>
        <p className="mt-1 text-[15px] text-muted first-letter:uppercase">
          {formatLongDay(today)} · {list.completedThisMonth} mission{list.completedThisMonth > 1 ? "s" : ""} livrée
          {list.completedThisMonth > 1 ? "s" : ""} ce mois
        </p>
      </header>

      {focus ? (
        <Section title={list.current.length > 0 ? "Maintenant" : "Prochaine mission"}>
          <FocusMission mission={focus} step={list.nextSteps[focus.id] ?? null} today={today} />
          {list.current.length > 0 && otherCurrent.length > 0 ? (
            <DriverList missions={otherCurrent} today={today} />
          ) : null}
        </Section>
      ) : (
        <EmptyState
          title="Aucune mission pour l'instant"
          description="Les missions qui te sont affectées apparaîtront ici."
        />
      )}

      {upcoming.length > 0 ? (
        <Section title="À venir" icon={<CalendarClock className="size-3.5" aria-hidden />}>
          <DriverList missions={upcoming} today={today} />
        </Section>
      ) : null}

      {list.done.length > 0 ? (
        <Section title="Livrées récemment" icon={<CircleCheck className="size-3.5" aria-hidden />}>
          <DriverList missions={list.done.slice(0, 5)} today={today} />
        </Section>
      ) : null}
    </div>
  );
}
