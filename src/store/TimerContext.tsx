import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Task, TimerMode, TimerState } from '../types';
import { useStore } from './AppStore';
import { useToast } from '../components/ui/Toast';
import * as T from '../lib/timer';
import { formatClock } from '../lib/format';
import { playChime, showNotification } from '../lib/notify';

interface TimerApi {
  timer: TimerState;
  remainingMs: number;
  /** 0 → 1 */
  progress: number;
  linkedTask: Task | null;
  /** Número de la sesión de concentración dentro del ciclo (1..longBreakEvery). */
  sessionNumber: number;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  setMode: (mode: TimerMode) => void;
  setTask: (taskId: string | null) => void;
}

const TimerContext = createContext<TimerApi | null>(null);

/**
 * Mantiene el reloj vivo en toda la aplicación (no solo en la página del
 * temporizador). Solo esta rama del árbol se repinta con cada tic.
 */
export function TimerProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { timer, settings, tasks } = state;
  const [now, setNow] = useState(() => Date.now());
  const handledPeriod = useRef<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Tic visual mientras está en marcha.
  useEffect(() => {
    if (timer.status !== 'running') return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timer.status, timer.periodId]);

  // Detección de fin de período (también si la pestaña estuvo cerrada).
  useEffect(() => {
    if (!T.isExpired(timer, now)) return;
    if (handledPeriod.current === timer.periodId) return;
    handledPeriod.current = timer.periodId;

    const wasFocus = timer.mode === 'focus';
    dispatch({ type: 'timer/complete', now: Date.now() });

    const s = settingsRef.current;
    const title = wasFocus ? 'Sesión de concentración completada' : 'Descanso terminado';
    const body = wasFocus ? `Has sumado ${Math.round(timer.durationSec / 60)} min de estudio. Toca descansar.` : 'Cuando quieras, empieza la siguiente sesión.';
    toast(wasFocus ? 'success' : 'info', title, body);
    if (s.sound) playChime();
    if (s.notifications) showNotification(title, body);
  }, [now, timer, dispatch, toast]);

  // Comprobación inmediata al cargar por si el período terminó con la página cerrada.
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const remaining = T.remainingMs(timer, now);

  // Muestra el tiempo en el título de la pestaña.
  useEffect(() => {
    if (timer.status === 'idle' && timer.startedAt === null) {
      document.title = 'FocusUp';
      return;
    }
    const label = timer.mode === 'focus' ? 'Concentración' : 'Descanso';
    document.title = `${formatClock(remaining)} · ${label}${timer.status === 'paused' ? ' (pausa)' : ''} — FocusUp`;
  }, [remaining, timer.mode, timer.status, timer.startedAt]);

  const start = useCallback(() => dispatch({ type: 'timer/start', now: Date.now() }), [dispatch]);
  const pause = useCallback(() => dispatch({ type: 'timer/pause', now: Date.now() }), [dispatch]);
  const toggle = useCallback(
    () => dispatch({ type: timer.status === 'running' ? 'timer/pause' : 'timer/start', now: Date.now() }),
    [dispatch, timer.status],
  );
  const reset = useCallback(() => dispatch({ type: 'timer/reset' }), [dispatch]);
  const skip = useCallback(() => dispatch({ type: 'timer/skip', now: Date.now() }), [dispatch]);
  const setMode = useCallback((mode: TimerMode) => dispatch({ type: 'timer/mode', mode, now: Date.now() }), [dispatch]);
  const setTask = useCallback((taskId: string | null) => dispatch({ type: 'timer/task', taskId }), [dispatch]);

  const linkedTask = useMemo(() => tasks.find((t) => t.id === timer.taskId) ?? null, [tasks, timer.taskId]);

  const value: TimerApi = {
    timer,
    remainingMs: remaining,
    progress: timer.durationSec > 0 ? 1 - remaining / (timer.durationSec * 1000) : 0,
    linkedTask,
    sessionNumber: (timer.cycleCount % settings.longBreakEvery) + 1,
    start,
    pause,
    toggle,
    reset,
    skip,
    setMode,
    setTask,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerApi {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer debe usarse dentro de TimerProvider');
  return ctx;
}
