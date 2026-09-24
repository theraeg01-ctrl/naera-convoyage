import type { GeoPoint, Place } from "@/core/routing/types";
import { CITIES, type City } from "./cities";

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['\u2019`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CITY_INDEX = [...CITIES]
  .map((city) => ({ city, key: normalizeText(city.name) }))
  .sort((a, b) => b.key.length - a.key.length);

const PARIS_ARRONDISSEMENT = /\b75(0\d\d|1[0-1]\d|116)\b/;

function cityByName(text: string): City | undefined {
  const normalized = ` ${normalizeText(text)} `;
  return CITY_INDEX.find(({ key }) => normalized.includes(` ${key} `))?.city;
}

/**
 * Ville d'après le code postal. Un nom de ville cité dans l'adresse n'est
 * retenu que s'il est dans le même département (« avenue de Paris, 76000 Rouen »).
 */
function cityByPostalCode(postalCode: string, named: City | undefined): City | undefined {
  if (PARIS_ARRONDISSEMENT.test(postalCode)) return CITIES.find((city) => city.name === "Paris");
  const department = postalCode.slice(0, 2);
  if (named && named.department === department) return named;
  return CITIES.find((city) => city.postalCode === postalCode) ?? CITIES.find((city) => city.department === department);
}

export function findCityByName(name: string): City | undefined {
  const key = normalizeText(name);
  return CITIES.find((city) => normalizeText(city.name) === key);
}

/** Localise une adresse libre : code postal en priorité, sinon nom de ville reconnu. */
export function resolvePlace(label: string): Place {
  const trimmed = label.trim();
  const named = cityByName(trimmed);
  const postalCode = /\b(\d{5})\b/.exec(trimmed)?.[1];
  const city = postalCode ? (cityByPostalCode(postalCode, named) ?? named) : named;
  if (!city) return { label: trimmed, city: null, postalCode: postalCode ?? null, point: null };
  return {
    label: trimmed,
    city: city.name,
    postalCode: postalCode ?? city.postalCode,
    point: { lat: city.lat, lng: city.lng },
  };
}

export function cityOfPlace(place: Place): City | undefined {
  return place.city ? findCityByName(place.city) : undefined;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance routière estimée : vol d'oiseau × 1,2 ; trajet local ≈ 8 km. */
export function estimateRoadKm(a: GeoPoint, b: GeoPoint): number {
  const straight = haversineKm(a, b);
  if (straight < 3) return 8;
  return Math.round(straight * (straight < 30 ? 1.35 : 1.2));
}

/** Cap (0° = nord) de a vers b. */
export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function samePlace(a: Place, b: Place): boolean {
  if (a.city && b.city) return a.city === b.city;
  return normalizeText(a.label) === normalizeText(b.label);
}

export interface CitySuggestion {
  city: City;
  score: number;
}

/** Recherche tolérante (accents, casse, code postal) pour l'autocomplétion simulée. */
export function searchCities(query: string, limit = 6): City[] {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const digits = /^\d{2,5}$/.test(q);
  return CITIES.map((city) => {
    const name = normalizeText(city.name);
    let score = 0;
    if (digits) score = city.postalCode.startsWith(q) || city.department === q.slice(0, 2) ? 2 : 0;
    else if (name.startsWith(q)) score = 3;
    else if (name.split(" ").some((word) => word.startsWith(q))) score = 2;
    else if (name.includes(q)) score = 1;
    return { city, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name, "fr"))
    .slice(0, limit)
    .map((entry) => entry.city);
}
