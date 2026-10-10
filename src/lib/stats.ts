import type { DateKey, FocusSession, Goal, Priority, Subject, Task } from '../types';
import { startOfWeek, toDateKey, todayKey, weekKeys } from './dates';
import { percent } from './format';

/** Día al que se atribuye una sesión: el de su finalización. */
export const sessionDay = (s: FocusSession): DateKey => toDateKey(new Date(s.endedAt));

export const sessionsInDays = (sessions: FocusSession[], days: DateKey[]) => {
  const set = new Set(days);
  return sessions.filter((s) => set.has(sessionDay(s)));
};

export const sumMinutes = (sessions: FocusSession[]) =>
  sessions.reduce((acc, s) => acc + s.durationSec, 0) / 60;

export const countCompleted = (sessions: FocusSession[]) => sessions.filter((s) => s.completed).length;

export function minutesByDay(sessions: FocusSession[], days: DateKey[]): Record<DateKey, number> {
  const out: Record<DateKey, number> = Object.fromEntries(days.map((d) => [d, 0]));
  for (const s of sessions) {
    const k = sessionDay(s);
    if (k in out) out[k] += s.durationSec / 60;
  }
  return out;
}

export function todayMinutes(sessions: FocusSession[]): number {
  return sumMinutes(sessionsInDays(sessions, [todayKey()]));
}

export function completedTasksInDays(tasks: Task[], days: DateKey[]): number {
  const set = new Set(days);
  return tasks.filter((t) => t.completedAt && set.has(toDateKey(new Date(t.completedAt)))).length;
}

export interface SubjectSlice {
  id: string;
  name: string;
  color: string;
  minutes: number;
}

export function subjectDistribution(sessions: FocusSession[], subjects: Subject[]): SubjectSlice[] {
  const byId = new Map<string, number>();
  for (const s of sessions) {
    const key = s.subjectId ?? '__none';
    byId.set(key, (byId.get(key) ?? 0) + s.durationSec / 60);
  }
  const slices: SubjectSlice[] = [];
  for (const [id, minutes] of byId) {
    const subj = subjects.find((x) => x.id === id);
    slices.push({
      id,
      name: subj?.name ?? 'Sin asignatura',
      color: subj?.color ?? '#64748b',
      minutes,
    });
  }
  return slices.sort((a, b) => b.minutes - a.minutes);
}

// ---------- Tareas ----------

export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export function isOverdue(t: Task, today = todayKey()): boolean {
  return t.status === 'pending' && t.dueDate < today;
}

/** Pendientes ordenadas por fecha límite y después por prioridad. */
export function upcomingTasks(tasks: Task[], limit = 5): Task[] {
  return tasks
    .filter((t) => t.status === 'pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority])
    .slice(0, limit);
}

// ---------- Objetivos ----------

export function goalPeriodKey(goal: Pick<Goal, 'period'>, now = new Date()): string {
  return goal.period === 'day' ? toDateKey(now) : `W${toDateKey(startOfWeek(now))}`;
}

export interface GoalProgress {
  value: number;
  target: number;
  pct: number;
  done: boolean;
  periodKey: string;
}

export function goalProgress(goal: Goal, sessions: FocusSession[], tasks: Task[], now = new Date()): GoalProgress {
  const days = goal.period === 'day' ? [toDateKey(now)] : weekKeys(now);
  let value: number;
  if (goal.metric === 'tasks') {
    value = completedTasksInDays(tasks, days);
  } else {
    const relevant = sessionsInDays(sessions, days).filter((s) => !goal.subjectId || s.subjectId === goal.subjectId);
    value = Math.floor(sumMinutes(relevant));
  }
  return {
    value,
    target: goal.target,
    pct: percent(value, goal.target),
    done: value >= goal.target,
    periodKey: goalPeriodKey(goal, now),
  };
}

export function describeGoal(goal: Goal, subjects: Subject[]): string {
  if (goal.title.trim()) return goal.title.trim();
  const when = goal.period === 'day' ? 'al día' : 'a la semana';
  if (goal.metric === 'tasks') return `Completar ${goal.target} ${goal.target === 1 ? 'tarea' : 'tareas'} ${when}`;
  const subj = goal.subjectId ? subjects.find((s) => s.id === goal.subjectId)?.name : null;
  return `Estudiar ${goal.target} min${subj ? ` de ${subj}` : ''} ${when}`;
}

/** Racha de días consecutivos (terminando hoy o ayer) con al menos una sesión. */
export function currentStreak(sessions: FocusSession[]): number {
  const days = new Set(sessions.map(sessionDay));
  const d = new Date();
  if (!days.has(toDateKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(toDateKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
