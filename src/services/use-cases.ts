import "server-only";
import { z } from "zod";
import { MISSION_ACTIONS } from "@/core/mission/progress";
import type { Mission } from "@/core/mission/types";
import type { AppSettings } from "@/core/settings/types";
import { missionRequestSchema } from "@/core/simulation/schema";
import type { MissionRequest, SimulationResult } from "@/core/simulation/types";
import { getMissionService, getSimulationService } from "./container";
import { logTechnicalError } from "./logger";
import { MissionServiceError } from "./mission/mission-service";
import { getSettings } from "./settings/settings-service";

/**
 * Cas d'usage partagés par les Server Actions (web) et l'API REST
 * (future application mobile). Ils ne lèvent jamais d'erreur technique :
 * le résultat porte un message compréhensible.
 */
export type UseCaseResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

const GENERIC_ERROR = "Une erreur est survenue. Réessaie dans un instant.";

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    errors[key] ??= issue.message;
  }
  return errors;
}

function failure<T>(context: string, error: unknown): UseCaseResult<T> {
  if (error instanceof MissionServiceError) return { ok: false, code: error.code, message: error.userMessage };
  logTechnicalError(context, error);
  return { ok: false, code: "UNEXPECTED", message: GENERIC_ERROR };
}

export interface SimulationPayload {
  simulation: SimulationResult;
  settings: AppSettings;
}

export async function simulateMission(input: unknown): Promise<UseCaseResult<SimulationPayload>> {
  const parsed = missionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Vérifie les champs indiqués.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  try {
    const settings = await getSettings();
    const simulation = await getSimulationService().run(parsed.data as MissionRequest, settings);
    return { ok: true, data: { simulation, settings } };
  } catch (error) {
    return failure("simulateMission", error);
  }
}

export async function saveMission(input: unknown): Promise<UseCaseResult<Mission>> {
  try {
    const service = await getMissionService();
    return { ok: true, data: await service.createFromSimulation(input) };
  } catch (error) {
    return failure("saveMission", error);
  }
}

const actionSchema = z.enum(MISSION_ACTIONS);

export async function performMissionAction(id: string, action: unknown): Promise<UseCaseResult<Mission>> {
  const parsed = actionSchema.safeParse(action);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "Action inconnue." };
  try {
    const service = await getMissionService();
    return { ok: true, data: await service.applyAction(id, parsed.data) };
  } catch (error) {
    return failure("performMissionAction", error);
  }
}

export async function listMissions(): Promise<Mission[]> {
  return (await getMissionService()).list();
}

export async function getMission(id: string): Promise<Mission | null> {
  if (!z.uuid().safeParse(id).success) return null;
  return (await getMissionService()).get(id);
}
