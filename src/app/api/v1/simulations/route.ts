import { simulateMission } from "@/services/use-cases";
import { jsonResult, readJson, withActor } from "@/utils/api";

/** POST /api/v1/simulations — back-office Naera : simulation détaillée (coûts internes). */
export async function POST(request: Request) {
  return withActor(async (actor) => jsonResult(await simulateMission(actor, await readJson(request))));
}
