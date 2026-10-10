import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { AppData, Goal, Settings, Subject, Task } from '../types';
import { loadData, saveData } from '../lib/storage';
import { uid } from '../lib/format';
import { reducer, type Action, type GoalInput, type SubjectInput, type TaskInput } from './reducer';
import { useToast } from '../components/ui/Toast';

interface Actions {
  updateSettings: (patch: Partial<Settings>) => void;
  addSubject: (input: SubjectInput) => Subject;
  updateSubject: (id: string, patch: SubjectInput) => void;
  deleteSubject: (id: string, moveTo: string | null) => void;
  addTask: (input: TaskInput) => Task;
  updateTask: (id: string, patch: Partial<TaskInput>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  addGoal: (input: GoalInput) => void;
  updateGoal: (id: string, patch: GoalInput) => void;
  deleteGoal: (id: string) => void;
  replaceData: (data: AppData) => void;
  resetData: () => void;
}

interface Store {
  state: AppData;
  dispatch: React.Dispatch<Action>;
  actions: Actions;
}

const StoreContext = createContext<Store | null>(null);

// Una sola lectura por carga de página (StrictMode monta dos veces en desarrollo).
let loaded: ReturnType<typeof loadData> | null = null;
const loadOnce = () => (loaded ??= loadData());

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadOnce());
  const [state, dispatch] = useReducer(reducer, initial.current.data);
  const toast = useToast();
  const saveFailed = useRef(false);

  // Avisos de carga (datos dañados, almacenamiento bloqueado).
  const warned = useRef(false);
  useEffect(() => {
    const warning = initial.current?.warning;
    if (warning && !warned.current) {
      warned.current = true;
      toast('error', 'Aviso sobre tus datos', warning);
    }
  }, [toast]);

  // Persistencia: cada cambio de estado se guarda en localStorage.
  useEffect(() => {
    const ok = saveData(state);
    if (!ok && !saveFailed.current) {
      toast('error', 'No se pudieron guardar los cambios', 'El almacenamiento del navegador está lleno o bloqueado. Exporta una copia de seguridad.');
    }
    saveFailed.current = !ok;
  }, [state, toast]);

  // Aplicación del tema a todo el documento (antes de los efectos pasivos de los hijos).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', state.settings.theme === 'dark');
    root.classList.toggle('light', state.settings.theme === 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      state.settings.theme === 'dark' ? '#0a0c16' : '#f4f5fb',
    );
  }, [state.settings.theme]);

  const actions = useMemo<Actions>(
    () => ({
      updateSettings: (patch) => dispatch({ type: 'settings/update', patch }),
      addSubject: (input) => {
        const subject: Subject = { id: uid(), createdAt: new Date().toISOString(), ...input };
        dispatch({ type: 'subject/add', subject });
        return subject;
      },
      updateSubject: (id, patch) => dispatch({ type: 'subject/update', id, patch }),
      deleteSubject: (id, moveTo) => dispatch({ type: 'subject/delete', id, moveTo }),
      addTask: (input) => {
        const status = input.status ?? 'pending';
        const now = new Date().toISOString();
        const task: Task = {
          ...input,
          id: uid(),
          status,
          createdAt: now,
          completedAt: status === 'completed' ? now : null,
        };
        dispatch({ type: 'task/add', task });
        return task;
      },
      updateTask: (id, patch) => dispatch({ type: 'task/update', id, patch }),
      deleteTask: (id) => dispatch({ type: 'task/delete', id }),
      toggleTask: (id) => dispatch({ type: 'task/toggle', id, now: new Date().toISOString() }),
      addGoal: (input) => {
        const goal: Goal = { ...input, id: uid(), createdAt: new Date().toISOString() };
        dispatch({ type: 'goal/add', goal });
      },
      updateGoal: (id, patch) => dispatch({ type: 'goal/update', id, patch }),
      deleteGoal: (id) => dispatch({ type: 'goal/delete', id }),
      replaceData: (data) => dispatch({ type: 'data/replace', data }),
      resetData: () => dispatch({ type: 'data/reset' }),
    }),
    [],
  );

  const value = useMemo<Store>(() => ({ state, dispatch, actions }), [state, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de AppStoreProvider');
  return ctx;
}

export function useSubjectMap() {
  const { state } = useStore();
  return useMemo(() => new Map(state.subjects.map((s) => [s.id, s])), [state.subjects]);
}
