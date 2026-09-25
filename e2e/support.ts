import type { ActorContextRef } from "@/core/access/actor";
import { createSessionToken, SESSION_COOKIE } from "@/services/auth/session-token";
import { DEMO_IDS } from "@/services/demo/demo-dataset";

export const E2E_PORT = 3107;
export const BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
export const E2E_SECRET = "e2e-session-secret-not-for-production";

interface Persona {
  userId: string;
  context: ActorContextRef;
}

const U = DEMO_IDS.users;
const M = DEMO_IDS.members;

/** Profils du jeu de démonstration (identifiants fixes). */
export const PERSONAS = {
  admin: { userId: U.admin, context: { kind: "STAFF" } },
  dispatcher: { userId: U.dispatcher, context: { kind: "STAFF" } },
  julien: { userId: U.martinOwner, context: { kind: "BUSINESS", memberId: M.martinOwner } },
  lea: { userId: U.martinOperator, context: { kind: "BUSINESS", memberId: M.martinOperator } },
  nadia: { userId: U.martinBilling, context: { kind: "BUSINESS", memberId: M.martinBilling } },
  thomas: { userId: U.locautoOwner, context: { kind: "BUSINESS", memberId: M.locautoOwner } },
  sophie: { userId: U.sophie, context: { kind: "PERSONAL", personalCustomerId: DEMO_IDS.customers.sophie } },
  marc: { userId: U.driverMarc, context: { kind: "DRIVER", driverProfileId: DEMO_IDS.drivers.marc } },
} satisfies Record<string, Persona>;

export type PersonaName = keyof typeof PERSONAS;

export function sessionCookie(name: PersonaName): string {
  const persona = PERSONAS[name];
  return `${SESSION_COOKIE}=${createSessionToken({ ...persona, iat: Date.now() }, E2E_SECRET)}`;
}

export async function request(
  path: string,
  options: { as?: PersonaName; method?: string; body?: unknown } = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.as) headers.cookie = sessionCookie(options.as);
  if (options.body !== undefined) headers["content-type"] = "application/json";
  return fetch(BASE_URL + path, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: "manual",
  });
}

export async function statusOf(path: string, options: Parameters<typeof request>[1] = {}): Promise<number> {
  const response = await request(path, options);
  await response.arrayBuffer();
  return response.status;
}

export async function json<T = unknown>(path: string, options: Parameters<typeof request>[1] = {}): Promise<T> {
  const response = await request(path, options);
  if (!response.ok) throw new Error(`${path} → ${response.status}`);
  return (await response.json()) as T;
}

/** Missions de référence, lues avec le profil Naera. */
export interface MissionRow {
  id: string;
  status: string;
  ownership: { businessAccountId: string | null; personalCustomerId: string | null };
  assignment: { driverProfileId: string } | null;
}

export async function referenceMissions() {
  const { data } = await json<{ data: MissionRow[] }>("/api/v1/missions", { as: "admin" });
  const pick = (predicate: (mission: MissionRow) => boolean, label: string) => {
    const mission = data.find(predicate);
    if (!mission) throw new Error(`Mission de référence introuvable : ${label}`);
    return mission.id;
  };
  const B = DEMO_IDS.businesses;
  return {
    // Mission Garage Martin en cours, avec une note interne témoin.
    martin: pick(
      (m) =>
        m.ownership.businessAccountId === B.garageMartin &&
        m.status === "IN_PROGRESS" &&
        m.assignment?.driverProfileId === DEMO_IDS.drivers.marc,
      "Garage Martin",
    ),
    locauto: pick((m) => m.ownership.businessAccountId === B.locAutoNord, "Loc'Auto Nord"),
    sophie: pick((m) => m.ownership.personalCustomerId === DEMO_IDS.customers.sophie, "Sophie"),
    marc: pick((m) => m.assignment?.driverProfileId === DEMO_IDS.drivers.marc && m.status === "IN_PROGRESS", "Marc"),
    otherDriver: pick(
      (m) => m.assignment !== null && m.assignment.driverProfileId !== DEMO_IDS.drivers.marc,
      "autre convoyeur",
    ),
  };
}
