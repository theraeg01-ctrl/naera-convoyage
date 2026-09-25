"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MISSION_ACTIONS } from "@/core/mission/progress";
import { getActor } from "@/services/auth/session";
import { assignDriver, performAdminAction } from "@/services/portals/admin-portal";
import { saveMission } from "@/services/use-cases";

/** Actions du back-office Naera. Chaque action revérifie la session et les droits. */

export type MissionActionResult = { ok: true; id: string } | { ok: false; message: string };

const actionSchema = z.enum(MISSION_ACTIONS);

function revalidateAdmin(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/missions");
  if (id) revalidatePath(`/admin/missions/${id}`);
}

export async function saveMissionAction(input: unknown): Promise<MissionActionResult> {
  const result = await saveMission(await getActor(), input);
  if (!result.ok) return { ok: false, message: result.message };
  revalidateAdmin();
  return { ok: true, id: result.data.id };
}

export async function missionStepAction(id: string, action: string): Promise<MissionActionResult> {
  const parsed = actionSchema.safeParse(action);
  if (!parsed.success) return { ok: false, message: "Action inconnue." };
  const result = await performAdminAction(await getActor(), id, parsed.data);
  if (!result.ok) return { ok: false, message: result.message };
  revalidateAdmin(id);
  return { ok: true, id };
}

export async function assignDriverAction(id: string, driverProfileId: string): Promise<MissionActionResult> {
  const result = await assignDriver(await getActor(), id, driverProfileId);
  if (!result.ok) return { ok: false, message: result.message };
  revalidateAdmin(id);
  return { ok: true, id };
}
