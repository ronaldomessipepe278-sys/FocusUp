import type { FocusSession, Settings, TimerMode, TimerState } from '../types';
import { uid } from './format';

/**
 * Motor del Pomodoro basado en marcas de tiempo.
 * El tiempo restante nunca se descuenta "por tic": se calcula siempre como
 * endAt - ahora, de modo que pestañas en segundo plano, cambios de sección o
 * recargas no desajustan el reloj.
 */

/** Tiempo mínimo para registrar un período de concentración saltado. */
export const MIN_PARTIAL_SEC = 60;

export const MODE_LABEL: Record<TimerMode, string> = {
  focus: 'Concentración',
  short: 'Descanso corto',
  long: 'Descanso largo',
};

export function durationFor(mode: TimerMode, s: Settings): number {
  const min = mode === 'focus' ? s.focusMin : mode === 'short' ? s.shortBreakMin : s.longBreakMin;
  return min * 60;
}

export function remainingMs(t: TimerState, now: number): number {
  if (t.status === 'running' && t.endAt !== null) return Math.max(0, t.endAt - now);
  return t.remainingMs;
}

export function elapsedSec(t: TimerState, now: number): number {
  return Math.max(0, Math.round((t.durationSec * 1000 - remainingMs(t, now)) / 1000));
}

export function isExpired(t: TimerState, now: number): boolean {
  return t.status === 'running' && t.endAt !== null && t.endAt <= now;
}

/** Período "virgen": todavía no se ha iniciado. */
export function isPristine(t: TimerState): boolean {
  return t.status === 'idle' && t.startedAt === null;
}

export function newPeriod(mode: TimerMode, s: Settings, prev: TimerState, cycleCount: number): TimerState {
  const durationSec = durationFor(mode, s);
  return {
    periodId: uid(),
    mode,
    status: 'idle',
    durationSec,
    endAt: null,
    remainingMs: durationSec * 1000,
    startedAt: null,
    cycleCount,
    taskId: prev.taskId,
  };
}

export function start(t: TimerState, now: number): TimerState {
  if (t.status === 'running') return t;
  return {
    ...t,
    status: 'running',
    endAt: now + t.remainingMs,
    startedAt: t.startedAt ?? new Date(now).toISOString(),
  };
}

export function pause(t: TimerState, now: number): TimerState {
  if (t.status !== 'running') return t;
  return { ...t, status: 'paused', remainingMs: remainingMs(t, now), endAt: null };
}

export function reset(t: TimerState, s: Settings): TimerState {
  return newPeriod(t.mode, s, t, t.cycleCount);
}

/** Período siguiente tras terminar (o saltar) el actual. */
export function nextPeriod(t: TimerState, s: Settings, focusCompleted: boolean): TimerState {
  if (t.mode === 'focus') {
    const count = t.cycleCount + (focusCompleted ? 1 : 0);
    const isLong = focusCompleted && count % s.longBreakEvery === 0;
    return newPeriod(isLong ? 'long' : 'short', s, t, count);
  }
  return newPeriod('focus', s, t, t.mode === 'long' ? 0 : t.cycleCount);
}

export function buildSession(
  t: TimerState,
  durationSec: number,
  endedAtMs: number,
  completed: boolean,
  subjectId: string | null,
): FocusSession {
  return {
    id: t.periodId,
    startedAt: t.startedAt ?? new Date(endedAtMs - durationSec * 1000).toISOString(),
    endedAt: new Date(endedAtMs).toISOString(),
    durationSec,
    plannedSec: t.durationSec,
    completed,
    taskId: t.taskId,
    subjectId,
  };
}
