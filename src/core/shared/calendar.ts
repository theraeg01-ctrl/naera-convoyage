import { DomainError } from "./errors";

/**
 * Dates « locales » au format ISO court (YYYY-MM-DD) et heures (HH:mm).
 * Les missions sont planifiées en heure de Paris : on manipule des chaînes
 * pour éviter tout décalage de fuseau entre serveur et navigateur.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

export function parseLocalDate(date: string): LocalDateParts {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new DomainError(`Date invalide : ${date}`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new DomainError(`Date invalide : ${date}`);
  }
  return { year, month, day };
}

export function isValidLocalDate(date: string): boolean {
  try {
    parseLocalDate(date);
    return true;
  } catch {
    return false;
  }
}

export function parseTime(time: string): { hours: number; minutes: number } {
  const match = TIME_PATTERN.exec(time);
  if (!match) throw new DomainError(`Heure invalide : ${time}`);
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function isValidTime(time: string): boolean {
  return TIME_PATTERN.test(time);
}

export function timeToMinutes(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

/** Ajoute des minutes à une heure « HH:mm » ; renvoie l'heure et le décalage en jours. */
export function addMinutesToTime(time: string, minutes: number): { time: string; dayOffset: number } {
  const total = timeToMinutes(time) + Math.round(minutes);
  const dayOffset = Math.floor(total / 1440);
  const inDay = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(inDay / 60)).padStart(2, "0");
  const mm = String(inDay % 60).padStart(2, "0");
  return { time: `${hh}:${mm}`, dayOffset };
}

function toUtcDate(date: string): Date {
  const { year, month, day } = parseLocalDate(date);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const value = toUtcDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return formatUtcDate(value);
}

/** 0 = dimanche … 6 = samedi. */
export function dayOfWeek(date: string): number {
  return toUtcDate(date).getUTCDay();
}

export function isWeekend(date: string): boolean {
  const day = dayOfWeek(date);
  return day === 0 || day === 6;
}

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Jours fériés nationaux en France métropolitaine. */
export function frenchPublicHolidays(year: number): Map<string, string> {
  const easter = easterSunday(year);
  const fixed: Array<[string, string]> = [
    ["01-01", "Jour de l'an"],
    ["05-01", "Fête du Travail"],
    ["05-08", "Victoire 1945"],
    ["07-14", "Fête nationale"],
    ["08-15", "Assomption"],
    ["11-01", "Toussaint"],
    ["11-11", "Armistice 1918"],
    ["12-25", "Noël"],
  ];
  const holidays = new Map<string, string>(fixed.map(([md, label]) => [`${year}-${md}`, label]));
  holidays.set(addDays(easter, 1), "Lundi de Pâques");
  holidays.set(addDays(easter, 39), "Ascension");
  holidays.set(addDays(easter, 50), "Lundi de Pentecôte");
  return holidays;
}

export function publicHolidayName(date: string): string | null {
  const { year } = parseLocalDate(date);
  return frenchPublicHolidays(year).get(date) ?? null;
}
