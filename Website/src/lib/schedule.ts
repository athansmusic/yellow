/**
 * Weekly schedule in America/New_York. Edit here only.
 * dow: 0=Sun … 4=Thu, 5=Fri. Times are 24h local NY.
 */
export const LIVESTREAM = {
  label: "Live stream",
  url: "https://www.twitch.tv/athansmusic", // ← where the stream happens
  dow: 4,
  startHour: 21,
  startMinute: 0,
  durationMinutes: 120,
};

export const EPISODE = { label: "New episode", dow: 5, startHour: 21, startMinute: 0, durationMinutes: 0 };
export const POSTMORTEM = { label: "New Postmortem", dow: 2, startHour: 21, startMinute: 0, durationMinutes: 0 };

type Slot = { dow: number; startHour: number; startMinute: number; durationMinutes: number };

function nyParts(d: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}

function nyOffsetMin(at: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT-4";
  const m = f.match(/GMT([+-]\d+)/);
  return (m ? Number(m[1]) : -4) * 60;
}

/** Instant of the next occurrence of a slot's start (or its current occurrence if now is inside the slot). */
export function nextStart(slot: Slot, now = new Date()): Date {
  const p = nyParts(now);
  const nowMin = p.h * 60 + p.mi + p.s / 60;
  const startMin = slot.startHour * 60 + slot.startMinute;
  let daysAhead = (slot.dow - p.dow + 7) % 7;
  if (daysAhead === 0 && nowMin >= startMin + slot.durationMinutes) daysAhead = 7;
  const guess = new Date(Date.UTC(p.y, p.mo - 1, p.d + daysAhead, slot.startHour, slot.startMinute, 0));
  return new Date(guess.getTime() - nyOffsetMin(guess) * 60_000);
}

export function isLive(slot: Slot, now = new Date()) {
  const start = nextStart(slot, now).getTime();
  return now.getTime() >= start && now.getTime() < start + slot.durationMinutes * 60_000;
}

export function fmtNY(d: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", hour: "numeric", minute: "2-digit" }).format(d).replace(":00", "") + " ET";
}
