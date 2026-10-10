import type { AppData, FocusSession, Goal, Settings, Subject, Task, TimerMode } from '../types';
import { createInitialData, createTimer } from '../lib/storage';
import * as T from '../lib/timer';

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status'> & { status?: Task['status'] };
export type GoalInput = Omit<Goal, 'id' | 'createdAt'>;
export type SubjectInput = Pick<Subject, 'name' | 'color'>;

export type Action =
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'subject/add'; subject: Subject }
  | { type: 'subject/update'; id: string; patch: SubjectInput }
  | { type: 'subject/delete'; id: string; moveTo: string | null }
  | { type: 'task/add'; task: Task }
  | { type: 'task/update'; id: string; patch: Partial<TaskInput> }
  | { type: 'task/delete'; id: string }
  | { type: 'task/toggle'; id: string; now: string }
  | { type: 'goal/add'; goal: Goal }
  | { type: 'goal/update'; id: string; patch: GoalInput }
  | { type: 'goal/delete'; id: string }
  | { type: 'goal/celebrate'; id: string; periodKey: string }
  | { type: 'timer/start'; now: number }
  | { type: 'timer/pause'; now: number }
  | { type: 'timer/reset' }
  | { type: 'timer/complete'; now: number }
  | { type: 'timer/skip'; now: number }
  | { type: 'timer/mode'; mode: TimerMode; now: number }
  | { type: 'timer/task'; taskId: string | null }
  | { type: 'data/replace'; data: AppData }
  | { type: 'data/reset' };

function subjectOfTask(state: AppData, taskId: string | null): string | null {
  if (!taskId) return null;
  return state.tasks.find((t) => t.id === taskId)?.subjectId ?? null;
}

/** Añade la sesión solo si su id (= periodId) no existe: impide dobles registros. */
function addSession(state: AppData, session: FocusSession): FocusSession[] {
  if (state.sessions.some((s) => s.id === session.id)) return state.sessions;
  return [...state.sessions, session];
}

/**
 * Cierra el período actual de forma anticipada (saltar o cambiar de modo).
 * Si era de concentración y lleva al menos 1 minuto efectivo, se registra como
 * tiempo estudiado (sesión no completada).
 */
function closeEarly(state: AppData, now: number): FocusSession[] {
  const t = state.timer;
  if (t.mode !== 'focus' || t.startedAt === null) return state.sessions;
  const elapsed = T.elapsedSec(t, now);
  if (elapsed < T.MIN_PARTIAL_SEC) return state.sessions;
  return addSession(state, T.buildSession(t, elapsed, now, false, subjectOfTask(state, t.taskId)));
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'settings/update': {
      const settings = { ...state.settings, ...action.patch };
      // Si el período actual no se ha empezado, adopta la nueva duración.
      const timer = T.isPristine(state.timer)
        ? T.newPeriod(state.timer.mode, settings, state.timer, state.timer.cycleCount)
        : state.timer;
      return { ...state, settings, timer };
    }

    case 'subject/add':
      return { ...state, subjects: [...state.subjects, action.subject] };
    case 'subject/update':
      return {
        ...state,
        subjects: state.subjects.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };
    case 'subject/delete': {
      const { id, moveTo } = action;
      const target = moveTo && moveTo !== id && state.subjects.some((s) => s.id === moveTo) ? moveTo : null;
      return {
        ...state,
        subjects: state.subjects.filter((s) => s.id !== id),
        tasks: state.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: target } : t)),
        sessions: state.sessions.map((s) => (s.subjectId === id ? { ...s, subjectId: target } : s)),
        goals: state.goals.map((g) => (g.subjectId === id ? { ...g, subjectId: target } : g)),
      };
    }

    case 'task/add':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'task/update':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.id) return t;
          const next = { ...t, ...action.patch };
          if (next.status !== t.status) next.completedAt = next.status === 'completed' ? new Date().toISOString() : null;
          return next;
        }),
      };
    case 'task/delete':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        timer: state.timer.taskId === action.id ? { ...state.timer, taskId: null } : state.timer,
      };
    case 'task/toggle':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? t.status === 'pending'
              ? { ...t, status: 'completed', completedAt: action.now }
              : { ...t, status: 'pending', completedAt: null }
            : t,
        ),
      };

    case 'goal/add':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'goal/update':
      return { ...state, goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) };
    case 'goal/delete': {
      const celebrated = { ...state.celebrated };
      delete celebrated[action.id];
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id), celebrated };
    }
    case 'goal/celebrate':
      return { ...state, celebrated: { ...state.celebrated, [action.id]: action.periodKey } };

    case 'timer/start':
      return { ...state, timer: T.start(state.timer, action.now) };
    case 'timer/pause':
      return { ...state, timer: T.pause(state.timer, action.now) };
    case 'timer/reset':
      return { ...state, timer: T.reset(state.timer, state.settings) };
    case 'timer/complete': {
      const t = state.timer;
      if (!T.isExpired(t, action.now)) return state;
      const endedAt = t.endAt ?? action.now;
      const sessions =
        t.mode === 'focus'
          ? addSession(state, T.buildSession(t, t.durationSec, endedAt, true, subjectOfTask(state, t.taskId)))
          : state.sessions;
      return { ...state, sessions, timer: T.nextPeriod(t, state.settings, t.mode === 'focus') };
    }
    case 'timer/skip':
      return {
        ...state,
        sessions: closeEarly(state, action.now),
        timer: T.nextPeriod(state.timer, state.settings, false),
      };
    case 'timer/mode': {
      if (action.mode === state.timer.mode && T.isPristine(state.timer)) return state;
      const cycle = action.mode === 'focus' && state.timer.mode === 'long' ? 0 : state.timer.cycleCount;
      return {
        ...state,
        sessions: closeEarly(state, action.now),
        timer: T.newPeriod(action.mode, state.settings, state.timer, cycle),
      };
    }
    case 'timer/task':
      return { ...state, timer: { ...state.timer, taskId: action.taskId } };

    case 'data/replace':
      // Al importar, el temporizador vuelve a reposo para no arrastrar un reloj ajeno.
      return { ...action.data, timer: createTimer(action.data.settings) };
    case 'data/reset':
      return createInitialData();
  }
}
