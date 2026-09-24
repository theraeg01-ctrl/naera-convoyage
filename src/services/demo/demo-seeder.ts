import { randomUUID } from "node:crypto";
import { personName, type Invoice } from "@/core/accounts/types";
import { ACTION_DONE_LABELS } from "@/core/mission/progress";
import type { Mission, MissionEvent, MissionProgress } from "@/core/mission/types";
import { addDays } from "@/core/shared/calendar";
import { zonedLocalToUtcIso } from "@/core/shared/timezone";
import type { Repositories } from "@/repositories/types";
import { MissionService } from "../mission/mission-service";
import { MockRoutingProvider } from "../routing/mock-routing-provider";
import { RoutingService } from "../routing/routing-service";
import { SimulationService } from "../simulation/simulation-service";
import { buildDemoDirectory, buildDemoMissions, DEMO_DATASET_VERSION, type DemoMissionSeed } from "./demo-dataset";

const MILESTONE_LABELS: Record<keyof MissionProgress, string> = {
  startedAt: ACTION_DONE_LABELS.START,
  inspectedAt: ACTION_DONE_LABELS.CONFIRM_INSPECTION,
  drivingAt: ACTION_DONE_LABELS.START_DRIVING,
  deliveredAt: ACTION_DONE_LABELS.CONFIRM_DELIVERY,
  completedAt: ACTION_DONE_LABELS.COMPLETE,
};

const DAY_MS = 86_400_000;

function scheduledAt(seed: DemoMissionSeed): number {
  return new Date(zonedLocalToUtcIso(seed.request.date, seed.request.time)).getTime();
}

/** Commande passée quelques jours avant la date prévue (jamais dans le futur). */
function createdAtOf(seed: DemoMissionSeed, now: Date): Date {
  const firstMilestone = seed.progress.startedAt ? new Date(seed.progress.startedAt).getTime() : Infinity;
  return new Date(Math.min(scheduledAt(seed) - 3 * DAY_MS, firstMilestone - DAY_MS, now.getTime() - 3_600_000));
}

function historyEvents(seed: DemoMissionSeed, createdAt: Date, driverName: string | null): Omit<MissionEvent, "id">[] {
  const events: Omit<MissionEvent, "id">[] = [];
  const at = (offset: number) => new Date(createdAt.getTime() + offset).toISOString();
  if (seed.status !== "DRAFT" && seed.status !== "QUOTED" && seed.status !== "CANCELLED") {
    events.push({ type: "STATUS_CHANGED", label: ACTION_DONE_LABELS.CONFIRM, at: at(3_600_000) });
  }
  if (driverName) events.push({ type: "STATUS_CHANGED", label: `Convoyeur affecté : ${driverName}`, at: at(DAY_MS) });
  for (const [milestone, label] of Object.entries(MILESTONE_LABELS) as [keyof MissionProgress, string][]) {
    const value = seed.progress[milestone];
    if (value) events.push({ type: milestone === "inspectedAt" ? "CHECKPOINT" : "STATUS_CHANGED", label, at: value });
  }
  if (seed.status === "CANCELLED") {
    events.push({ type: "STATUS_CHANGED", label: ACTION_DONE_LABELS.CANCEL, at: at(DAY_MS) });
  }
  return events;
}

/** Factures des missions terminées rattachées à un compte (réglées au-delà de 10 jours). */
function buildDemoInvoices(missions: Mission[], now: Date): Invoice[] {
  const billable = missions
    .filter((mission) => mission.status === "COMPLETED" && mission.progress.completedAt)
    .filter((mission) => mission.ownership.businessAccountId || mission.ownership.personalCustomerId)
    .sort((a, b) => (a.progress.completedAt! < b.progress.completedAt! ? -1 : 1));
  const counters = new Map<number, number>();
  return billable.map((mission) => {
    const issued = new Date(mission.progress.completedAt!);
    const year = issued.getUTCFullYear();
    const next = (counters.get(year) ?? 0) + 1;
    counters.set(year, next);
    const ageDays = (now.getTime() - issued.getTime()) / DAY_MS;
    const dueAt = addDays(issued.toISOString().slice(0, 10), 30);
    const paid = ageDays > 10;
    return {
      id: randomUUID(),
      number: `FA-${year}-${String(next).padStart(4, "0")}`,
      missionId: mission.id,
      businessAccountId: mission.ownership.businessAccountId,
      personalCustomerId: mission.ownership.personalCustomerId,
      status: paid ? "PAID" : "ISSUED",
      issuedAt: issued.toISOString(),
      dueAt: new Date(`${dueAt}T00:00:00.000Z`).toISOString(),
      paidAt: paid ? new Date(issued.getTime() + 8 * DAY_MS).toISOString() : null,
      amountHT: mission.pricing.totals.ht,
      vatAmount: mission.pricing.totals.vat,
      amountTTC: mission.pricing.totals.ttc,
    };
  });
}

export interface DemoSeedReport {
  missions: number;
  invoices: number;
}

/**
 * Réinjecte le jeu de démonstration : annuaire (comptes, rôles, plans,
 * convoyeurs), missions et factures. Les données réelles sont conservées.
 * Les trajets utilisent toujours les valeurs simulées.
 */
export async function seedDemoDataset(repositories: Repositories, now: Date = new Date()): Promise<DemoSeedReport> {
  const missions = new MissionService(
    repositories,
    new SimulationService(new RoutingService(new MockRoutingProvider())),
  );
  const directory = buildDemoDirectory();
  await repositories.demo.clearDemoData();
  await repositories.demo.writeDirectory(directory);

  const seeds = buildDemoMissions(now)
    .map((seed) => ({ seed, createdAt: createdAtOf(seed, now) }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const created: Mission[] = [];
  for (const { seed, createdAt } of seeds) {
    const driver = seed.driverProfileId
      ? (directory.drivers.find((candidate) => candidate.id === seed.driverProfileId) ?? null)
      : null;
    const driverName = driver ? personName(driver) : null;
    created.push(
      await missions.createFromRequest(
        seed.request,
        { customer: seed.customer, vehicle: seed.vehicle, contacts: seed.contacts, notes: seed.notes },
        {
          status: seed.status,
          isDemo: true,
          progress: seed.progress,
          now: createdAt,
          ownership: seed.ownership,
          assignment:
            driver && driverName
              ? {
                  driverProfileId: driver.id,
                  driverName,
                  status: "ACCEPTED",
                  assignedAt: new Date(createdAt.getTime() + DAY_MS).toISOString(),
                }
              : null,
          createdLabel:
            seed.ownership.channel === "BACKOFFICE" ? "Mission créée par Naera" : "Commande passée en ligne",
          extraEvents: historyEvents(seed, createdAt, driverName),
        },
      ),
    );
  }

  const invoices = buildDemoInvoices(created, now);
  await repositories.demo.writeInvoices(invoices);
  await repositories.demo.markVersion(DEMO_DATASET_VERSION);
  return { missions: created.length, invoices: invoices.length };
}

export { DEMO_DATASET_VERSION };
