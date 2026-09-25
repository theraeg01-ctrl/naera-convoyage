import { portalOf } from "@/core/access/actor";
import { permissionsOf } from "@/core/access/permissions";
import { buildNavigation } from "@/core/navigation/portal-navigation";
import { getProContext } from "@/services/portals/pro-portal";
import { withActor } from "@/utils/api";

/** GET /api/v1/me — acteur courant, droits et navigation de son portail. */
export async function GET() {
  return withActor(async (actor) => {
    const account = actor.kind === "BUSINESS" ? (await getProContext(actor)).account : null;
    const portal = portalOf(actor);
    return Response.json({
      data: {
        actor,
        portal,
        permissions: [...permissionsOf(actor)],
        features: account?.entitlements.features ?? [],
        navigation: buildNavigation(portal, actor, account),
      },
    });
  });
}
