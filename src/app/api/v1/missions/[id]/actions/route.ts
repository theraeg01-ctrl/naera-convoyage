import { z } from "zod";
import { MISSION_ACTIONS } from "@/core/mission/progress";
import { performAdminAction } from "@/services/portals/admin-portal";
import { performDriverAction } from "@/services/portals/driver-portal";
import { confirmQuotedMission } from "@/services/portals/orders";
import { jsonError, jsonResult, readJson, withActor } from "@/utils/api";

const bodySchema = z.object({ action: z.enum(MISSION_ACTIONS) });

/**
 * POST /api/v1/missions/:id/actions — corps : { action }.
 * Naera : pilotage complet ; convoyeur : étapes terrain ; client : CONFIRM d'un devis.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/missions/[id]/actions">) {
  const { id } = await ctx.params;
  return withActor(async (actor) => {
    const body = bodySchema.safeParse(await readJson(request));
    if (!body.success) return jsonError(400, "INVALID_INPUT", "Action inconnue.");
    const { action } = body.data;
    switch (actor.kind) {
      case "STAFF":
        return jsonResult(await performAdminAction(actor, id, action));
      case "DRIVER":
        return jsonResult(await performDriverAction(actor, id, action));
      default:
        if (action !== "CONFIRM") return jsonError(403, "FORBIDDEN", "Accès refusé.");
        return jsonResult(await confirmQuotedMission(actor, id));
    }
  });
}
