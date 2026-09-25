import { quoteOrder } from "@/services/portals/orders";
import { jsonResult, readJson, withActor } from "@/utils/api";

/** POST /api/v1/orders/quote — tarif client (prix de vente uniquement), même corps que /orders. */
export async function POST(request: Request) {
  return withActor(async (actor) => jsonResult(await quoteOrder(actor, await readJson(request))));
}
