"use server";

import { revalidatePath } from "next/cache";
import { performMissionAction, saveMission } from "@/services/use-cases";

export type MissionActionResult = { ok: true; id: string } | { ok: false; message: string };

export async function saveMissionAction(input: unknown): Promise<MissionActionResult> {
  const result = await saveMission(input);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/");
  revalidatePath("/missions");
  return { ok: true, id: result.data.id };
}

export async function missionStepAction(id: string, action: string): Promise<MissionActionResult> {
  const result = await performMissionAction(id, action);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/");
  revalidatePath("/missions");
  revalidatePath(`/missions/${id}`);
  return { ok: true, id };
}
