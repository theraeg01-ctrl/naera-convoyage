"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MISSION_ACTIONS } from "@/core/mission/progress";
import { getActor } from "@/services/auth/session";
import { performDriverAction } from "@/services/portals/driver-portal";
import type { UseCaseResult } from "@/services/result";

const actionSchema = z.enum(MISSION_ACTIONS);

/** Étape terrain validée par le convoyeur affecté. */
export async function driverStepAction(id: string, action: string): Promise<UseCaseResult<{ id: string }>> {
  const parsed = actionSchema.safeParse(action);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "Action inconnue." };
  const result = await performDriverAction(await getActor(), id, parsed.data);
  if (result.ok) revalidatePath("/driver", "layout");
  return result;
}
