import { addDays } from "@/core/shared/calendar";

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const longFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

function utcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** « Aujourd'hui », « Demain », « Hier » ou « jeu. 24 sept. ». */
export function formatMissionDay(date: string, today: string): string {
  if (date === today) return "Aujourd'hui";
  if (date === addDays(today, 1)) return "Demain";
  if (date === addDays(today, -1)) return "Hier";
  return dayFormatter.format(utcDate(date));
}

/** « jeudi 24 septembre ». */
export function formatLongDay(date: string): string {
  return longFormatter.format(utcDate(date));
}

export function formatClock(time: string): string {
  return time.replace(":", " h ");
}

/** Horodatage d'événement (ISO) en heure de Paris. */
export function formatEventTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}
