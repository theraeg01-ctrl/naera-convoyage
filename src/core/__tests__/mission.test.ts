import { describe, expect, it } from "vitest";
import { applyMissionAction, fieldStepsView, nextMissionAction } from "../mission/progress";
import { formatMissionReference, nextMissionReference, parseMissionReference } from "../mission/reference";
import { DomainError } from "../shared/errors";

describe("Numérotation NAE-CV", () => {
  it("formate sur 4 chiffres", () => {
    expect(formatMissionReference(2026, 1)).toBe("NAE-CV-2026-0001");
    expect(formatMissionReference(2026, 42)).toBe("NAE-CV-2026-0042");
  });

  it("incrémente automatiquement dans l'année", () => {
    const existing = ["NAE-CV-2026-0001", "NAE-CV-2026-0007", "NAE-CV-2025-0099", "autre"];
    expect(nextMissionReference(existing, 2026)).toBe("NAE-CV-2026-0008");
    expect(nextMissionReference(existing, 2027)).toBe("NAE-CV-2027-0001");
  });

  it("analyse une référence", () => {
    expect(parseMissionReference("NAE-CV-2026-0042")).toEqual({ year: 2026, sequence: 42 });
    expect(parseMissionReference("XYZ")).toBeNull();
  });
});

describe("Progression terrain", () => {
  const now = "2026-09-29T08:00:00.000Z";

  it("enchaîne les actions dans l'ordre", () => {
    let mission = { status: "DRAFT" as const, progress: {} } as Parameters<typeof applyMissionAction>[0];
    const sequence = [
      "CONFIRM",
      "START",
      "CONFIRM_INSPECTION",
      "START_DRIVING",
      "CONFIRM_DELIVERY",
      "COMPLETE",
    ] as const;
    for (const action of sequence) {
      expect(nextMissionAction(mission)?.id).toBe(action);
      const transition = applyMissionAction(mission, action, now);
      mission = { status: transition.status, progress: transition.progress };
    }
    expect(mission.status).toBe("COMPLETED");
    expect(nextMissionAction(mission)).toBeNull();
    expect(fieldStepsView(mission).every((step) => step.state === "done")).toBe(true);
  });

  it("refuse une action hors séquence", () => {
    expect(() => applyMissionAction({ status: "CONFIRMED", progress: {} }, "COMPLETE", now)).toThrow(DomainError);
    expect(() => applyMissionAction({ status: "COMPLETED", progress: {} }, "CANCEL", now)).toThrow(DomainError);
  });

  it("indique l'étape en cours", () => {
    const steps = fieldStepsView({ status: "IN_PROGRESS", progress: { startedAt: now, inspectedAt: now } });
    expect(steps.find((step) => step.state === "current")?.id).toBe("DEPARTURE");
  });
});
