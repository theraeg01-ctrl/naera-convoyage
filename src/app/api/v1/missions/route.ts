import { toCustomerMissionView, toDriverMissionView } from "@/core/access/projections";
import { missionScopeFor } from "@/core/access/scope";
import { AccessDeniedError, can } from "@/core/access/permissions";
import { getMissionService } from "@/services/container";
import { listAdminMissions } from "@/services/portals/admin-portal";
import { saveMission } from "@/services/use-cases";
import { jsonResult, readJson, withActor } from "@/utils/api";

/**
 * GET /api/v1/missions — missions du périmètre de l'acteur, dans la vue de
 * son portail (complète pour Naera, client pour pro/particulier, terrain
 * pour le convoyeur).
 */
export async function GET() {
  return withActor(async (actor) => {
    if (actor.kind === "STAFF") return Response.json({ data: await listAdminMissions(actor) });
    if (!can(actor, "missions.read")) throw new AccessDeniedError("FORBIDDEN");
    const missions = await (await getMissionService()).list(missionScopeFor(actor));
    const data = actor.kind === "DRIVER" ? missions.map(toDriverMissionView) : missions.map(toCustomerMissionView);
    return Response.json({ data });
  });
}

/** POST /api/v1/missions — back-office : { simulation, selections, customer, vehicle, notes }. */
export async function POST(request: Request) {
  return withActor(async (actor) => jsonResult(await saveMission(actor, await readJson(request)), 201));
}
