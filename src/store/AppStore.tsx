
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppData, Goal, Settings, Subject, Task } from '../types';
import {
  createInitialData,
  loadData,
  parseAppData,
  saveData,
} from '../lib/storage';
import { uid } from '../lib/format';
import {
  reducer,
  type Action,
  type GoalInput,
  type SubjectInput,
  type TaskInput,
} from './reducer';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../supabase';

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

let loaded: ReturnType<typeof loadData> | null = null;
const loadOnce = () => (loaded ??= loadData());

const MIGRATION_KEY = 'focusup.cloud.migrated-user';

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadOnce());
  const [state, dispatch] = useReducer(reducer, initial.current.data);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);

  const toast = useToast();
  const saveFailed = useRef(false);
  const cloudSaveFailed = useRef(false);
  const lastSyncedJson = useRef<string | null>(null);
  const pendingApply = useRef<string | null>(null);

  // Cargar primero los datos de la cuenta para no sobrescribirlos.
  useEffect(() => {
    let cancelled = false;

    async function loadCloudData() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const user = authData.user;
        if (!user) {
          if (!cancelled) setCloudLoading(false);
          return;
        }

        const { data: remote, error: readError } = await supabase
          .from('user_app_data')
          .select('data')
          .eq('user_id', user.id)
          .maybeSingle();

        if (readError) throw readError;

        if (remote) {
          const parsed = parseAppData(remote.data);
          const json = JSON.stringify(parsed.data);

          pendingApply.current = json;
          lastSyncedJson.current = json;

          dispatch({ type: 'data/replace', data: parsed.data });
        } else {
          // La primera cuenta puede importar los datos del navegador.
          // Otra cuenta del mismo navegador empieza con datos propios.
          let migrationOwner: string | null = null;

          try {
            migrationOwner = localStorage.getItem(MIGRATION_KEY);
          } catch {
            // Si el navegador bloquea localStorage, usamos los datos iniciales.
          }

          const dataToUpload =
            migrationOwner && migrationOwner !== user.id
              ? createInitialData()
              : initial.current.data;

          const json = JSON.stringify(dataToUpload);

          pendingApply.current = json;
          lastSyncedJson.current = json;

          if (dataToUpload !== initial.current.data) {
            dispatch({ type: 'data/replace', data: dataToUpload });
          }

          const { error: writeError } = await supabase
            .from('user_app_data')
            .upsert(
              {
                user_id: user.id,
                data: dataToUpload,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' },
            );

          if (writeError) throw writeError;

          if (!migrationOwner) {
            try {
              localStorage.setItem(MIGRATION_KEY, user.id);
            } catch {
              // La sincronización en la nube no depende de esta marca.
            }
          }
        }

        if (!cancelled) {
          setCloudSyncEnabled(true);
          setCloudLoading(false);
        }
      } catch (error) {
        console.error('Error cargando datos de FocusUp:', error);

        if (!cancelled) {
          toast(
            'error',
            'No se pudo conectar con la nube',
            'Tus datos locales se mantienen. Comprueba la conexión y la configuración de Supabase.',
          );
          setCloudLoading(false);
        }
      }
    }

    void loadCloudData();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Guardar siempre una copia local.
  useEffect(() => {
    const ok = saveData(state);

    if (!ok && !saveFailed.current) {
      toast(
        'error',
        'No se pudieron guardar los cambios',
        'El almacenamiento del navegador está lleno o bloqueado. Exporta una copia de seguridad.',
      );
    }

    saveFailed.current = !ok;
  }, [state, toast]);

  // Sincronizar los cambios con la cuenta autenticada.
  useEffect(() => {
    if (!cloudSyncEnabled) return;

    const json = JSON.stringify(state);

    // Esperar a que el estado de React coincida con los datos cargados.
    if (pendingApply.current !== null) {
      if (json !== pendingApply.current) return;
      pendingApply.current = null;
    }

    if (json === lastSyncedJson.current) return;

    const timeout = setTimeout(async () => {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;
        if (!authData.user) return;

        const { error } = await supabase
          .from('user_app_data')
          .upsert(
            {
              user_id: authData.user.id,
              data: state,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          );

        if (error) throw error;

        lastSyncedJson.current = json;
        cloudSaveFailed.current = false;
      } catch (error) {
        console.error('Error sincronizando FocusUp:', error);

        if (!cloudSaveFailed.current) {
          toast(
            'error',
            'No se pudieron sincronizar los cambios',
            'La copia local se conserva. Comprueba tu conexión.',
          );
        }

        cloudSaveFailed.current = true;
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [state, cloudSyncEnabled, toast]);

  // Aplicar el tema.
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
      updateSettings: (patch) =>
        dispatch({ type: 'settings/update', patch }),

      addSubject: (input) => {
        const subject: Subject = {
          id: uid(),
          createdAt: new Date().toISOString(),
          ...input,
        };
        dispatch({ type: 'subject/add', subject });
        return subject;
      },

      updateSubject: (id, patch) =>
        dispatch({ type: 'subject/update', id, patch }),

      deleteSubject: (id, moveTo) =>
        dispatch({ type: 'subject/delete', id, moveTo }),

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

      updateTask: (id, patch) =>
        dispatch({ type: 'task/update', id, patch }),

      deleteTask: (id) => dispatch({ type: 'task/delete', id }),

      toggleTask: (id) =>
        dispatch({
          type: 'task/toggle',
          id,
          now: new Date().toISOString(),
        }),

      addGoal: (input) => {
        const goal: Goal = {
          ...input,
          id: uid(),
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'goal/add', goal });
      },

      updateGoal: (id, patch) =>
        dispatch({ type: 'goal/update', id, patch }),

      deleteGoal: (id) => dispatch({ type: 'goal/delete', id }),

      replaceData: (data) =>
        dispatch({ type: 'data/replace', data }),

      resetData: () => dispatch({ type: 'data/reset' }),
    }),
    [],
  );

  const value = useMemo<Store>(
    () => ({ state, dispatch, actions }),
    [state, actions],
  );

  if (cloudLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-label="Cargando FocusUp"
        />
      </div>
    );
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);

  if (!ctx) {
    throw new Error('useStore debe usarse dentro de AppStoreProvider');
  }

  return ctx;
}

export function useSubjectMap() {
  const { state } = useStore();

  return useMemo(
    () => new Map(state.subjects.map((s) => [s.id, s])),
    [state.subjects],
  );
}
