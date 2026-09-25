import type { Mission } from "../mission/types";
import type { Actor } from "./actor";

/**
 * Périmètre de données d'un acteur (isolation multi-tenant). Les dépôts
 * l'appliquent dans la requête elle-même : une mission hors périmètre
 * n'est jamais chargée, même avec un identifiant deviné.
 */
export type MissionScope =
  | { kind: "ALL" }
  | { kind: "BUSINESS"; businessAccountId: string }
  | { kind: "PERSONAL"; personalCustomerId: string }
  | { kind: "DRIVER"; driverProfileId: string };

export function missionScopeFor(actor: Actor): MissionScope {
  switch (actor.kind) {
    case "STAFF":
      return { kind: "ALL" };
    case "BUSINESS":
      return { kind: "BUSINESS", businessAccountId: actor.businessAccountId };
    case "PERSONAL":
      return { kind: "PERSONAL", personalCustomerId: actor.personalCustomerId };
    case "DRIVER":
      return { kind: "DRIVER", driverProfileId: actor.driverProfileId };
  }
}

/** Contrôle en mémoire (stockage local) et défense en profondeur après chargement. */
export function isInScope(mission: Pick<Mission, "ownership" | "assignment">, scope: MissionScope): boolean {
  switch (scope.kind) {
    case "ALL":
      return true;
    case "BUSINESS":
      return mission.ownership.businessAccountId === scope.businessAccountId;
    case "PERSONAL":
      return mission.ownership.personalCustomerId === scope.personalCustomerId;
    case "DRIVER":
      return (
        mission.assignment !== null &&
        mission.assignment.driverProfileId === scope.driverProfileId &&
        mission.assignment.status !== "DECLINED" &&
        mission.assignment.status !== "CANCELLED"
      );
  }
}
