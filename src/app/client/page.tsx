import { ArrowRight, FileClock, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MissionViewCard, shortPlace } from "@/components/mission/mission-view-card";
import { StatusBadge } from "@/components/mission/status-badge";
import { TrackingSteps } from "@/components/mission/tracking-steps";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { vehicleDisplayName } from "@/core/mission/types";
import { formatEuro } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getClientHome } from "@/services/portals/client-portal";
import { formatMissionDay } from "@/utils/dates";

export const metadata: Metadata = { title: "Accueil" };

export default async function ClientHomePage() {
  await connection();
  const actor = await requirePortal("client");
  const home = await withAccess(() => getClientHome(actor));
  const today = todayInZone();
  const current = home.current;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight">Bonjour {home.firstName},</h1>
        <p className="mt-1 text-[15px] text-muted">Votre véhicule, livré où vous voulez.</p>
      </header>

      {current ? (
        <Section title="Commande en cours">
          <Link
            href={`/client/missions/${current.id}`}
            className="block rounded-3xl border border-border bg-surface p-5 shadow-card transition-[border-color,transform] hover:border-border-strong active:scale-[0.99]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-faint">{current.reference}</p>
                <p className="truncate text-xl font-semibold tracking-tight">
                  {shortPlace(current.pickup)} <span className="text-faint">→</span> {shortPlace(current.dropoff)}
                </p>
                <p className="text-sm text-muted">
                  {vehicleDisplayName(current.vehicle)} · {formatMissionDay(current.scheduledDate, today)} ·{" "}
                  {current.scheduledTime}
                </p>
              </div>
              <StatusBadge status={current.status} />
            </div>
            <TrackingSteps stages={current.tracking} />
            <p className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold text-accent">
              Suivre ma commande
              <ArrowRight className="size-4" aria-hidden />
            </p>
          </Link>
        </Section>
      ) : null}

      <Link
        href="/client/order"
        className="bg-price group relative flex items-center gap-4 overflow-hidden rounded-[28px] p-5 text-price-fg shadow-float transition-transform active:scale-[0.99]"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <Plus className="size-6" strokeWidth={2.4} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">Commander un convoyage</span>
          <span className="block text-sm text-price-muted">Prix immédiat, sans engagement</span>
        </span>
        <ArrowRight className="size-5 text-price-muted transition-transform group-hover:translate-x-1" aria-hidden />
      </Link>

      {home.toConfirm.length > 0 ? (
        <Section title="Devis à accepter" icon={<FileClock className="size-3.5" aria-hidden />}>
          <div className="grid gap-3 md:grid-cols-2">
            {home.toConfirm.map((mission) => (
              <MissionViewCard
                key={mission.id}
                href={`/client/missions/${mission.id}`}
                reference={mission.reference}
                isDemo={mission.isDemo}
                status={mission.status}
                from={shortPlace(mission.pickup)}
                to={shortPlace(mission.dropoff)}
                scheduledDate={mission.scheduledDate}
                scheduledTime={mission.scheduledTime}
                today={today}
                amount={formatEuro(mission.totals.ttc)}
                amountHint="TTC"
              />
            ))}
          </div>
        </Section>
      ) : null}

      {!current && home.count === 0 ? (
        <EmptyState
          title="Aucune commande pour l'instant"
          description="Indiquez le départ, la destination et la date : le prix s'affiche immédiatement."
        />
      ) : (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-[15px]">
            {home.count} convoyage{home.count > 1 ? "s" : ""} au total
          </p>
          <ButtonLink href="/client/missions" variant="ghost" size="sm">
            Voir tout
            <ArrowRight aria-hidden />
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}
