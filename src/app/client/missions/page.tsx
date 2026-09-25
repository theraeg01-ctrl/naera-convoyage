import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { MissionViewCard, shortPlace } from "@/components/mission/mission-view-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { vehicleDisplayName } from "@/core/mission/types";
import { formatEuro } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { listClientMissions } from "@/services/portals/client-portal";

export const metadata: Metadata = { title: "Mes convoyages" };

export default async function ClientMissionsPage() {
  await connection();
  const actor = await requirePortal("client");
  const missions = await withAccess(() => listClientMissions(actor));
  const today = todayInZone();
  return (
    <div>
      <PageHeader title="Mes convoyages" />
      {missions.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {missions.map((mission) => (
            <MissionViewCard
              key={mission.id}
              href={`/client/missions/${mission.id}`}
              reference={mission.reference}
              isDemo={mission.isDemo}
              status={mission.status}
              from={shortPlace(mission.pickup)}
              to={shortPlace(mission.dropoff)}
              subtitle={vehicleDisplayName(mission.vehicle)}
              scheduledDate={mission.scheduledDate}
              scheduledTime={mission.scheduledTime}
              today={today}
              amount={formatEuro(mission.totals.ttc)}
              amountHint="TTC"
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListChecks />}
          title="Aucun convoyage"
          description="Vos commandes apparaîtront ici."
          action={<ButtonLink href="/client/order">Commander</ButtonLink>}
        />
      )}
    </div>
  );
}
