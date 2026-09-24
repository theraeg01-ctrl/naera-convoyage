import { addMinutesToTime, timeToMinutes } from "@/core/shared/calendar";

/** Créneaux simulés : départs à h12 et h42. */
const SLOT_MINUTES = [12, 42];

function toTime(totalMinutes: number): string {
  return addMinutesToTime("00:00", totalMinutes).time;
}

export function nextSlotAfter(time: string, bufferMin: number): string {
  const earliest = timeToMinutes(time) + bufferMin;
  const hour = Math.floor(earliest / 60);
  for (let h = hour; h <= hour + 1; h += 1) {
    for (const minute of SLOT_MINUTES) {
      const candidate = h * 60 + minute;
      if (candidate >= earliest) return toTime(candidate);
    }
  }
  return toTime(earliest);
}

export function previousSlotBefore(time: string, bufferMin: number): string {
  const latest = timeToMinutes(time) - bufferMin;
  const hour = Math.floor(latest / 60);
  for (let h = hour; h >= hour - 1; h -= 1) {
    for (const minute of [...SLOT_MINUTES].reverse()) {
      const candidate = h * 60 + minute;
      if (candidate <= latest) return toTime(candidate);
    }
  }
  return toTime(latest);
}

/** Horaires de départ/arrivée d'une option planifiée. */
export function scheduleLeg(
  direction: "ACCESS" | "RETURN",
  anchorTime: string,
  durationMin: number,
  bufferMin = 20,
): { departureTime: string; arrivalTime: string } {
  if (direction === "RETURN") {
    const departureTime = nextSlotAfter(anchorTime, bufferMin);
    return { departureTime, arrivalTime: addMinutesToTime(departureTime, durationMin).time };
  }
  const arrivalTarget = addMinutesToTime(anchorTime, -bufferMin).time;
  const departureTime = previousSlotBefore(arrivalTarget, durationMin);
  return { departureTime, arrivalTime: addMinutesToTime(departureTime, durationMin).time };
}
