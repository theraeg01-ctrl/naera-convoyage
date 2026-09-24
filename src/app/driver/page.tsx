import { CalendarClock, CircleCheck, Navigation } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { MissionViewCard, shortPlace } from "@/components/mission/mission-view-card";
import { Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DriverMissionView } from "@/core/access/projections";
import { vehicleDisplayName } from "@/core/mission/types";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { listDriverMissions } from "@/services/portals/driver-portal";
import { formatLongDay } from "@/utils/dates";

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

export default async function DriverHomePage() {
  await connection();
  const actor = await requirePortal("driver");
  const list = await withAccess(() => listDriverMissions(actor));
  const today = todayInZone();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight">Bonjour {actor.name.split(" ")[0]},</h1>
        <p className="mt-1 text-[15px] text-muted first-letter:uppercase">
          {formatLongDay(today)} · {list.completedThisMonth} mission{list.completedThisMonth > 1 ? "s" : ""} terminée
          {list.completedThisMonth > 1 ? "s" : ""} ce mois
        </p>
      </header>

      <Section title="En cours" icon={<Navigation className="size-3.5" aria-hidden />}>
        {list.current.length > 0 ? (
          <DriverList missions={list.current} today={today} />
        ) : (
          <EmptyState title="Aucune mission en cours" description="Démarre ta prochaine mission depuis sa fiche." />
        )}
      </Section>

      <Section title="À venir" icon={<CalendarClock className="size-3.5" aria-hidden />}>
        {list.upcoming.length > 0 ? (
          <DriverList missions={list.upcoming} today={today} />
        ) : (
          <EmptyState title="Rien de prévu" description="Les missions qui te sont affectées apparaîtront ici." />
        )}
      </Section>

      {list.done.length > 0 ? (
        <Section title="Terminées récemment" icon={<CircleCheck className="size-3.5" aria-hidden />}>
          <DriverList missions={list.done} today={today} />
        </Section>
      ) : null}
    </div>
  );
}
