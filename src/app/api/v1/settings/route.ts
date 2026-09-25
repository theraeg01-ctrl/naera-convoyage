import { assertStaff } from "@/services/portals/common";
import { getSettings } from "@/services/settings/settings-service";
import { withActor } from "@/utils/api";

/** GET /api/v1/settings — paramètres de tarification (coûts internes) : personnel Naera uniquement. */
export async function GET() {
  return withActor(async (actor) => {
    assertStaff(actor, "pricing.internal");
    return Response.json({ data: await getSettings() });
  });
}
