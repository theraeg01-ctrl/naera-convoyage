import "server-only";
import type { z } from "zod";
import { AccessDeniedError } from "@/core/access/permissions";
import { logTechnicalError } from "./logger";
import { MissionServiceError } from "./mission/mission-service";

/**
 * Résultat des cas d'usage partagés par les Server Actions (web) et l'API
 * REST (future application mobile). Jamais d'erreur technique : le résultat
 * porte un message compréhensible.
 */
export type UseCaseResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export const GENERIC_ERROR = "Une erreur est survenue. Réessaie dans un instant.";

const ACCESS_MESSAGES: Record<AccessDeniedError["reason"], string> = {
  UNAUTHENTICATED: "Connecte-toi pour continuer.",
  FORBIDDEN: "Cette action n'est pas autorisée pour ton profil.",
  NOT_FOUND: "Élément introuvable.",
};

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    errors[key] ??= issue.message;
  }
  return errors;
}

export function invalidInput<T>(error: z.ZodError, message = "Vérifie les champs indiqués."): UseCaseResult<T> {
  return { ok: false, code: "INVALID_INPUT", message, fieldErrors: fieldErrorsOf(error) };
}

export function failure<T>(context: string, error: unknown): UseCaseResult<T> {
  if (error instanceof MissionServiceError) return { ok: false, code: error.code, message: error.userMessage };
  if (error instanceof AccessDeniedError) {
    return { ok: false, code: error.reason, message: ACCESS_MESSAGES[error.reason] };
  }
  logTechnicalError(context, error);
  return { ok: false, code: "UNEXPECTED", message: GENERIC_ERROR };
}

/** Exécute un cas d'usage en convertissant toute erreur en résultat affichable. */
export async function run<T>(context: string, task: () => Promise<T>): Promise<UseCaseResult<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    return failure(context, error);
  }
}

export const ok = <T>(data: T): UseCaseResult<T> => ({ ok: true, data });

/** Variante de run() pour une tâche qui peut elle-même renvoyer un refus (saisie invalide…). */
export async function attempt<T>(context: string, task: () => Promise<UseCaseResult<T>>): Promise<UseCaseResult<T>> {
  try {
    return await task();
  } catch (error) {
    return failure(context, error);
  }
}
