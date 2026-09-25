"use server";

import { getActor } from "@/services/auth/session";
import { simulateMission, type SimulationPayload, type UseCaseResult } from "@/services/use-cases";

/** Calcule une simulation depuis l'écran « Nouvelle mission » (back-office Naera). */
export async function runSimulationAction(input: unknown): Promise<UseCaseResult<SimulationPayload>> {
  return simulateMission(await getActor(), input);
}
