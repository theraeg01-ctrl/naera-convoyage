import { performMissionAction } from "@/services/use-cases";
import { jsonResult, readJson } from "@/utils/api";

/** POST /api/v1/missions/:id/actions — corps : { action: "CONFIRM" | "START" | … }. */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/missions/[id]/actions">) {
  const { id } = await ctx.params;
  const body = (await readJson(request)) as { action?: unknown } | undefined;
  return jsonResult(await performMissionAction(id, body?.action));
}
