"use server";

import { redirect } from "next/navigation";
import { PORTAL_HOME, portalOf } from "@/core/access/actor";
import { endSession, startDemoSession } from "@/services/auth/session";

/** Connexion de démonstration : le profil choisi est revérifié côté serveur. */
export async function selectPersonaAction(formData: FormData): Promise<void> {
  const key = formData.get("persona");
  const actor = typeof key === "string" ? await startDemoSession(key) : null;
  redirect(actor ? PORTAL_HOME[portalOf(actor)] : "/?erreur=profil");
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
