import { createHmac, timingSafeEqual } from "node:crypto";
import type { ActorContextRef } from "@/core/access/actor";

/**
 * Jeton de session signé (HMAC-SHA256) : identifiant utilisateur + contexte
 * actif. Il ne contient aucun droit : l'appartenance et le rôle sont relus
 * en base à chaque requête (resolveActor).
 */
export interface SessionPayload {
  userId: string;
  context: ActorContextRef;
  /** Émission (ms). */
  iat: number;
}

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 3600;

/** Nom du cookie de session (httpOnly). */
export const SESSION_COOKIE = "naera_session";

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Contexte ⇄ texte (« staff », « business:<id> », « personal:<id> », « driver:<id> »). */
export function contextKey(context: ActorContextRef): string {
  switch (context.kind) {
    case "STAFF":
      return "staff";
    case "BUSINESS":
      return `business:${context.memberId}`;
    case "PERSONAL":
      return `personal:${context.personalCustomerId}`;
    case "DRIVER":
      return `driver:${context.driverProfileId}`;
  }
}

const ID_PATTERN = /^[0-9a-f-]{36}$/i;

export function parseContextKey(key: string): ActorContextRef | null {
  if (key === "staff") return { kind: "STAFF" };
  const [kind, id] = key.split(":");
  if (!id || !ID_PATTERN.test(id)) return null;
  switch (kind) {
    case "business":
      return { kind: "BUSINESS", memberId: id };
    case "personal":
      return { kind: "PERSONAL", personalCustomerId: id };
    case "driver":
      return { kind: "DRIVER", driverProfileId: id };
    default:
      return null;
  }
}

export function createSessionToken(payload: SessionPayload, secret: string): string {
  const body = encode(JSON.stringify({ u: payload.userId, c: contextKey(payload.context), t: payload.iat }));
  return `${body}.${sign(body, secret)}`;
}

/** Vérifie signature, format et expiration ; renvoie null au moindre doute. */
export function readSessionToken(token: string | undefined, secret: string, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const raw = JSON.parse(decode(body)) as { u?: unknown; c?: unknown; t?: unknown };
    if (typeof raw.u !== "string" || !ID_PATTERN.test(raw.u)) return null;
    if (typeof raw.c !== "string" || typeof raw.t !== "number") return null;
    if (raw.t > now + 60_000 || now - raw.t > SESSION_MAX_AGE_SECONDS * 1000) return null;
    const context = parseContextKey(raw.c);
    return context ? { userId: raw.u, context, iat: raw.t } : null;
  } catch {
    return null;
  }
}
