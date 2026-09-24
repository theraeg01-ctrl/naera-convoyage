import { listMissions, saveMission } from "@/services/use-cases";
import { jsonResult, readJson } from "@/utils/api";

/** GET /api/v1/missions — liste des missions. */
export async function GET() {
  return Response.json({ data: await listMissions() });
}

/** POST /api/v1/missions — corps : { simulation, selections, customer, vehicle, notes }. */
export async function POST(request: Request) {
  return jsonResult(await saveMission(await readJson(request)), 201);
}
