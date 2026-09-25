import { Building2, Camera, CircleCheck, FileText, History, StickyNote, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DemoBanner } from "@/components/layout/demo-banner";
import { PageHeader } from "@/components/layout/page-header";
import { MissionTimeline } from "@/components/mission/mission-timeline";
import { CustomerCard, VehicleCard } from "@/components/mission/party-cards";
import { RouteSummary } from "@/components/mission/route-summary";
import { StatusBadge } from "@/components/mission/status-badge";
import { RecommendedTransportCard, TransportOptionRow } from "@/components/transport/transport-cards";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { placeShortName } from "@/core/mission/types";
import { todayInZone } from "@/core/shared/timezone";
import { TRANSPORT_MODE_LABELS } from "@/core/transport/types";
import { MissionActionBar } from "@/features/mission-detail/mission-action-bar";
import { MissionPricePanel } from "@/features/mission-detail/mission-price-panel";
import { missionStepAction } from "@/actions/missions";
import { Badge } from "@/components/ui/badge";
import { DetailRow } from "@/components/ui/card";
import { MISSION_CHANNEL_LABELS } from "@/core/accounts/types";
import { formatEuro } from "@/core/shared/format";
import { AssignDriverForm } from "@/features/mission-detail/assign-driver-form";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getActor } from "@/services/auth/session";
import { getAdminMission } from "@/services/portals/admin-portal";
import { formatEventTime, formatMissionDay } from "@/utils/dates";

export async function generateMetadata(props: PageProps<"/admin/missions/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const actor = await getActor();
  const mission = actor?.kind === "STAFF" ? (await getAdminMission(actor, id))?.mission : null;
  return {
    title: mission
      ? `${mission.reference} · ${placeShortName(mission.pickup)} → ${placeShortName(mission.dropoff)}`
      : "Mission",
  };
}

