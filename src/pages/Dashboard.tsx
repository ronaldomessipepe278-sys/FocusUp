import { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Clock,
  Flag,
  ListPlus,
  Pause,
  Play,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';
import { useStore, useSubjectMap } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useTimer } from '../store/TimerContext';
import { useTaskActions } from '../hooks/useTaskActions';
import { hrefFor, useNavigate } from '../hooks/useRoute';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { TaskItem } from '../components/tasks/TaskItem';
import { TimerRing } from '../components/timer/TimerRing';
import { MinutesChart } from '../components/charts/MinutesChart';
import { GoalsList } from '../components/goals/GoalsList';
import { formatLongDate, formatWeekdayShort, formatDayHeading, todayKey, weekKeys } from '../lib/dates';
import { formatClock, formatMinutes, percent, plural } from '../lib/format';
import { completedTasksInDays, countCompleted, isOverdue, minutesByDay, sessionsInDays, sumMinutes, upcomingTasks } from '../lib/stats';
import { greeting, pickMotivation } from '../lib/motivation';
import { MODE_LABEL } from '../lib/timer';

export function Dashboard() {
  const { state } = useStore();
  const { settings, tasks, sessions } = state;
  const subjects = useSubjectMap();
  const { openTaskForm, openGoalForm } = useUI();
  const { toggle } = useTaskActions();
  const navigate = useNavigate();

  const now = new Date();
  const today = todayKey();

  const data = useMemo(() => {
    const todaySessions = sessionsInDays(sessions, [today]);
    const week = weekKeys(new Date());
    const weekSessions = sessionsInDays(sessions, week);
    const byDay = minutesByDay(sessions, week);
    return {
      todayMin: sumMinutes(todaySessions),
      todaySessionsDone: countCompleted(todaySessions),
      completedToday: completedTasksInDays(tasks, [today]),
      pending: tasks.filter((t) => t.status === 'pending').length,
      pendingToday: tasks.filter((t) => t.status === 'pending' && t.dueDate === today).length,
      overdue: tasks.filter((t) => isOverdue(t, today)).length,
      upcoming: upcomingTasks(tasks, 5),
      weekMin: sumMinutes(weekSessions),
      weekSessionsDone: countCompleted(weekSessions),
      weekChart: week.map((k) => ({ key: k, label: formatWeekdayShort(k), title: formatDayHeading(k), minutes: byDay[k] })),
    };
  }, [sessions, tasks, today]);

  const hasAnyData = tasks.length > 0 || sessions.length > 0;
  const dailyPct = percent(data.todayMin, settings.dailyGoalMin);
  const weeklyTarget = settings.dailyGoalMin * 7;
  const motivation = pickMotivation({
    hour: now.getHours(),
    todayMinutes: data.todayMin,
    dailyGoal: settings.dailyGoalMin,
    pendingToday: data.pendingToday,
    overdue: data.overdue,
    hasAnyData,
  });
  const name = settings.userName.trim();

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">{formatLongDate(now)}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {greeting(now.getHours())}
            {name ? (
              <>
                , <span className="bg-gradient-to-r from-primary-soft to-accent bg-clip-text text-transparent">{name}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Sparkles className="h-4 w-4 shrink-0 text-primary-soft" aria-hidden />
            {motivation}
          </p>
          {!name && (
            <a href={hrefFor('ajustes')} className="mt-1 inline-block text-xs text-primary-soft hover:underline">
              Añade tu nombre en Ajustes
            </a>
          )}
        </div>
        <QuickActions onTask={() => openTaskForm()} onFocus={() => navigate('temporizador')} onGoal={() => openGoalForm()} />
      </header>

      {!hasAnyData && <Welcome onTask={() => openTaskForm()} onFocus={() => navigate('temporizador')} onGoal={() => openGoalForm()} />}

      {/* Resumen diario */}
      <section aria-label="Resumen de hoy" className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard icon={CheckCircle2} tone="success" label="Completadas hoy" value={data.completedToday} hint={plural(data.completedToday, 'tarea', 'tareas')} />
        <StatCard
          icon={CircleDashed}
          tone="accent"
          label="Pendientes"
          value={data.pending}
          hint={data.overdue > 0 ? <span className="text-danger">{plural(data.overdue, 'vencida', 'vencidas')}</span> : `${data.pendingToday} para hoy`}
        />
        <StatCard
          icon={Clock}
          tone="primary"
          label="Concentración hoy"
          value={formatMinutes(data.todayMin)}
          hint={plural(data.todaySessionsDone, 'sesión completada', 'sesiones completadas')}
        />
        <StatCard
          icon={Target}
          tone="warning"
          label="Objetivo diario"
          value={settings.dailyGoalMin > 0 ? `${dailyPct}%` : '—'}
          hint={settings.dailyGoalMin > 0 ? `${Math.floor(data.todayMin)} de ${settings.dailyGoalMin} min` : 'Defínelo en Ajustes'}
        >
          {settings.dailyGoalMin > 0 && <ProgressBar value={dailyPct} label="Progreso del objetivo diario" size="sm" />}
        </StatCard>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <QuickTimer />

        {/* Próximas tareas */}
        <section className="card p-5 lg:col-span-3" aria-labelledby="upcoming-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="upcoming-title" className="section-title">
              Próximas tareas
            </h2>
            <a href={hrefFor('tareas')} className="inline-flex items-center gap-1 text-xs font-medium text-primary-soft hover:underline">
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
          {data.upcoming.length > 0 ? (
            <ul className="-mx-2 space-y-0.5">
              {data.upcoming.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  subject={t.subjectId ? subjects.get(t.subjectId) : undefined}
                  onToggle={() => toggle(t)}
                  onEdit={() => openTaskForm({ task: t })}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={CheckCircle2}
              title={tasks.length ? 'Todo al día' : 'Sin tareas pendientes'}
              message={tasks.length ? 'No te queda ninguna tarea pendiente. Buen trabajo.' : 'Crea una tarea para verla aquí.'}
              action={
                <button type="button" className="btn-secondary" onClick={() => openTaskForm()}>
                  <ListPlus className="h-4 w-4" /> Añadir tarea
                </button>
              }
            />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Progreso semanal */}
        <section className="card p-5 lg:col-span-3" aria-labelledby="week-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="week-title" className="section-title">
                Progreso semanal
              </h2>
              <p className="mt-0.5 text-xs text-subtle">Minutos de concentración por día (lunes a domingo)</p>
            </div>
            <a href={hrefFor('estadisticas')} className="inline-flex items-center gap-1 text-xs font-medium text-primary-soft hover:underline">
              Estadísticas <BarChart3 className="h-3.5 w-3.5" />
            </a>
          </div>
          {data.weekMin > 0 ? (
            <>
              <div className="mt-4">
                <MinutesChart data={data.weekChart} goal={settings.dailyGoalMin || undefined} highlightKey={today} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line/70 pt-4 text-center">
                <div>
                  <dt className="text-xs text-subtle">Esta semana</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{formatMinutes(data.weekMin)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">Sesiones</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{data.weekSessionsDone}</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">Objetivo semanal</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {weeklyTarget > 0 ? `${percent(data.weekMin, weeklyTarget)}%` : '—'}
                  </dd>
                </div>
              </dl>
              {weeklyTarget > 0 && (
                <p className="mt-2 text-center text-xs text-subtle">
                  Objetivo semanal = 7 × objetivo diario ({formatMinutes(weeklyTarget)})
                </p>
              )}
            </>
          ) : (
            <EmptyState
              compact
              icon={BarChart3}
              title="Tu semana empieza aquí"
              message="Cuando completes sesiones de concentración verás aquí tus minutos de cada día."
              action={
                <button type="button" className="btn-secondary" onClick={() => navigate('temporizador')}>
                  <Timer className="h-4 w-4" /> Iniciar una sesión
                </button>
              }
            />
          )}
        </section>

        {/* Objetivos */}
        <section className="card p-5 lg:col-span-2" aria-labelledby="goals-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="goals-title" className="section-title">
              Objetivos
            </h2>
            {state.goals.length > 0 && (
              <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary-soft hover:underline" onClick={() => openGoalForm()}>
                <Flag className="h-3.5 w-3.5" /> Nuevo
              </button>
            )}
          </div>
          <GoalsList limit={4} />
          {state.goals.length > 4 && (
            <a href={hrefFor('estadisticas')} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary-soft hover:underline">
              Ver los {state.goals.length} objetivos <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </section>
      </div>
    </div>
  );
}

function QuickActions({ onTask, onFocus, onGoal }: { onTask: () => void; onFocus: () => void; onGoal: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:flex" role="group" aria-label="Acciones rápidas">
      <button type="button" className="btn-primary px-3" onClick={onTask}>
        <ListPlus className="h-4 w-4" /> <span className="truncate">Tarea</span>
      </button>
      <button type="button" className="btn-secondary px-3" onClick={onFocus}>
        <Timer className="h-4 w-4" /> <span className="truncate">Estudiar</span>
      </button>
      <button type="button" className="btn-secondary px-3" onClick={onGoal}>
        <Flag className="h-4 w-4" /> <span className="truncate">Objetivo</span>
      </button>
    </div>
  );
}

function Welcome({ onTask, onFocus, onGoal }: { onTask: () => void; onFocus: () => void; onGoal: () => void }) {
  const steps = [
    { icon: ListPlus, title: 'Apunta tus tareas', text: 'Entregas, exámenes y repasos con fecha y prioridad.', action: 'Añadir tarea', onClick: onTask },
    { icon: Timer, title: 'Concéntrate', text: 'Sesiones Pomodoro de 25 min con descansos.', action: 'Abrir temporizador', onClick: onFocus },
    { icon: Flag, title: 'Fija un objetivo', text: 'Minutos de estudio o tareas al día o a la semana.', action: 'Crear objetivo', onClick: onGoal },
  ];
  return (
    <section className="card relative overflow-hidden p-5 md:p-6" aria-label="Primeros pasos">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <h2 className="text-lg font-semibold">Bienvenido a FocusUp</h2>
      <p className="mt-1 text-sm text-muted">Tres pasos para empezar. Todo se guarda en este navegador.</p>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col rounded-2xl border border-line/70 bg-surface-2/40 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary-soft">{i + 1}</span>
              <s.icon className="h-4 w-4 text-muted" aria-hidden />
            </div>
            <p className="mt-3 font-medium">{s.title}</p>
            <p className="mt-1 flex-1 text-sm text-muted">{s.text}</p>
            <button type="button" className="btn-secondary mt-4 w-full" onClick={s.onClick}>
              {s.action}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function QuickTimer() {
  const { timer, remainingMs, progress, toggle, linkedTask, sessionNumber } = useTimer();
  const { state } = useStore();
  const running = timer.status === 'running';
  const isFocus = timer.mode === 'focus';
  const label = running ? 'Pausar' : timer.startedAt ? 'Reanudar' : 'Iniciar';

  return (
    <section className="card flex flex-col p-5 lg:col-span-2" aria-labelledby="quick-timer-title">
      <div className="flex items-center justify-between">
        <h2 id="quick-timer-title" className="section-title">
          Temporizador
        </h2>
        <span className={`chip ${isFocus ? 'bg-primary/15 text-primary-soft' : 'bg-success/15 text-success'}`}>{MODE_LABEL[timer.mode]}</span>
      </div>
      <div className="flex flex-1 items-center gap-5 py-4">
        <div className="w-28 shrink-0 sm:w-32">
          <TimerRing progress={progress} variant={isFocus ? 'focus' : 'break'} active={running} size={140} stroke={9}>
            <span className="font-mono text-xl font-semibold tabular-nums">{formatClock(remainingMs)}</span>
          </TimerRing>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {timer.status === 'paused' ? 'En pausa' : running ? 'En marcha' : 'Listo para empezar'}
            {isFocus && <span className="text-subtle"> · sesión {sessionNumber} de {state.settings.longBreakEvery}</span>}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-fg">{linkedTask ? linkedTask.title : 'Sin tarea vinculada'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={toggle}>
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {label}
            </button>
            <a href={hrefFor('temporizador')} className="btn-ghost">
              Abrir <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
