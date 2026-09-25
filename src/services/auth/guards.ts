import "server-only";
import { forbidden, notFound, unauthorized } from "next/navigation";
import { portalOf, type Actor, type Portal } from "@/core/access/actor";
import { AccessDeniedError, can, type Permission } from "@/core/access/permissions";
import { hasFeature, type Entitlements, type FeatureKey } from "@/core/plans/features";
import { getActor } from "./session";

/**
 * POINT D'AUTORISATION des pages (Server Components). Chaque page protégée
 * appelle ces gardes : un layout ne suffit pas (il ne se ré-exécute pas à
 * chaque navigation). Les services de portail revérifient les droits.
 * Ne jamais entourer ces appels d'un try/catch : ils interrompent le rendu.
 */

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) unauthorized();
  return actor;
}

/** L'acteur doit appartenir au portail demandé (un pro n'ouvre pas /admin). */
export async function requirePortal<P extends Portal>(portal: P): Promise<Actor> {
  const actor = await requireActor();
  if (portalOf(actor) !== portal) forbidden();
  return actor;
}

export function requirePermission(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) forbidden();
}

/** Traduit les refus des services en pages 401 / 403 / 404. */
export async function withAccess<T>(load: () => Promise<T>): Promise<T> {
  let denied: AccessDeniedError | null = null;
  try {
    return await load();
  } catch (error) {
    if (!(error instanceof AccessDeniedError)) throw error;
    denied = error;
  }
  if (denied.reason === "UNAUTHENTICATED") unauthorized();
  if (denied.reason === "NOT_FOUND") notFound();
  forbidden();
}

/** Fonctionnalité non incluse dans l'offre du compte : 403 (jamais un simple masquage). */
export function requireFeature(account: { entitlements: Entitlements }, feature: FeatureKey): void {
  if (!hasFeature(account, feature)) forbidden();
}
