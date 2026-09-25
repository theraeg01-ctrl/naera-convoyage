import { Camera, ClipboardCheck, ExternalLink, FileText, PenLine, Route, StickyNote, TrainFront } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { driverStepAction } from "@/actions/driver";
import { PageHeader } from "@/components/layout/page-header";
import { ContactCard } from "@/components/mission/contact-card";
import { MissionTimeline } from "@/components/mission/mission-timeline";
import { VehicleCard } from "@/components/mission/party-cards";
import { RouteBrief } from "@/components/mission/route-brief";
import { StatusBadge } from "@/components/mission/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { todayInZone } from "@/core/shared/timezone";
import { DriverLegCard } from "@/features/driver/driver-leg-card";
import { MissionActionBar } from "@/features/mission-detail/mission-action-bar";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getDriverMission } from "@/services/portals/driver-portal";
import { formatMissionDay } from "@/utils/dates";

export const metadata: Metadata = { title: "Mission" };

function mapsLink(from: string, to: string) {
  const params = new URLSearchParams({ api: "1", origin: from, destination: to, travelmode: "driving" });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default async function DriverMissionPage(props: PageProps<"/driver/missions/[id]">) {
  await connection();
  const actor = await requirePortal("driver");
  const { id } = await props.params;
  const detail = await withAccess(() => getDriverMission(actor, id));
  if (!detail) notFound();
  const { mission, actions } = detail;
  const today = todayInZone();
  const delivered = Boolean(mission.progress.deliveredAt);

  return (
    <div className="mx-auto max-w-xl lg:max-w-none">
      <PageHeader
        backHref="/driver"
        backLabel="Mes missions"
        eyebrow={<span className="font-mono tracking-normal normal-case">{mission.reference}</span>}
        title={
          <>
            {mission.pickup.city ?? mission.pickup.label} <span className="text-faint">→</span>{" "}
            {mission.dropoff.city ?? mission.dropoff.label}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={mission.status} size="md" />
            <span className="tabular">
              {formatMissionDay(mission.scheduledDate, today)} · {mission.scheduledTime}
            </span>
          </span>
        }
      />

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:gap-x-8">
        <Section title="Contacts">
          <div className="space-y-3">
            <ContactCard title="Au départ" contact={mission.pickup.contact} />
            <ContactCard title="À l'arrivée" contact={mission.dropoff.contact} />
            <p className="px-1 text-sm text-faint">Client : {mission.customerName}</p>
          </div>
        </Section>

        <Section title="Itinéraire" icon={<Route className="size-3.5" aria-hidden />}>
          <RouteBrief
            pickup={mission.pickup}
            dropoff={mission.dropoff}
            distanceKm={mission.route.distanceKm}
            durationMin={mission.route.trafficDurationMin}
          >
            <a
              href={mapsLink(mission.pickup.label, mission.dropoff.label)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-semibold hover:bg-surface-3"
            >
              <ExternalLink className="size-4" aria-hidden />
              Ouvrir dans le GPS
            </a>
          </RouteBrief>
        </Section>

        {mission.accessLeg || mission.returnLeg ? (
          <Section title="Mes trajets" icon={<TrainFront className="size-3.5" aria-hidden />}>
            <Card className="divide-y divide-border px-5">
              {mission.accessLeg ? <DriverLegCard title="Aller vers le véhicule" leg={mission.accessLeg} /> : null}
              {mission.returnLeg ? <DriverLegCard title="Retour après livraison" leg={mission.returnLeg} /> : null}
            </Card>
          </Section>
        ) : null}

        <Section title="Véhicule">
          <VehicleCard vehicle={mission.vehicle} />
        </Section>

        <Section title="Checklist" icon={<ClipboardCheck className="size-3.5" aria-hidden />}>
          <Card className="p-5">
            <MissionTimeline mission={mission} />
          </Card>
        </Section>

        {mission.instructions ? (
          <Section title="Consignes" icon={<StickyNote className="size-3.5" aria-hidden />}>
            <Card className="p-5 text-[15px] whitespace-pre-line">{mission.instructions}</Card>
          </Section>
        ) : null}

        <Section title="Photos" icon={<Camera className="size-3.5" aria-hidden />}>
          <EmptyState
            icon={<Camera />}
            title="Photos de départ et d'arrivée"
            description="Prise de photos guidée (face avant, côtés, compteur, défauts) — bientôt disponible."
          />
        </Section>

        <Section title="Documents" icon={<FileText className="size-3.5" aria-hidden />}>
          <EmptyState
            icon={<FileText />}
            title="Ordre de mission, billets"
            description="Les documents de la mission seront disponibles ici hors connexion."
          />
        </Section>

        <Section title="Signature client" icon={<PenLine className="size-3.5" aria-hidden />}>
          <Card className="flex items-center justify-between gap-3 p-5">
            <p className="text-[15px] text-muted">
              {delivered ? "Livraison confirmée." : "Signature à recueillir à la livraison."}
            </p>
            <Badge tone="outline">Bientôt</Badge>
          </Card>
        </Section>
      </div>

      {actions.length > 0 ? (
        <MissionActionBar missionId={mission.id} actions={actions} perform={driverStepAction} />
      ) : null}
    </div>
  );
}
