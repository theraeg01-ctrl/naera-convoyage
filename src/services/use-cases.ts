import "server-only";
import type { Actor } from "@/core/access/actor";
import type { Mission } from "@/core/mission/types";
import type { AppSettings } from "@/core/settings/types";
import { missionRequestSchema } from "@/core/simulation/schema";
import type { MissionRequest, SimulationResult } from "@/core/simulation/types";
import { getMissionService, getSimulationService } from "./container";
import { assertStaff } from "./portals/common";
import { attempt, invalidInput, ok, run, type UseCaseResult } from "./result";
import { getSettings } from "./settings/settings-service";

export type { UseCaseResult };

/**
 * Cas d'usage du back-office Naera (simulation détaillée, création de
 * mission avec corrections manuelles). La simulation renvoie les coûts et
 * les paramètres internes : elle est réservée au personnel Naera.
 */

export interface SimulationPayload {
  simulation: SimulationResult;
  settings: AppSettings;
}

export async function simulateMission(actor: Actor | null, input: unknown): Promise<UseCaseResult<SimulationPayload>> {
  return attempt("simulateMission", async () => {
    assertStaff(actor, "pricing.internal");
    const parsed = missionRequestSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const settings = await getSettings();
    const simulation = await getSimulationService().run(parsed.data as MissionRequest, settings);
    return ok({ simulation, settings });
  });
}

export async function saveMission(actor: Actor | null, input: unknown): Promise<UseCaseResult<Mission>> {
  return run("saveMission", async () => {
    assertStaff(actor, "missions.manage");
    const service = await getMissionService();
    return service.createFromSimulation(input, {
      ownership: {
        channel: "BACKOFFICE",
        businessAccountId: null,
        personalCustomerId: null,
        createdByUserId: actor.userId,
        customerReference: null,
      },
    });
  });
}
