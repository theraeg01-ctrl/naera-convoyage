import type { BusinessRole, StaffRole } from "../accounts/types";

/** Les quatre portails : chacun a son interface, sa navigation et ses données. */
export const PORTALS = ["admin", "pro", "client", "driver"] as const;
export type Portal = (typeof PORTALS)[number];

export const PORTAL_LABELS: Record<Portal, string> = {
  admin: "Naera",
  pro: "Espace professionnel",
  client: "Espace client",
  driver: "Espace convoyeur",
};

export const PORTAL_HOME: Record<Portal, string> = {
  admin: "/admin",
  pro: "/pro",
  client: "/client",
  driver: "/driver",
};

/**
 * Acteur authentifié dans un contexte donné. Un même utilisateur peut avoir
 * plusieurs contextes (membre de deux entreprises, particulier…) : la session
 * porte le contexte actif, toujours revalidé côté serveur.
 */
export type Actor =
  | { kind: "STAFF"; userId: string; name: string; staffRole: StaffRole }
  | {
      kind: "BUSINESS";
      userId: string;
      name: string;
      memberId: string;
      businessAccountId: string;
      businessName: string;
      role: BusinessRole;
    }
  | { kind: "PERSONAL"; userId: string; name: string; personalCustomerId: string }
  | { kind: "DRIVER"; userId: string; name: string; driverProfileId: string };

export type ActorKind = Actor["kind"];

const PORTAL_BY_KIND: Record<ActorKind, Portal> = {
  STAFF: "admin",
  BUSINESS: "pro",
  PERSONAL: "client",
  DRIVER: "driver",
};

export function portalOf(actor: Actor): Portal {
  return PORTAL_BY_KIND[actor.kind];
}

/** Contexte d'un acteur, sérialisable dans une session (ex. « business:<memberId> »). */
export type ActorContextRef =
  | { kind: "STAFF" }
  | { kind: "BUSINESS"; memberId: string }
  | { kind: "PERSONAL"; personalCustomerId: string }
  | { kind: "DRIVER"; driverProfileId: string };

export function contextRefOf(actor: Actor): ActorContextRef {
  switch (actor.kind) {
    case "STAFF":
      return { kind: "STAFF" };
    case "BUSINESS":
      return { kind: "BUSINESS", memberId: actor.memberId };
    case "PERSONAL":
      return { kind: "PERSONAL", personalCustomerId: actor.personalCustomerId };
    case "DRIVER":
      return { kind: "DRIVER", driverProfileId: actor.driverProfileId };
  }
}
