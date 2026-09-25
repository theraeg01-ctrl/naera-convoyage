import { placeOrder } from "@/services/portals/orders";
import { jsonResult, readJson, withActor } from "@/utils/api";

/**
 * POST /api/v1/orders — commande client ou pro. Corps : adresses, date,
 * heure, véhicule, options, contacts. Tarif recalculé par le serveur ;
 * rattachement déduit de la session.
 */
export async function POST(request: Request) {
  return withActor(async (actor) => jsonResult(await placeOrder(actor, await readJson(request)), 201));
}