export default async function AdminMissionDetailPage(props: PageProps<"/admin/missions/[id]">) {
  await connection();
  const actor = await requirePortal("admin");
  const [{ id }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const detail = await withAccess(() => getAdminMission(actor, id));
  if (!detail) notFound();
  const { mission, owner, actions, drivers, invoice } = detail;
  const today = todayInZone();
  const justCreated = searchParams.nouvelle === "1";
  const returnLabel = mission.returnLeg
    ? `Transport (${TRANSPORT_MODE_LABELS[mission.returnLeg.mode].toLowerCase()})`
    : "Transport";

  return (
    <div className="mx-auto max-w-xl lg:max-w-none">
      <PageHeader
        backHref="/admin/missions"
        backLabel="Missions"
        eyebrow={<span className="font-mono tracking-normal normal-case">{mission.reference}</span>}
        title={
          <>
            {placeShortName(mission.pickup)} <span className="text-faint">→</span> {placeShortName(mission.dropoff)}
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

      {justCreated ? (
        <div
          role="status"
          className="mb-6 flex animate-rise items-center gap-3 rounded-2xl bg-success-soft px-4 py-3 text-success"
        >
          <CircleCheck className="size-5 animate-pop" aria-hidden />
          <p className="font-semibold">Mission enregistrée</p>
        </div>
      ) : null}

      {mission.isDemo ? (
        <DemoBanner className="mb-6">Mission de démonstration générée à partir de données simulées.</DemoBanner>
      ) : null}

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-x-8">
        <Section title="Progression mission">
          <Card className="p-5">
            <MissionTimeline mission={mission} />
          </Card>
        </Section>

        <Section title="Itinéraire">
          <Card className="p-5">
            <RouteSummary pickup={mission.pickup} dropoff={mission.dropoff} route={mission.route} />
            <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-faint">Départ</dt>
                <dd className="min-w-0 break-words">{mission.pickup.label}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-faint">Arrivée</dt>
                <dd className="min-w-0 break-words">{mission.dropoff.label}</dd>
              </div>
            </dl>
          </Card>
        </Section>

        <Section title="Compte & affectation" icon={<Building2 className="size-3.5" aria-hidden />}>
          <Card className="divide-y divide-border px-5">
            <DetailRow
              label="Compte"
              value={
                owner.name ? (
                  <span className="flex items-center justify-end gap-2">
                    {owner.name}
                    <Badge tone={owner.kind === "BUSINESS" ? "accent" : "neutral"}>
                      {owner.kind === "BUSINESS" ? "Pro" : "Particulier"}
                    </Badge>
                  </span>
                ) : (
                  <span className="text-muted">Sans espace client</span>
                )
              }
            />
            <DetailRow label="Canal" value={MISSION_CHANNEL_LABELS[owner.channel]} />
            {owner.createdByName ? <DetailRow label="Créée par" value={owner.createdByName} /> : null}
            {owner.customerReference ? <DetailRow label="Réf. client" value={owner.customerReference} /> : null}
            {invoice ? (
              <DetailRow label={`Facture ${invoice.number}`} value={formatEuro(invoice.amountTTC)} hint="TTC" />
            ) : null}
            <div className="py-3">
              <p className="mb-2 flex items-center gap-2 text-[15px]">
                <Truck className="size-4 text-faint" aria-hidden />
                Convoyeur
              </p>
              <AssignDriverForm
                missionId={mission.id}
                current={mission.assignment}
                drivers={drivers.map((driver) => ({
                  id: driver.id,
                  name: `${driver.firstName} ${driver.lastName}`,
                  city: driver.homeCity,
                }))}
                assignable={mission.status === "CONFIRMED" || mission.status === "ASSIGNED"}
              />
            </div>
          </Card>
        </Section>

        <div className="grid gap-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1 xl:grid-cols-2">
          <Section title="Client">
            <CustomerCard customer={mission.customerSnapshot} />
          </Section>
          <Section title="Véhicule">
            <VehicleCard vehicle={mission.vehicle} />
          </Section>
        </div>

        {mission.returnLeg ? (
          <Section title="Transport convoyeur">
            <div className="space-y-3">
              <RecommendedTransportCard
                option={mission.returnLeg}
                isRecommended={mission.returnAlternatives[0]?.id === mission.returnLeg.id}
              />
              {mission.accessLeg ? (
                <div>
                  <p className="mb-2 px-1 text-sm font-medium text-muted">Aller vers le véhicule</p>
                  <TransportOptionRow name="access-readonly" option={mission.accessLeg} selected={false} />
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        <aside className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-9 lg:row-start-1 lg:self-start">
          <Section title="Prix">
            <MissionPricePanel pricing={mission.pricing} returnLabel={returnLabel} />
          </Section>
        </aside>

        {mission.notes || mission.internalNotes ? (
          <Section title="Notes" icon={<StickyNote className="size-3.5" aria-hidden />}>
            <Card className="divide-y divide-border px-5">
              {mission.notes ? (
                <div className="py-3.5">
                  <p className="text-sm text-faint">Consignes (visibles du convoyeur et du client)</p>
                  <p className="mt-1 text-[15px] whitespace-pre-line">{mission.notes}</p>
                </div>
              ) : null}
              {mission.internalNotes ? (
                <div className="py-3.5">
                  <p className="text-sm text-faint">Note interne Naera</p>
                  <p className="mt-1 text-[15px] whitespace-pre-line">{mission.internalNotes}</p>
                </div>
              ) : null}
            </Card>
          </Section>
        ) : null}

        <Section title="Documents" icon={<FileText className="size-3.5" aria-hidden />}>
          <EmptyState
            icon={<FileText />}
            title="Aucun document"
            description="Carte grise, ordre de mission, tickets de train et de péage : ajout depuis le module terrain."
          />
        </Section>

        <Section title="Photos" icon={<Camera className="size-3.5" aria-hidden />}>
          <EmptyState
            icon={<Camera />}
            title="Aucune photo"
            description="Photos de départ, de défauts et d'arrivée prises par le convoyeur."
          />
        </Section>

        <Section title="Historique" icon={<History className="size-3.5" aria-hidden />}>
          <Card className="px-5">
            <ol className="divide-y divide-border">
              {[...mission.events].reverse().map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 py-3 text-[15px]">
                  <span>{event.label}</span>
                  <time dateTime={event.at} className="shrink-0 text-sm text-faint tabular">
                    {formatEventTime(event.at)}
                  </time>
                </li>
              ))}
            </ol>
          </Card>
        </Section>
      </div>

      <MissionActionBar missionId={mission.id} actions={actions} perform={missionStepAction} />
    </div>
  );
}
