import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../settings/defaults";
import { calculateTransportScore, computeBounds, rankTransportOptions } from "../transport/score";
import { LILLE_RETURN_OPTIONS } from "./fixtures";

const weights = DEFAULT_SETTINGS.transport.weights;

describe("calculateTransportScore", () => {
  it("donne 100 à une option parfaite sur tous les critères pondérés", () => {
    const bounds = computeBounds(LILLE_RETURN_OPTIONS);
    const train = LILLE_RETURN_OPTIONS[0];
    expect(calculateTransportScore(train, bounds, { price: 0, duration: 1, connections: 0, simplicity: 0 })).toBe(100);
  });

  it("reste entre 0 et 100", () => {
    const bounds = computeBounds(LILLE_RETURN_OPTIONS);
    for (const option of LILLE_RETURN_OPTIONS) {
      const score = calculateTransportScore(option, bounds, weights.BALANCED);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("renvoie 100 si toutes les pondérations sont nulles (aucun NaN)", () => {
    const bounds = computeBounds(LILLE_RETURN_OPTIONS);
    const score = calculateTransportScore(LILLE_RETURN_OPTIONS[2], bounds, {
      price: 0,
      duration: 0,
      connections: 0,
      simplicity: 0,
    });
    expect(score).toBe(100);
  });
});

describe("rankTransportOptions", () => {
  it("meilleur compromis : le train", () => {
    const ranked = rankTransportOptions(LILLE_RETURN_OPTIONS, "BALANCED", weights);
    expect(ranked[0].option.mode).toBe("TRAIN");
    expect(ranked[0].isRecommended).toBe(true);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("moins cher : les transports en commun", () => {
    const ranked = rankTransportOptions(LILLE_RETURN_OPTIONS, "CHEAPEST", weights);
    expect(ranked[0].option.mode).toBe("PUBLIC_TRANSIT");
    expect(ranked[0].isCheapest).toBe(true);
    expect(ranked.at(-1)?.option.mode).toBe("TAXI");
  });

  it("plus rapide : le train", () => {
    const ranked = rankTransportOptions(LILLE_RETURN_OPTIONS, "FASTEST", weights);
    expect(ranked[0].option.mode).toBe("TRAIN");
    expect(ranked[0].isFastest).toBe(true);
  });

  it("suit les pondérations configurées", () => {
    const priceOnly = { ...weights, BALANCED: { price: 1, duration: 0, connections: 0, simplicity: 0 } };
    expect(rankTransportOptions(LILLE_RETURN_OPTIONS, "BALANCED", priceOnly)[0].option.mode).toBe("PUBLIC_TRANSIT");
  });

  it("gère une liste vide et une option unique", () => {
    expect(rankTransportOptions([], "BALANCED", weights)).toEqual([]);
    const single = rankTransportOptions([LILLE_RETURN_OPTIONS[2]], "BALANCED", weights);
    expect(single[0].score).toBeGreaterThan(0);
    expect(Number.isNaN(single[0].score)).toBe(false);
  });
});
