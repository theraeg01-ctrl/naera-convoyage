import { simulateMission } from "@/services/use-cases";
import { jsonResult, readJson } from "@/utils/api";

/** POST /api/v1/simulations — corps : MissionRequest. */
export async function POST(request: Request) {
  return jsonResult(await simulateMission(await readJson(request)));
}
