import { beforeAll, describe, expect, it } from "vitest";
import { todayInZone } from "@/core/shared/timezone";
import { findInternalFields } from "@/test/internal-fields";
import { json, referenceMissions, request, type PersonaName } from "./support";

/**
 * Frontières de données : les réponses JSON RÉELLEMENT renvoyées aux
 * particuliers, professionnels et convoyeurs ne contiennent aucun champ
 * interne (coût, marge, rentabilité, rémunération, notes internes).
 */

let ids: Awaited<ReturnType<typeof referenceMissions>>;

beforeAll(async () => {
  ids = await referenceMissions();
});

const EXTERNAL: { persona: PersonaName; own: () => string }[] = [
  { persona: "julien", own: () => ids.martin },
  { persona: "lea", own: () => ids.martin },
  { persona: "sophie", own: () => ids.sophie },
  { persona: "marc", own: () => ids.marc },
];

describe("API : aucune donnée interne hors Naera", () => {
  for (const { persona, own } of EXTERNAL) {
    it(`${persona} : liste, détail et profil`, async () => {
      const payloads = await Promise.all([
        json("/api/v1/missions", { as: persona }),
        json(`/api/v1/missions/${own()}`, { as: persona }),
        json("/api/v1/me", { as: persona }),
      ]);
      for (const payload of payloads) expect(findInternalFields(payload)).toEqual([]);
    });
  }

  it("tarif client (devis) : prix de vente uniquement", async () => {
    for (const persona of ["sophie", "julien"] as const) {
      const quote = await json("/api/v1/orders/quote", {
        as: persona,
        method: "POST",
        body: {
          pickupAddress: "12 rue Nationale, 59000 Lille",
          dropoffAddress: "Place des Héros, 62000 Arras",
          date: todayInZone(),
          time: "23:30",
          vehicle: { category: "SEDAN", fuelType: "DIESEL" },
          optionIds: ["PHOTO_REPORT"],
        },
      });
      expect(findInternalFields(quote)).toEqual([]);
    }
  });

  it("contrôle : la vue Naera contient bien coûts et marge (le détecteur fonctionne)", async () => {
    const staff = await json(`/api/v1/missions/${ids.martin}`, { as: "admin" });
    expect(findInternalFields(staff).length).toBeGreaterThan(0);
  });
});

describe("pages : aucune donnée interne dans le HTML ni dans la charge utile RSC", () => {
  const INTERNAL_MARKERS = [
    '\\"costs\\"',
    '"costs"',
    "marginAmount",
    '\\"margin\\"',
    "profitability",
    "internalNotes",
    "hourlyDriverCost",
    "internalCost",
  ];

  const pages: [PersonaName, string, () => string][] = [
    ["julien", "dashboard pro", () => "/pro"],
    ["julien", "missions pro", () => "/pro/missions"],
    ["julien", "détail mission pro", () => `/pro/missions/${ids.martin}`],
    ["julien", "analytics", () => "/pro/analytics"],
    ["julien", "facturation", () => "/pro/billing"],
    ["sophie", "accueil particulier", () => "/client"],
    ["sophie", "suivi commande", () => `/client/missions/${ids.sophie}`],
    ["sophie", "commander", () => "/client/order"],
    ["marc", "missions convoyeur", () => "/driver"],
    ["marc", "fiche mission convoyeur", () => `/driver/missions/${ids.marc}`],
  ];

  for (const [persona, label, path] of pages) {
    it(`${persona} : ${label}`, async () => {
      const response = await request(path(), { as: persona });
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(INTERNAL_MARKERS.filter((marker) => html.includes(marker))).toEqual([]);
      expect(html).not.toMatch(/co[uû]t (interne|réel|convoyeur)|rentabilit[ée]|\bmarge\b/i);
      // Portails clients : on parle de dépenses et de montant facturé, jamais de « coût ».
      expect(html).not.toMatch(/\bco[uû]ts?\b/i);
      expect(html).not.toContain("Marge serrée");
    });
  }
});
