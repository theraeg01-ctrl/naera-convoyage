import { describe, expect, it } from "vitest";
import type { CustomerMissionView } from "../access/projections";
import { recentActivity } from "../mission/activity";

function view(id: string, events: { label: string; at: string }[]): CustomerMissionView {
  return {
    id,
    reference: `NAE-CV-2026-${id}`,
    pickup: { label: "12 rue Nationale, 59000 Lille", city: "Lille" },
    dropoff: { label: "Place des Héros, 62000 Arras", city: "Arras" },
    events: events.map((event, index) => ({ id: `${id}-${index}`, ...event })),
  } as CustomerMissionView;
}

describe("activité récente (dashboard pro)", () => {
  const now = new Date("2026-09-25T12:00:00.000Z");
  const missions = [
    view("0001", [
      { label: "Commande passée en ligne", at: "2026-09-20T08:00:00.000Z" },
      { label: "Convoyage démarré", at: "2026-09-25T10:00:00.000Z" },
    ]),
    view("0002", [
      { label: "Mission confirmée", at: "2026-09-24T09:00:00.000Z" },
      { label: "Événement futur", at: "2026-09-26T09:00:00.000Z" },
    ]),
  ];

  it("du plus récent au plus ancien, sans événement futur", () => {
    const items = recentActivity(missions, now);
    expect(items.map((item) => item.label)).toEqual([
      "Convoyage démarré",
      "Mission confirmée",
      "Commande passée en ligne",
    ]);
    expect(items[0]).toMatchObject({ missionId: "0001", route: "Lille → Arras" });
  });

  it("limité au nombre demandé", () => {
    expect(recentActivity(missions, now, 2)).toHaveLength(2);
  });
});
