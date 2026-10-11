import { useEffect, useState } from 'react';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { AppStoreProvider } from './store/AppStore';
import { TimerProvider } from './store/TimerContext';
import { UIProvider } from './store/UIContext';
import { AppShell } from './components/layout/AppShell';
import { useRoute } from './hooks/useRoute';
import { useGoalCelebrations } from './hooks/useGoalCelebrations';
import { Dashboard } from './pages/Dashboard';
import { TasksPage } from './pages/TasksPage';
import { TimerPage } from './pages/TimerPage';
import { CalendarPage } from './pages/CalendarPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { supabase } from './supabase';
import { AuthPage } from './pages/AuthPage';

/** Repinta cada minuto para que "hoy", saludos y vencimientos cambien solos a medianoche. */
function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
}

function Routes() {
  const route = useRoute();
  useGoalCelebrations();
  useMinuteTick();

  let page;
  switch (route.name) {
    case 'tareas':
      page = <TasksPage params={route.params} />;
      break;
    case 'temporizador':
      page = <TimerPage />;
      break;
    case 'calendario':
      page = <CalendarPage />;
      break;
    case 'estadisticas':
      page = <StatsPage />;
      break;
    case 'ajustes':
      page = <SettingsPage />;
      break;
    default:
      page = <Dashboard />;
  }

  return <AppShell current={route.name}>{page}</AppShell>;
}

export default function App() {
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
  >(null);

  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Error comprobando la sesión:', error.message);
      }

      setSession(data.session);
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checkingSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <ToastProvider>
      <AppStoreProvider>
        <ConfirmProvider>
          <TimerProvider>
            <UIProvider>
              <Routes />
            </UIProvider>
          </TimerProvider>
        </ConfirmProvider>
      </AppStoreProvider>
    </ToastProvider>
  );
}