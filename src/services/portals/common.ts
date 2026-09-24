import "server-only";
import type { Actor } from "@/core/access/actor";
import { AccessDeniedError, assertCan, type Permission } from "@/core/access/permissions";
import { todayInZone } from "@/core/shared/timezone";
import { getAppRepositories, getMissionService } from "../container";

/**
 * Contrôles communs aux services de portail. Chaque fonction exportée par
 * un portail commence par l'un de ces contrôles : c'est la barrière
 * d'autorisation côté serveur, indépendante de l'interface.
 */

export type StaffActor = Extract<Actor, { kind: "STAFF" }>;
export type BusinessActor = Extract<Actor, { kind: "BUSINESS" }>;
export type PersonalActor = Extract<Actor, { kind: "PERSONAL" }>;
export type DriverActor = Extract<Actor, { kind: "DRIVER" }>;
export type CustomerActor = BusinessActor | PersonalActor;

function assertKind<K extends Actor["kind"]>(
  actor: Actor | null,
  kinds: readonly K[],
  permission: Permission,
): asserts actor is Extract<Actor, { kind: K }> {
  assertCan(actor, permission);
  if (!(kinds as readonly string[]).includes(actor.kind)) throw new AccessDeniedError("FORBIDDEN");
}

export function assertStaff(actor: Actor | null, permission: Permission): asserts actor is StaffActor {
  assertKind(actor, ["STAFF"], permission);
}

export function assertBusiness(actor: Actor | null, permission: Permission): asserts actor is BusinessActor {
  assertKind(actor, ["BUSINESS"], permission);
}

export function assertPersonal(actor: Actor | null, permission: Permission): asserts actor is PersonalActor {
  assertKind(actor, ["PERSONAL"], permission);
}

export function assertCustomer(actor: Actor | null, permission: Permission): asserts actor is CustomerActor {
  assertKind(actor, ["BUSINESS", "PERSONAL"], permission);
}

export function assertDriver(actor: Actor | null, permission: Permission): asserts actor is DriverActor {
  assertKind(actor, ["DRIVER"], permission);
}

export const today = () => todayInZone(new Date());

export { getAppRepositories, getMissionService };
