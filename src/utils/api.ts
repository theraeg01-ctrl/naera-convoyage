import "server-only";
import type { Actor } from "@/core/access/actor";
import { AccessDeniedError } from "@/core/access/permissions";
import { getActor } from "@/services/auth/session";
import { logTechnicalError } from "@/services/logger";
import type { UseCaseResult } from "@/services/result";

const STATUS_BY_CODE: Record<string, number> = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_ACTION: 409,
  ROUTE_REQUIRED: 422,
};

/** Réponse JSON homogène pour l'API v1 : { data } ou { error: { code, message } }. */
export function jsonResult<T>(result: UseCaseResult<T>, successStatus = 200): Response {
  if (result.ok) return Response.json({ data: result.data }, { status: successStatus });
  return Response.json(
    { error: { code: result.code, message: result.message, fieldErrors: result.fieldErrors } },
    { status: STATUS_BY_CODE[result.code] ?? 500 },
  );
}

export function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * Toute route de l'API passe par ici : 401 sans session, 403/404 si un
 * service refuse l'accès. Même session que le web ; une application mobile
 * utilisera le même point d'entrée (getActor) avec un jeton Bearer.
 */
export async function withActor(handler: (actor: Actor) => Promise<Response>): Promise<Response> {
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Connecte-toi pour continuer.");
  try {
    return await handler(actor);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      if (error.reason === "NOT_FOUND") return jsonError(404, "NOT_FOUND", "Élément introuvable.");
      return jsonError(403, "FORBIDDEN", "Accès refusé.");
    }
    logTechnicalError("API", error);
    return jsonError(500, "UNEXPECTED", "Une erreur est survenue. Réessaie dans un instant.");
  }
}
