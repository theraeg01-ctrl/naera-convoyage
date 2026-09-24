import type { NextRequest } from "next/server";
import { getPlacesService } from "@/services/container";
import { withActor } from "@/utils/api";

/** GET /api/v1/places?q=lil — autocomplétion d'adresses (utilisateurs connectés). */
export async function GET(request: NextRequest) {
  return withActor(async () => {
    const query = request.nextUrl.searchParams.get("q")?.slice(0, 100) ?? "";
    const service = getPlacesService();
    return Response.json({ data: service.suggest(query), source: service.source });
  });
}
