// Una sola definición de "hoy" para todo el producto (CA-9.3, D-6): el día
// calendario de Argentina, sin importar la zona horaria del proceso (en Vercel
// es UTC; en el navegador, la de la persona).
export const RESTAURANT_TZ = "America/Argentina/Buenos_Aires";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RESTAURANT_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

function zonedParts(ms: number) {
  const out: Record<string, number> = {};
  for (const p of partsFormatter.formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

// Diferencia (ms) entre la hora de pared de Argentina y UTC en ese instante.
function offsetMs(utcMs: number): number {
  const p = zonedParts(utcMs);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - Math.floor(utcMs / 1000) * 1000;
}

// Instante UTC en que es 00:00 del día (y, m, d) de Argentina.
function midnightUtcMs(y: number, m: number, d: number): number {
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMs(guess);
  return guess - offsetMs(first);
}

/** Inicio (inclusive) y fin (exclusivo) del día calendario de hoy en Argentina, en ISO UTC. */
export function todayRangeAR(now: Date = new Date()): { startIso: string; endIso: string } {
  const p = zonedParts(now.getTime());
  const start = midnightUtcMs(p.year, p.month, p.day);
  // Date.UTC normaliza d + 1 (fin de mes, fin de año).
  const nextDay = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  const end = midnightUtcMs(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate());
  return { startIso: new Date(start).toISOString(), endIso: new Date(end).toISOString() };
}

/** true si createdAt (ISO) cae en el día de hoy de Argentina. */
export function isTodayAR(createdAtIso: string, now: Date = new Date()): boolean {
  const t = Date.parse(createdAtIso);
  if (Number.isNaN(t)) return false;
  const { startIso, endIso } = todayRangeAR(now);
  return t >= Date.parse(startIso) && t < Date.parse(endIso);
}
