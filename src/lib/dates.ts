import type { DateKey } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

/** Convierte YYYY-MM-DD a Date local (00:00). */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateKey(fromDateKey(value)) === value;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Semana de lunes a domingo. */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  return startOfDay(addDays(d, -day));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** Diferencia en días naturales (b - a). */
export function diffDays(a: DateKey, b: DateKey): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Lista de claves de los últimos n días, terminando hoy. */
export function lastNDays(n: number, end = new Date()): DateKey[] {
  const out: DateKey[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(toDateKey(addDays(end, -i)));
  return out;
}

export function weekKeys(ref = new Date()): DateKey[] {
  const start = startOfWeek(ref);
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)));
}

const LOCALE = 'es-ES';

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatLongDate(d: Date): string {
  return capitalize(
    d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  );
}

export function formatMonthYear(d: Date): string {
  return capitalize(d.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }));
}

export function formatShortDate(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
}

export function formatWeekdayShort(key: DateKey): string {
  return capitalize(fromDateKey(key).toLocaleDateString(LOCALE, { weekday: 'short' }).replace('.', ''));
}

export function formatDayHeading(key: DateKey): string {
  return capitalize(
    fromDateKey(key).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }),
  );
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

/** Texto relativo para fechas límite: "Hoy", "Mañana", "Hace 2 días"... */
export function relativeDue(key: DateKey, today = todayKey()): string {
  const d = diffDays(today, key);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  if (d < 0) return `Hace ${-d} días`;
  if (d < 7) return capitalize(fromDateKey(key).toLocaleDateString(LOCALE, { weekday: 'long' }));
  return formatShortDate(key);
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
