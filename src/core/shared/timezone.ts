import { parseLocalDate, parseTime } from "./calendar";

/** Fuseau de référence des missions. */
export const MISSION_TIME_ZONE = "Europe/Paris";

function zonedParts(epochMs: number, timeZone: string): Record<string, number> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(epochMs))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts;
}

function offsetMinutes(epochMs: number, timeZone: string): number {
  const p = zonedParts(epochMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - epochMs) / 60_000);
}

/** Convertit une date/heure locale (Paris) en instant ISO UTC. */
export function zonedLocalToUtcIso(date: string, time: string, timeZone = MISSION_TIME_ZONE): string {
  const { year, month, day } = parseLocalDate(date);
  const { hours, minutes } = parseTime(time);
  const guess = Date.UTC(year, month - 1, day, hours, minutes);
  const firstOffset = offsetMinutes(guess, timeZone);
  let result = guess - firstOffset * 60_000;
  const secondOffset = offsetMinutes(result, timeZone);
  if (secondOffset !== firstOffset) result = guess - secondOffset * 60_000;
  return new Date(result).toISOString();
}

/** Date du jour (YYYY-MM-DD) dans le fuseau des missions. */
export function todayInZone(now: Date = new Date(), timeZone = MISSION_TIME_ZONE): string {
  const p = zonedParts(now.getTime(), timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Heure courante (HH:mm) dans le fuseau des missions. */
export function nowTimeInZone(now: Date = new Date(), timeZone = MISSION_TIME_ZONE): string {
  const p = zonedParts(now.getTime(), timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}
