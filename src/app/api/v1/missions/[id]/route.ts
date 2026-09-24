import { getMission } from "@/services/use-cases";
import { jsonError } from "@/utils/api";

/** GET /api/v1/missions/:id */
export async function GET(_request: Request, ctx: RouteContext<"/api/v1/missions/[id]">) {
  const { id } = await ctx.params;
  const mission = await getMission(id);
  return mission ? Response.json({ data: mission }) : jsonError(404, "NOT_FOUND", "Mission introuvable.");
}
