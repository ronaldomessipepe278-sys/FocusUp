import type {
  AppData,
  FocusSession,
  Goal,
  Settings,
  Subject,
  Task,
  TimerState,
} from '../types';
import { isValidDateKey } from './dates';
import { uid } from './format';

/**
 * Módulo de persistencia local.
 *
 * Todos los datos viven bajo una sola clave versionada. Al cargar se validan
 * elemento a elemento: lo que no se puede interpretar se descarta sin tirar el
 * resto. Si el JSON completo está corrupto, se guarda una copia del texto
 * original en otra clave antes de empezar de cero, para no perder nada.
 */

export const STORAGE_KEY = 'focusup.data';
export const SCHEMA_VERSION = 1;

export const SUBJECT_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#eab308',
  '#f97316', '#f43f5e', '#ec4899', '#a855f7', '#64748b', '#14b8a6',
];

export const DEFAULT_SETTINGS: Settings = {
  userName: '',
  theme: 'dark',
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  dailyGoalMin: 90,
  notifications: false,
  sound: true,
};

export const LIMITS = {
  focusMin: [1, 180],
  shortBreakMin: [1, 60],
  longBreakMin: [1, 90],
  longBreakEvery: [2, 10],
  dailyGoalMin: [0, 960],
} as const;

function defaultSubjects(): Subject[] {
  const now = new Date().toISOString();
  return [
    ['Matemáticas', '#3b82f6'],
    ['Filosofía', '#a855f7'],
    ['Lengua Castellana', '#f43f5e'],
    ['Inglés', '#10b981'],
    ['Física', '#f97316'],
    ['Historia', '#eab308'],
  ].map(([name, color]) => ({ id: uid(), name, color, createdAt: now }));
}

export function createTimer(settings: Settings, cycleCount = 0, taskId: string | null = null): TimerState {
  return {
    periodId: uid(),
    mode: 'focus',
    status: 'idle',
    durationSec: settings.focusMin * 60,
    endAt: null,
    remainingMs: settings.focusMin * 60_000,
    startedAt: null,
    cycleCount,
    taskId,
  };
}

export function createInitialData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    subjects: defaultSubjects(),
    tasks: [],
    goals: [],
    sessions: [],
    timer: createTimer(DEFAULT_SETTINGS),
    celebrated: {},
  };
}

// ---------- Validación ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isIso = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));
const clamp = (n: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, Math.round(n)));
const isHex = (v: unknown): v is string => isStr(v) && /^#[0-9a-fA-F]{6}$/.test(v);

function parseSettings(raw: unknown): Settings {
  const s = isObj(raw) ? raw : {};
  const num = (key: keyof typeof LIMITS) =>
    isNum(s[key]) ? clamp(s[key] as number, LIMITS[key]) : DEFAULT_SETTINGS[key];
  return {
    userName: isStr(s.userName) ? s.userName.slice(0, 40) : DEFAULT_SETTINGS.userName,
    theme: s.theme === 'light' ? 'light' : 'dark',
    focusMin: num('focusMin'),
    shortBreakMin: num('shortBreakMin'),
    longBreakMin: num('longBreakMin'),
    longBreakEvery: num('longBreakEvery'),
    dailyGoalMin: num('dailyGoalMin'),
    notifications: s.notifications === true,
    sound: s.sound !== false,
  };
}

function parseSubject(v: unknown): Subject | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name) || !v.name.trim()) return null;
  return {
    id: v.id,
    name: v.name.trim().slice(0, 40),
    color: isHex(v.color) ? v.color : SUBJECT_COLORS[0],
    createdAt: isIso(v.createdAt) ? v.createdAt : new Date().toISOString(),
  };
}

function parseTask(v: unknown, subjectIds: Set<string>): Task | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.title) || !v.title.trim() || !isValidDateKey(v.dueDate)) {
    return null;
  }
  const status = v.status === 'completed' ? 'completed' : 'pending';
  return {
    id: v.id,
    title: v.title.trim().slice(0, 120),
    description: isStr(v.description) ? v.description.slice(0, 1000) : '',
    subjectId: isStr(v.subjectId) && subjectIds.has(v.subjectId) ? v.subjectId : null,
    dueDate: v.dueDate,
    priority: v.priority === 'low' || v.priority === 'high' ? v.priority : 'medium',
    status,
    estimatedMinutes: isNum(v.estimatedMinutes) && v.estimatedMinutes > 0 ? Math.round(v.estimatedMinutes) : null,
    createdAt: isIso(v.createdAt) ? v.createdAt : new Date().toISOString(),
    completedAt: status === 'completed' && isIso(v.completedAt) ? v.completedAt : null,
  };
}

function parseGoal(v: unknown, subjectIds: Set<string>): Goal | null {
  if (!isObj(v) || !isStr(v.id) || !isNum(v.target) || v.target <= 0) return null;
  const metric = v.metric === 'tasks' ? 'tasks' : 'minutes';
  return {
    id: v.id,
    title: isStr(v.title) ? v.title.slice(0, 80) : '',
    metric,
    period: v.period === 'week' ? 'week' : 'day',
    target: Math.round(v.target),
    subjectId: metric === 'minutes' && isStr(v.subjectId) && subjectIds.has(v.subjectId) ? v.subjectId : null,
    createdAt: isIso(v.createdAt) ? v.createdAt : new Date().toISOString(),
  };
}

