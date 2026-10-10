import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Flag, Flame, Info, PieChart, Plus, Timer, TrendingUp } from 'lucide-react';
import type { DateKey } from '../types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useNavigate } from '../hooks/useRoute';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { MinutesChart, type MinutesPoint } from '../components/charts/MinutesChart';
import { SubjectBreakdown } from '../components/charts/SubjectBreakdown';
import { GoalsList } from '../components/goals/GoalsList';
import { MIN_PARTIAL_SEC } from '../lib/timer';
import { addDays, formatDayHeading, formatShortDate, formatWeekdayShort, lastNDays, startOfWeek, toDateKey, todayKey } from '../lib/dates';
import { formatMinutes, percent } from '../lib/format';
import {
  completedTasksInDays,
  countCompleted,
  currentStreak,
  minutesByDay,
  sessionsInDays,
  subjectDistribution,
  sumMinutes,
} from '../lib/stats';

type Period = 'today' | '7d' | '30d';

const PERIOD_DAYS: Record<Period, number> = { today: 1, '7d': 7, '30d': 30 };
const PERIOD_TEXT: Record<Period, string> = { today: 'hoy', '7d': 'en los últimos 7 días', '30d': 'en los últimos 30 días' };

export function StatsPage() {
  const { state } = useStore();
  const { openGoalForm } = useUI();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('7d');
  const today = todayKey();

  const s = useMemo(() => {
    const days = lastNDays(PERIOD_DAYS[period]);
    const periodSessions = sessionsInDays(state.sessions, days);
    const byDay = minutesByDay(state.sessions, days);

    let evolution: MinutesPoint[];
    if (period === 'today') {
      // Minutos por hora, según la hora de finalización de cada sesión.
      const hours = Array.from({ length: 24 }, () => 0);
      for (const ses of periodSessions) hours[new Date(ses.endedAt).getHours()] += ses.durationSec / 60;
      evolution = hours.map((m, h) => ({ key: String(h), label: `${h}h`, title: `De ${h}:00 a ${h}:59`, minutes: m }));
    } else {
      evolution = days.map((k: DateKey) => ({
        key: k,
        label: period === '7d' ? formatWeekdayShort(k) : formatShortDate(k).replace('.', ''),
        title: formatDayHeading(k),
        minutes: byDay[k],
      }));
    }

    // Evolución semanal: últimas 8 semanas (lunes a domingo).
    const thisWeek = startOfWeek(new Date());
    const weekly: MinutesPoint[] = Array.from({ length: 8 }, (_, i) => {
      const start = addDays(thisWeek, -7 * (7 - i));
      const keys = Array.from({ length: 7 }, (_, d) => toDateKey(addDays(start, d)));
      return {
        key: keys[0],
        label: formatShortDate(keys[0]).replace('.', ''),
        title: `Semana del ${formatShortDate(keys[0])} al ${formatShortDate(keys[6])}`,
        minutes: sumMinutes(sessionsInDays(state.sessions, keys)),
      };
    });

    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter((t) => t.status === 'completed').length;

    return {
      totalMin: sumMinutes(state.sessions),
      totalSessions: countCompleted(state.sessions),
      periodMin: sumMinutes(periodSessions),
      periodSessions: countCompleted(periodSessions),
      partialSessions: periodSessions.filter((x) => !x.completed).length,
      todayMin: sumMinutes(sessionsInDays(state.sessions, [today])),
      weekMin: sumMinutes(sessionsInDays(state.sessions, lastNDays(7))),
      tasksCompletedPeriod: completedTasksInDays(state.tasks, days),
      completionRate: percent(completedTasks, totalTasks),
      completedTasks,
      totalTasks,
      evolution,
      weekly,
      hasWeekly: weekly.some((w) => w.minutes > 0),
      subjects: subjectDistribution(periodSessions, state.subjects),
      streak: currentStreak(state.sessions),
      activeDays: Object.values(byDay).filter((m) => m > 0).length,
    };
  }, [state.sessions, state.tasks, state.subjects, period, today]);

  const hasSessions = state.sessions.length > 0;

  return (
    <>
      <PageHeader
        title="Estadísticas"
        subtitle="Tu progreso real, calculado a partir de las sesiones y tareas registradas."
        actions={
          <Segmented
            label="Período"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'today', label: 'Hoy' },
              { value: '7d', label: '7 días' },
              { value: '30d', label: '30 días' },
            ]}
          />
        }
      />

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard icon={Clock} label={`Estudiado ${PERIOD_TEXT[period]}`} value={formatMinutes(s.periodMin)} hint={`Total histórico: ${formatMinutes(s.totalMin)}`} />
        <StatCard
          icon={Timer}
          tone="accent"
          label="Sesiones completadas"
          value={s.periodSessions}
          hint={s.partialSessions > 0 ? `+${s.partialSessions} parciales · ${s.totalSessions} en total` : `${s.totalSessions} en total`}
        />
        <StatCard icon={CheckCircle2} tone="success" label="Tareas completadas" value={s.tasksCompletedPeriod} hint={PERIOD_TEXT[period]} />
        <StatCard
          icon={TrendingUp}
          tone="warning"
          label="Tareas completadas (global)"
          value={s.totalTasks ? `${s.completionRate}%` : '—'}
          hint={s.totalTasks ? `${s.completedTasks} de ${s.totalTasks} tareas` : 'Aún no hay tareas'}
        >
          {s.totalTasks > 0 && <ProgressBar value={s.completionRate} label="Porcentaje de tareas completadas" size="sm" />}
        </StatCard>
      </section>

      <div className="mt-3 grid grid-cols-3 gap-3 md:mt-4 md:gap-4">
        <MiniStat label="Hoy" value={formatMinutes(s.todayMin)} />
        <MiniStat label="Últimos 7 días" value={formatMinutes(s.weekMin)} />
        <MiniStat label="Racha" value={`${s.streak} ${s.streak === 1 ? 'día' : 'días'}`} icon={<Flame className="h-3.5 w-3.5 text-warning" aria-hidden />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3" aria-labelledby="evo-title">
          <h2 id="evo-title" className="section-title">
            Evolución {period === 'today' ? 'por horas' : 'diaria'}
          </h2>
          <p className="mt-0.5 text-xs text-subtle">
            {period === 'today'
              ? 'Minutos de concentración según la hora en que terminó cada sesión'
              : `Minutos de concentración por día · ${s.activeDays} ${s.activeDays === 1 ? 'día activo' : 'días activos'}`}
          </p>
          {s.periodMin > 0 ? (
            <div className="mt-4">
              <MinutesChart
                data={s.evolution}
                kind={period === '30d' ? 'area' : 'bar'}
                goal={period !== 'today' && state.settings.dailyGoalMin > 0 ? state.settings.dailyGoalMin : undefined}
                highlightKey={period === '7d' ? today : undefined}
                height={240}
              />
            </div>
          ) : (
            <NoData onStart={() => navigate('temporizador')} text={`No hay sesiones registradas ${PERIOD_TEXT[period]}.`} />
          )}
        </section>

        <section className="card p-5 lg:col-span-2" aria-labelledby="subj-title">
          <h2 id="subj-title" className="section-title flex items-center gap-2">
            <PieChart className="h-4 w-4 text-subtle" aria-hidden /> Tiempo por asignatura
          </h2>
          <p className="mb-4 mt-0.5 text-xs text-subtle">Según la tarea vinculada a cada sesión, {PERIOD_TEXT[period]}</p>
          {s.subjects.length > 0 ? (
            <SubjectBreakdown slices={s.subjects} />
          ) : (
            <p className="py-8 text-center text-sm text-subtle">Sin datos {PERIOD_TEXT[period]}.</p>
          )}
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3" aria-labelledby="weekly-title">
          <h2 id="weekly-title" className="section-title">
            Evolución semanal
          </h2>
          <p className="mt-0.5 text-xs text-subtle">Minutos por semana (lunes a domingo), últimas 8 semanas</p>
          {s.hasWeekly ? (
            <div className="mt-4">
              <MinutesChart data={s.weekly} height={200} highlightKey={s.weekly[7].key} />
            </div>
          ) : (
            <NoData onStart={() => navigate('temporizador')} text="Aún no hay suficiente historial semanal." />
          )}
        </section>

        <section className="card p-5 lg:col-span-2" aria-labelledby="stats-goals-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="stats-goals-title" className="section-title flex items-center gap-2">
              <Flag className="h-4 w-4 text-subtle" aria-hidden /> Objetivos
            </h2>
            {state.goals.length > 0 && (
              <button type="button" className="btn-ghost min-h-[32px] px-2 text-xs" onClick={() => openGoalForm()}>
                <Plus className="h-3.5 w-3.5" /> Nuevo
              </button>
            )}
          </div>
          <GoalsList />
        </section>
      </div>

      <section className="card mt-6 p-5" aria-labelledby="defs-title">
        <h2 id="defs-title" className="section-title flex items-center gap-2">
          <Info className="h-4 w-4 text-accent" aria-hidden /> Qué se contabiliza
        </h2>
        <dl className="mt-3 grid gap-4 text-sm md:grid-cols-3">
          <div>
            <dt className="font-medium text-fg">Sesión completada</dt>
            <dd className="mt-1 text-muted">Un período de concentración que llega a 0. Las pausas no suman tiempo.</dd>
          </div>
          <div>
            <dt className="font-medium text-fg">Tiempo de estudio</dt>
            <dd className="mt-1 text-muted">
              La duración de las sesiones completadas más el tiempo efectivo de las saltadas tras al menos {MIN_PARTIAL_SEC / 60} min (parciales). Los
              descansos no cuentan.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg">Día de la sesión</dt>
            <dd className="mt-1 text-muted">Cada sesión se asigna al día y la hora en que termina. Las tareas, al día en que se marcan como completadas.</dd>
          </div>
        </dl>
      </section>

      {!hasSessions && (
        <p className="mt-4 text-center text-xs text-subtle">Los gráficos se rellenarán a medida que registres sesiones. No se muestran datos de ejemplo.</p>
      )}
    </>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-0.5 rounded-xl border border-line/70 bg-surface/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function NoData({ text, onStart }: { text: string; onStart: () => void }) {
  return (
    <EmptyState
      compact
      icon={BarChart3}
      title="Todavía no hay datos"
      message={text}
      action={
        <button type="button" className="btn-secondary" onClick={onStart}>
          <Timer className="h-4 w-4" /> Iniciar una sesión
        </button>
      }
    />
  );
}
