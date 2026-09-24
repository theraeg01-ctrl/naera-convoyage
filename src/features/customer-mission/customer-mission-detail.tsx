import { CircleCheck, Copy, FileText, History, Route } from "lucide-react";
import { customerMissionAction } from "@/actions/orders";
import { PageHeader } from "@/components/layout/page-header";
import { ContactCard } from "@/components/mission/contact-card";
import { MissionDocuments } from "@/components/mission/mission-documents";
import { VehicleCard } from "@/components/mission/party-cards";
import { RouteBrief } from "@/components/mission/route-brief";
import { StatusBadge } from "@/components/mission/status-badge";
import { TrackingSteps } from "@/components/mission/tracking-steps";
import { QuoteSummary } from "@/components/pricing/quote-summary";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import type { CustomerMissionView } from "@/core/access/projections";
import type { Invoice } from "@/core/accounts/types";
import type { MissionActionId } from "@/core/mission/progress";
import type { TrackingStage } from "@/core/mission/tracking";
import { MissionActionBar } from "@/features/mission-detail/mission-action-bar";
import { formatEventTime, formatMissionDay } from "@/utils/dates";

interface CustomerMissionDetailProps {
  mission: CustomerMissionView;
  tracking: TrackingStage[];
  actions: MissionActionId[];
  invoice: Invoice | null;
  today: string;
  backHref: string;
  backLabel: string;
  justCreated: boolean;
  /** Informations propres au portail (auteur, référence client…). */
  meta?: React.ReactNode;
  duplicateHref?: string;
}

/**
 * Détail d'une mission côté client (particulier ou professionnel). Ne reçoit
 * qu'une vue projetée : aucun coût, marge ni rémunération n'est disponible.
 */
export function CustomerMissionDetail(props: CustomerMissionDetailProps) {
  const { mission, tracking, actions, invoice, today } = props;
  const from = mission.pickup.city ?? mission.pickup.label;
  const to = mission.dropoff.city ?? mission.dropoff.label;
  return (
    <div className="mx-auto max-w-xl lg:max-w-none">
      <PageHeader
        backHref={props.backHref}
        backLabel={props.backLabel}
        eyebrow={<span className="font-mono tracking-normal normal-case">{mission.reference}</span>}
        title={
          <>
            {from} <span className="text-faint">→</span> {to}
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
        actions={
          props.duplicateHref ? (
            <ButtonLink href={props.duplicateHref} variant="secondary" size="sm">
              <Copy aria-hidden />
              Dupliquer
            </ButtonLink>
          ) : null
        }
      />

      {props.justCreated ? (
        <div
          role="status"
          className="mb-6 flex animate-rise items-center gap-3 rounded-2xl bg-success-soft px-4 py-3 text-success"
        >
          <CircleCheck className="size-5 animate-pop" aria-hidden />
          <p className="font-semibold">Commande enregistrée — nous vous confirmons le convoyeur rapidement.</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-x-8">
        <Section title="Suivi">
          <Card className="p-5">
            <TrackingSteps stages={tracking} />
            {mission.driverFirstName && mission.status !== "COMPLETED" ? (
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted">
                Votre convoyeur : <span className="font-semibold text-foreground">{mission.driverFirstName}</span>
              </p>
            ) : null}
          </Card>
        </Section>

        <Section title="Itinéraire" icon={<Route className="size-3.5" aria-hidden />}>
          <RouteBrief
            pickup={mission.pickup}
            dropoff={mission.dropoff}
            distanceKm={mission.route.distanceKm}
            durationMin={mission.route.durationMin}
          />
        </Section>

        <div className="grid gap-3 sm:grid-cols-2">
          <ContactCard title="Contact au départ" contact={mission.contacts.pickup} />
          <ContactCard title="Contact à l'arrivée" contact={mission.contacts.dropoff} />
        </div>

        <Section title="Véhicule">
          <VehicleCard vehicle={mission.vehicle} />
        </Section>

        {props.meta ? <Section title="Commande">{props.meta}</Section> : null}

        <aside className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-9 lg:row-start-1 lg:self-start">
          <Section title="Prix">
            <QuoteSummary pricing={mission} />
          </Section>
        </aside>

        <Section title="Documents" icon={<FileText className="size-3.5" aria-hidden />}>
          <MissionDocuments status={mission.status} progress={mission.progress} invoiceNumber={invoice?.number} />
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

      {actions.length > 0 ? (
        <MissionActionBar
          missionId={mission.id}
          actions={actions}
          perform={customerMissionAction}
          labels={{ CONFIRM: "Accepter le devis" }}
        />
      ) : null}
    </div>
  );
}
