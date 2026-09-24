"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/services/auth/session";
import { confirmQuotedMission, placeOrder, quoteOrder, type CustomerQuoteView } from "@/services/portals/orders";
import type { UseCaseResult } from "@/services/result";

/** Commandes des portails client et professionnel (tarif et rattachement calculés par le serveur). */

export async function quoteOrderAction(input: unknown): Promise<UseCaseResult<CustomerQuoteView>> {
  return quoteOrder(await getActor(), input);
}

export async function placeOrderAction(input: unknown): Promise<UseCaseResult<{ id: string; reference: string }>> {
  const result = await placeOrder(await getActor(), input);
  if (result.ok) {
    revalidatePath("/pro", "layout");
    revalidatePath("/client", "layout");
  }
  return result;
}

export async function confirmQuoteAction(id: string): Promise<UseCaseResult<{ id: string }>> {
  const result = await confirmQuotedMission(await getActor(), id);
  if (result.ok) {
    revalidatePath("/pro", "layout");
    revalidatePath("/client", "layout");
  }
  return result;
}

/** Barre d'action des portails client : seule l'acceptation d'un devis est possible. */
export async function customerMissionAction(id: string, action: string): Promise<UseCaseResult<{ id: string }>> {
  if (action !== "CONFIRM") return { ok: false, code: "FORBIDDEN", message: "Action non disponible." };
  return confirmQuoteAction(id);
}