function parseSession(v: unknown, subjectIds: Set<string>): FocusSession | null {
  if (!isObj(v) || !isStr(v.id) || !isIso(v.startedAt) || !isIso(v.endedAt) || !isNum(v.durationSec)) {
    return null;
  }
  if (v.durationSec <= 0 || v.durationSec > 6 * 3600) return null;
  return {
    id: v.id,
    startedAt: v.startedAt,
    endedAt: v.endedAt,
    durationSec: Math.round(v.durationSec),
    plannedSec: isNum(v.plannedSec) ? Math.round(v.plannedSec) : Math.round(v.durationSec),
    completed: v.completed !== false,
    taskId: isStr(v.taskId) ? v.taskId : null,
    subjectId: isStr(v.subjectId) && subjectIds.has(v.subjectId) ? v.subjectId : null,
  };
}

function parseTimer(v: unknown, settings: Settings): TimerState {
  if (!isObj(v) || !isStr(v.periodId) || !isNum(v.durationSec) || !isNum(v.remainingMs)) {
    return createTimer(settings);
  }
  const mode = v.mode === 'short' || v.mode === 'long' ? v.mode : 'focus';
  const status = v.status === 'running' || v.status === 'paused' ? v.status : 'idle';
  const endAt = isNum(v.endAt) ? v.endAt : null;
  if (status === 'running' && endAt === null) return createTimer(settings);
  return {
    periodId: v.periodId,
    mode,
    status,
    durationSec: Math.max(60, Math.round(v.durationSec)),
    endAt: status === 'running' ? endAt : null,
    remainingMs: Math.max(0, Math.min(v.remainingMs, v.durationSec * 1000)),
    startedAt: isIso(v.startedAt) ? v.startedAt : null,
    cycleCount: isNum(v.cycleCount) && v.cycleCount >= 0 ? Math.floor(v.cycleCount) : 0,
    taskId: isStr(v.taskId) ? v.taskId : null,
  };
}

function uniqueById<T extends { id: string }>(items: (T | null)[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (it && !seen.has(it.id)) {
      seen.add(it.id);
      out.push(it);
    }
  }
  return out;
}

/** Migraciones entre versiones del esquema. Hoy solo existe la v1. */
function migrate(raw: Obj): Obj {
  const version = isNum(raw.schemaVersion) ? raw.schemaVersion : 1;
  if (version > SCHEMA_VERSION) {
    throw new Error('Los datos proceden de una versión más reciente de FocusUp.');
  }
  // Futuras migraciones: if (version < 2) { ...; }
  return raw;
}

export interface ParseResult {
  data: AppData;
  dropped: number;
}

/** Valida un objeto arbitrario y devuelve datos seguros. Lanza error si no es un respaldo de FocusUp. */
export function parseAppData(input: unknown): ParseResult {
  if (!isObj(input)) throw new Error('El contenido no es un objeto JSON válido.');
  const raw = migrate(input);
  const looksLikeData = ['settings', 'tasks', 'subjects', 'sessions', 'goals'].some((k) => k in raw);
  if (!looksLikeData) throw new Error('El archivo no parece una copia de seguridad de FocusUp.');

  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const settings = parseSettings(raw.settings);
  const rawSubjects = arr(raw.subjects);
  const subjects = uniqueById(rawSubjects.map(parseSubject));
  const ids = new Set(subjects.map((s) => s.id));
  const rawTasks = arr(raw.tasks);
  const tasks = uniqueById(rawTasks.map((t) => parseTask(t, ids)));
  const rawGoals = arr(raw.goals);
  const goals = uniqueById(rawGoals.map((g) => parseGoal(g, ids)));
  const rawSessions = arr(raw.sessions);
  const sessions = uniqueById(rawSessions.map((s) => parseSession(s, ids)));

  const celebrated: Record<string, string> = {};
  if (isObj(raw.celebrated)) {
    for (const [k, val] of Object.entries(raw.celebrated)) if (isStr(val)) celebrated[k] = val;
  }

  const dropped =
    rawSubjects.length - subjects.length +
    rawTasks.length - tasks.length +
    rawGoals.length - goals.length +
    rawSessions.length - sessions.length;

  return {
    data: {
      schemaVersion: SCHEMA_VERSION,
      settings,
      subjects,
      tasks,
      goals,
      sessions,
      timer: parseTimer(raw.timer, settings),
      celebrated,
    },
    dropped,
  };
}

export interface LoadResult {
  data: AppData;
  warning: string | null;
}

export function loadData(): LoadResult {
  let text: string | null = null;
  try {
    text = localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      data: createInitialData(),
      warning: 'El navegador no permite usar el almacenamiento local. Los cambios no se guardarán.',
    };
  }
  if (!text) return { data: createInitialData(), warning: null };

  try {
    const { data, dropped } = parseAppData(JSON.parse(text));
    return {
      data,
      warning: dropped > 0 ? `Se ignoraron ${dropped} registros guardados que estaban dañados.` : null,
    };
  } catch {
    const backupKey = `${STORAGE_KEY}.corrupt-${Date.now()}`;
    try {
      localStorage.setItem(backupKey, text);
    } catch {
      /* sin espacio: no podemos hacer más */
    }
    return {
      data: createInitialData(),
      warning: `No se pudieron leer los datos guardados. Se ha conservado una copia en "${backupKey}" y se ha empezado de nuevo.`,
    };
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function exportData(data: AppData): void {
  const payload = { app: 'FocusUp', exportedAt: new Date().toISOString(), ...data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = `focusup-copia-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
