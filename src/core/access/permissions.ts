import type { BusinessRole, StaffRole } from "../accounts/types";
import type { Actor } from "./actor";

/**
 * Permissions fonctionnelles. Le périmètre (quelles missions) est géré à part
 * par l'isolation des données (scope.ts) : « missions.read » pour un
 * professionnel signifie « les missions de SON entreprise ».
 */
export const PERMISSIONS = [
  "missions.read",
  "missions.create",
  "missions.progress",
  "missions.manage",
  "missions.assign",
  "pricing.internal",
  "documents.read",
  "billing.read",
  "analytics.read",
  "team.read",
  "team.manage",
  "accounts.read",
  "drivers.read",
  "finance.read",
  "settings.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const STAFF_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  DISPATCHER: PERMISSIONS.filter((permission) => permission !== "settings.manage" && permission !== "finance.read"),
};

export const BUSINESS_ROLE_PERMISSIONS: Record<BusinessRole, readonly Permission[]> = {
  OWNER: [
    "missions.read",
    "missions.create",
    "documents.read",
    "billing.read",
    "analytics.read",
    "team.read",
    "team.manage",
  ],
  MANAGER: ["missions.read", "missions.create", "documents.read", "billing.read", "analytics.read", "team.read"],
  OPERATOR: ["missions.read", "missions.create", "documents.read"],
  BILLING: ["missions.read", "documents.read", "billing.read", "analytics.read"],
};

const PERSONAL_PERMISSIONS: readonly Permission[] = [
  "missions.read",
  "missions.create",
  "documents.read",
  "billing.read",
];
const DRIVER_PERMISSIONS: readonly Permission[] = ["missions.read", "missions.progress", "documents.read"];

export function permissionsOf(actor: Actor): ReadonlySet<Permission> {
  switch (actor.kind) {
    case "STAFF":
      return new Set(STAFF_PERMISSIONS[actor.staffRole]);
    case "BUSINESS":
      return new Set(BUSINESS_ROLE_PERMISSIONS[actor.role]);
    case "PERSONAL":
      return new Set(PERSONAL_PERMISSIONS);
    case "DRIVER":
      return new Set(DRIVER_PERMISSIONS);
  }
}

export function can(actor: Actor | null, permission: Permission): boolean {
  return actor !== null && permissionsOf(actor).has(permission);
}

/** Levée par les services quand un acteur n'a pas le droit d'effectuer l'opération. */
export class AccessDeniedError extends Error {
  constructor(
    readonly reason: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND",
    message = "Accès refusé",
  ) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export function assertCan(actor: Actor | null, permission: Permission): asserts actor is Actor {
  if (!actor) throw new AccessDeniedError("UNAUTHENTICATED");
  if (!permissionsOf(actor).has(permission))
    throw new AccessDeniedError("FORBIDDEN", `Permission manquante : ${permission}`);
}
