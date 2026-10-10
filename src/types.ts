export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed';

/** Fecha local en formato YYYY-MM-DD. */
export type DateKey = string;

export interface Subject {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subjectId: string | null;
  dueDate: DateKey;
  priority: Priority;
  status: TaskStatus;
  estimatedMinutes: number | null;
  createdAt: string;
  completedAt: string | null;
}

export type GoalMetric = 'minutes' | 'tasks';
export type GoalPeriod = 'day' | 'week';

export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  /** Solo para objetivos de minutos: limita el cómputo a una asignatura. */
  subjectId: string | null;
  createdAt: string;
}

/**
 * Registro de un período de concentración.
 * - completed = true: el período llegó a 0 (sesión completada).
 * - completed = false: el usuario lo saltó tras al menos 1 minuto efectivo;
 *   cuenta como tiempo estudiado pero no como sesión completada.
 */
export interface FocusSession {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  plannedSec: number;
  completed: boolean;
  taskId: string | null;
  subjectId: string | null;
}

export type TimerMode = 'focus' | 'short' | 'long';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  /** Identificador único del período actual; evita registrarlo dos veces. */
  periodId: string;
  mode: TimerMode;
  status: TimerStatus;
  /** Duración total del período, fijada al iniciarlo. */
  durationSec: number;
  /** Marca de tiempo (ms) en la que terminará, solo si está en marcha. */
  endAt: number | null;
  /** Milisegundos restantes cuando está pausado o detenido. */
  remainingMs: number;
  /** Primera vez que se inició este período. */
  startedAt: string | null;
  /** Sesiones de concentración completadas en el ciclo actual. */
  cycleCount: number;
  taskId: string | null;
}

export type Theme = 'dark' | 'light';

export interface Settings {
  userName: string;
  theme: Theme;
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakEvery: number;
  dailyGoalMin: number;
  notifications: boolean;
  sound: boolean;
}

export interface AppData {
  schemaVersion: number;
  settings: Settings;
  subjects: Subject[];
  tasks: Task[];
  goals: Goal[];
  sessions: FocusSession[];
  timer: TimerState;
  /** goalId -> clave del período en el que ya se celebró. */
  celebrated: Record<string, string>;
}
