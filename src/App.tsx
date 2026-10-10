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
