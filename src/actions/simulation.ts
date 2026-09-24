"use server";

import { simulateMission, type SimulationPayload, type UseCaseResult } from "@/services/use-cases";

/** Calcule une simulation depuis l'écran « Nouvelle mission ». */
export async function runSimulationAction(input: unknown): Promise<UseCaseResult<SimulationPayload>> {
  return simulateMission(input);
}
