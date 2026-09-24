import { toCustomerMissionView, toDriverMissionView } from "@/core/access/projections";
import { missionScopeFor } from "@/core/access/scope";
import { AccessDeniedError, can } from "@/core/access/permissions";
import { getMissionService } from "@/services/container";
import { jsonError, withActor } from "@/utils/api";

/** GET /api/v1/missions/:id — 404 si la mission est hors du périmètre de l'acteur. */
export async function GET(_request: Request, ctx: RouteContext<"/api/v1/missions/[id]">) {
  const { id } = await ctx.params;
  return withActor(async (actor) => {
    if (!can(actor, "missions.read")) throw new AccessDeniedError("FORBIDDEN");
    const mission = await (await getMissionService()).get(id, missionScopeFor(actor));
    if (!mission) return jsonError(404, "NOT_FOUND", "Mission introuvable.");
    if (actor.kind === "STAFF") return Response.json({ data: mission });
    const view = actor.kind === "DRIVER" ? toDriverMissionView(mission) : toCustomerMissionView(mission);
    return Response.json({ data: view });
  });
}
