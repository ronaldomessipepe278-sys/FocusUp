import { useMemo } from 'react';
import { BellRing, Info, Pause, Play, RotateCcw, SkipForward, Target } from 'lucide-react';
import type { TimerMode } from '../types';
import { useStore, useSubjectMap } from '../store/AppStore';
import { useTimer } from '../store/TimerContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { TimerRing } from '../components/timer/TimerRing';
import { SubjectBadge } from '../components/tasks/TaskItem';
import { MODE_LABEL, MIN_PARTIAL_SEC } from '../lib/timer';
import { formatClock, formatMinutes, plural } from '../lib/format';
import { formatTime, todayKey } from '../lib/dates';
import { countCompleted, sessionsInDays, sumMinutes, upcomingTasks } from '../lib/stats';
import { notificationPermission } from '../lib/notify';
import { hrefFor } from '../hooks/useRoute';

export function TimerPage() {
  const { state } = useStore();
  const subjects = useSubjectMap();
  const { timer, remainingMs, progress, linkedTask, sessionNumber, toggle, reset, skip, setMode, setTask } = useTimer();
  const { settings } = state;

  const running = timer.status === 'running';
  const isFocus = timer.mode === 'focus';
  const started = timer.startedAt !== null;

  const todaySessions = useMemo(
    () => sessionsInDays(state.sessions, [todayKey()]).sort((a, b) => b.endedAt.localeCompare(a.endedAt)),
    [state.sessions],
  );
  const pendingTasks = useMemo(() => upcomingTasks(state.tasks, 50), [state.tasks]);

  // Durante el descanso largo el ciclo se muestra lleno.
  const cycleDone = timer.mode === 'long' ? settings.longBreakEvery : timer.cycleCount % settings.longBreakEvery;
  const primaryLabel =running ? 'Pausar' : started ? 'Reanudar' : 'Iniciar';
  const permission = notificationPermission();

  return (
    <>
      <PageHeader
        title="Temporizador"
        subtitle={`Pomodoro de ${settings.focusMin} min con descansos de ${settings.shortBreakMin} y ${settings.longBreakMin} min.`}
        actions={
          <a href={hrefFor('ajustes')} className="btn-secondary">
            Cambiar duraciones
          </a>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card flex flex-col items-center px-4 py-6 sm:px-8 sm:py-8" aria-label="Temporizador Pomodoro">
          <Segmented<TimerMode>
            label="Modo del temporizador"
            value={timer.mode}
            onChange={setMode}
            options={[
              { value: 'focus', label: 'Concentración' },
              { value: 'short', label: 'Descanso corto' },
              { value: 'long', label: 'Descanso largo' },
            ]}
            className="w-full max-w-md"
          />

          <div className="my-8 w-full max-w-[320px]">
            <TimerRing progress={progress} variant={isFocus ? 'focus' : 'break'} active={running}>
              <span
                className={`chip mb-2 ${isFocus ? 'bg-primary/15 text-primary-soft' : 'bg-success/15 text-success'}`}
              >
                {MODE_LABEL[timer.mode]}
              </span>
              <span
                className="font-mono text-6xl font-semibold tabular-nums tracking-tight text-fg sm:text-7xl"
                role="timer"
                aria-live="off"
                aria-label={`Tiempo restante ${formatClock(remainingMs)}`}
              >
                {formatClock(remainingMs)}
              </span>
              <span className="mt-2 text-sm text-muted">
                {timer.status === 'paused' ? 'En pausa' : isFocus ? `Sesión ${sessionNumber} de ${settings.longBreakEvery}` : 'Respira y desconecta'}
              </span>
            </TimerRing>
          </div>

          <div className="flex items-center gap-4">
            <button type="button" onClick={reset} className="btn-icon h-12 w-12 border border-line" aria-label="Reiniciar período" title="Reiniciar período">
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggle}
              className={`flex h-16 min-w-[9rem] items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97] ${
                isFocus ? 'bg-gradient-to-br from-primary to-accent shadow-glow' : 'bg-gradient-to-br from-success to-teal-500'
              }`}
            >
              {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {primaryLabel}
            </button>
            <button type="button" onClick={skip} className="btn-icon h-12 w-12 border border-line" aria-label="Saltar al siguiente período" title="Saltar al siguiente período">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          <div
            className="mt-6 flex items-center gap-2"
            role="img"
            aria-label={`${cycleDone} de ${settings.longBreakEvery} sesiones completadas antes del descanso largo`}
          >
            {Array.from({ length: settings.longBreakEvery }, (_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i < cycleDone
                    ? 'w-6 bg-gradient-to-r from-primary to-accent'
                    : i === cycleDone && isFocus
                      ? 'w-6 bg-primary/40'
                      : 'w-2 bg-line'
                }`}
              />
            ))}
          </div>

          <div className="mt-8 w-full max-w-md">
            <label htmlFor="timer-task" className="label flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" aria-hidden /> Tarea de esta sesión
            </label>
            <select
              id="timer-task"
              className="input"
              value={timer.taskId ?? ''}
              onChange={(e) => setTask(e.target.value || null)}
            >
              <option value="">Sin tarea concreta</option>
              {linkedTask && linkedTask.status === 'completed' && <option value={linkedTask.id}>{linkedTask.title} (completada)</option>}
              {pendingTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                  {t.subjectId && subjects.get(t.subjectId) ? ` · ${subjects.get(t.subjectId)!.name}` : ''}
                </option>
              ))}
            </select>
            {linkedTask ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <SubjectBadge subject={linkedTask.subjectId ? subjects.get(linkedTask.subjectId) : null} />
                El tiempo se atribuirá a esta asignatura.
              </div>
            ) : (
              <p className="mt-2 text-xs text-subtle">Vincula una tarea para repartir tu tiempo por asignatura en las estadísticas.</p>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <section className="card p-5" aria-labelledby="today-sessions">
            <h2 id="today-sessions" className="section-title">
              Hoy
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-2/60 p-3">
                <dt className="text-xs text-muted">Sesiones completadas</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{countCompleted(todaySessions)}</dd>
              </div>
              <div className="rounded-xl bg-surface-2/60 p-3">
                <dt className="text-xs text-muted">Tiempo concentrado</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{formatMinutes(sumMinutes(todaySessions))}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-subtle">
              Total histórico: {plural(countCompleted(state.sessions), 'sesión completada', 'sesiones completadas')}
            </p>
            {todaySessions.length > 0 ? (
              <ul className="mt-4 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {todaySessions.map((s) => {
                  const task = state.tasks.find((t) => t.id === s.taskId);
                  return (
                    <li key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${s.completed ? 'bg-primary' : 'bg-subtle'}`} aria-hidden />
                      <span className="w-12 shrink-0 font-mono text-xs text-subtle">{formatTime(s.endedAt)}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">{task?.title ?? 'Sin tarea'}</span>
                      <span className="shrink-0 text-xs font-medium tabular-nums text-fg">
                        {Math.round(s.durationSec / 60)} min{!s.completed && <span className="text-subtle"> · parcial</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-subtle">Aún no has registrado sesiones hoy. Pulsa «Iniciar» cuando estés listo.</p>
            )}
          </section>

          <section className="card p-5 text-sm text-muted" aria-labelledby="timer-rules">
            <h2 id="timer-rules" className="section-title flex items-center gap-2">
              <Info className="h-4 w-4 text-accent" aria-hidden /> Cómo se cuenta tu tiempo
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
              <li>
                Una <strong className="text-fg">sesión completada</strong> es un período de concentración que llega a 0. Suma su duración
                completa; las pausas no cuentan.
              </li>
              <li>
                Si <strong className="text-fg">saltas</strong> o cambias de modo tras al menos {MIN_PARTIAL_SEC / 60} min, se guarda el tiempo
                efectivo como sesión parcial.
              </li>
              <li>
                <strong className="text-fg">Reiniciar</strong> descarta el período actual sin registrarlo.
              </li>
              <li>Los descansos no suman tiempo de estudio.</li>
            </ul>
            {settings.notifications && permission !== 'granted' && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 p-2.5 text-xs text-warning">
                <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Las notificaciones están activadas, pero el navegador no ha concedido permiso. Revísalo en Ajustes.
              </p>
            )}
          </section>
        </aside>
      </div>
      <p className="sr-only" aria-live="polite">
        {timer.status === 'running' ? `${MODE_LABEL[timer.mode]} en marcha` : timer.status === 'paused' ? 'Temporizador en pausa' : ''}
      </p>
    </>
  );
}
