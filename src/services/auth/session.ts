import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { contextRefOf, type Actor } from "@/core/access/actor";
import { serverConfig } from "../config";
import { getAppRepositories } from "../container";
import { logTechnicalError } from "../logger";
import {
  contextKey,
  createSessionToken,
  parseContextKey,
  readSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "./session-token";

/**
 * POINT D'AUTHENTIFICATION.
 *
 * Aujourd'hui : session de démonstration (profil choisi sur l'écran
 * d'accueil), cookie httpOnly signé. Demain : fournisseur d'identité
 * (OIDC, magic link…) ; seul ce module change — il devra associer
 * l'identité externe à User.authSubject puis produire la même session.
 *
 * Dans tous les cas, le contexte est revalidé en base à chaque requête :
 * un membre désactivé ou retiré d'une entreprise perd l'accès immédiatement.
 */

export { SESSION_COOKIE };

const globalForWarning = globalThis as unknown as { naeraDemoAuthWarned?: boolean };

/**
 * Secret de session si la connexion de démonstration est autorisée, sinon
 * null (voir resolveDemoAuth : jamais active en production sans
 * NAERA_DEMO_AUTH="true" explicite).
 */
function demoSessionSecret(): string | null {
  const { enabled, secret } = serverConfig.demoAuth;
  if (!enabled || !secret) return null;
  if (process.env.NODE_ENV === "production" && !globalForWarning.naeraDemoAuthWarned) {
    globalForWarning.naeraDemoAuthWarned = true;
    logTechnicalError("Sécurité", new Error("Connexion de démonstration ACTIVE en production (NAERA_DEMO_AUTH=true)"));
  }
  return secret;
}

export function isDemoAuthEnabled(): boolean {
  return demoSessionSecret() !== null;
}

/** Acteur de la requête courante (mémoïsé le temps du rendu), ou null. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const secret = demoSessionSecret();
  if (!secret) return null;
  const store = await cookies();
  const payload = readSessionToken(store.get(SESSION_COOKIE)?.value, secret);
  if (!payload) return null;
  const repositories = await getAppRepositories();
  return repositories.directory.resolveActor(payload.userId, payload.context);
});

/** Profils proposés par l'écran de démonstration (identifiant = « userId|contexte »). */
export interface DemoPersona {
  key: string;
  actor: Actor;
}

export async function listDemoPersonas(): Promise<DemoPersona[]> {
  if (!isDemoAuthEnabled()) return [];
  const repositories = await getAppRepositories();
  const actors = await repositories.directory.listActors();
  return actors.map((actor) => ({ key: `${actor.userId}|${contextKey(contextRefOf(actor))}`, actor }));
}

/** Ouvre une session de démonstration ; le profil est revérifié dans l'annuaire. */
export async function startDemoSession(personaKey: string): Promise<Actor | null> {
  const secret = demoSessionSecret();
  if (!secret) return null;
  const [userId, key] = personaKey.split("|");
  const context = key ? parseContextKey(key) : null;
  if (!userId || !context) return null;
  const repositories = await getAppRepositories();
  const actor = await repositories.directory.resolveActor(userId, context);
  if (!actor) return null;
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken({ userId, context, iat: Date.now() }, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return actor;
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
