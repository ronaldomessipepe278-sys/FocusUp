import { useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { DateKey, Task } from '../types';
import { useStore, useSubjectMap } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useTaskActions } from '../hooks/useTaskActions';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/ui/EmptyState';
import { TaskCheck, TaskItem } from '../components/tasks/TaskItem';
import {
  WEEKDAY_LABELS,
  addDays,
  addMonths,
  formatDayHeading,
  formatMonthYear,
  formatShortDate,
  fromDateKey,
  startOfMonth,
  startOfWeek,
  toDateKey,
  todayKey,
} from '../lib/dates';
import { PRIORITY_WEIGHT, isOverdue } from '../lib/stats';
import { plural } from '../lib/format';

type View = 'month' | 'week';

export function CalendarPage() {
  const { state } = useStore();
  const subjects = useSubjectMap();
  const { openTaskForm } = useUI();
  const { toggle, remove } = useTaskActions();
  const today = todayKey();

  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<DateKey>(today);

  const tasksByDay = useMemo(() => {
    const map = new Map<DateKey, Task[]>();
    for (const t of state.tasks) {
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        a.status !== b.status ? (a.status === 'pending' ? -1 : 1) : PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority],
      );
    }
    return map;
  }, [state.tasks]);

  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)));
    }
    const start = startOfWeek(startOfMonth(cursor));
    return Array.from({ length: 42 }, (_, i) => toDateKey(addDays(start, i)));
  }, [view, cursor]);

  const move = (dir: -1 | 1) => {
    const next = view === 'month' ? addMonths(cursor, dir) : addDays(cursor, dir * 7);
    setCursor(next);
    if (view === 'week') setSelected(toDateKey(addDays(fromDateKey(selected), dir * 7)));
  };
  const goToday = () => {
    setCursor(new Date());
    setSelected(today);
  };

  const title =
    view === 'month' ? formatMonthYear(cursor) : `${formatShortDate(days[0])} – ${formatShortDate(days[6])} ${fromDateKey(days[6]).getFullYear()}`;
  const currentMonth = cursor.getMonth();
  const selectedTasks = tasksByDay.get(selected) ?? [];

  return (
    <>
      <PageHeader
        title="Calendario"
        subtitle="Consulta tus fechas límite y planifica cada día."
        actions={
          <button type="button" className="btn-primary" onClick={() => openTaskForm({ defaults: { dueDate: selected } })}>
            <Plus className="h-4 w-4" /> Nueva tarea
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-3 sm:p-5" aria-label="Calendario">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button type="button" className="btn-icon" onClick={() => move(-1)} aria-label={view === 'month' ? 'Mes anterior' : 'Semana anterior'}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="min-w-[10rem] text-center text-base font-semibold" aria-live="polite">
                {title}
              </h2>
              <button type="button" className="btn-icon" onClick={() => move(1)} aria-label={view === 'month' ? 'Mes siguiente' : 'Semana siguiente'}>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost min-h-[36px] px-3" onClick={goToday}>
                Hoy
              </button>
              <Segmented
                label="Vista del calendario"
                value={view}
                onChange={(v) => {
                  setView(v);
                  setCursor(fromDateKey(selected));
                }}
                options={[
                  { value: 'month', label: 'Mes' },
                  { value: 'week', label: 'Semana' },
                ]}
              />
            </div>
          </div>

          {view === 'month' ? (
            <div>
              <div className="grid grid-cols-7 pb-2" aria-hidden>
                {WEEKDAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-[11px] font-medium uppercase tracking-wide text-subtle">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {days.map((key) => {
                  const date = fromDateKey(key);
                  const list = tasksByDay.get(key) ?? [];
                  const pending = list.filter((t) => t.status === 'pending');
                  const overdue = pending.some((t) => isOverdue(t, today));
                  const inMonth = date.getMonth() === currentMonth;
                  const isSel = key === selected;
                  const isToday = key === today;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={isSel}
                      onClick={() => setSelected(key)}
                      onDoubleClick={() => openTaskForm({ defaults: { dueDate: key } })}
                      aria-label={`${formatDayHeading(key)}${list.length ? `, ${plural(list.length, 'tarea', 'tareas')}` : ', sin tareas'}`}
                      className={`relative flex aspect-square flex-col items-center rounded-xl border p-1 text-sm transition-all sm:aspect-[1.15] sm:items-start sm:p-2 ${
                        isSel
                          ? 'border-primary bg-primary/15'
                          : 'border-transparent hover:border-line hover:bg-surface-2/60'
                      } ${inMonth ? '' : 'opacity-40'}`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium sm:text-sm ${
                          isToday ? 'bg-gradient-to-br from-primary to-accent font-semibold text-white' : 'text-fg'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {list.length > 0 && (
                        <span className="mt-auto flex w-full items-center justify-center gap-0.5 sm:justify-start">
                          {list.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className={`h-1.5 w-1.5 rounded-full ${t.status === 'completed' ? 'opacity-35' : ''}`}
                              style={{ backgroundColor: (t.subjectId && subjects.get(t.subjectId)?.color) || 'rgb(var(--subtle))' }}
                              aria-hidden
                            />
                          ))}
                          {list.length > 3 && <span className="ml-0.5 hidden text-[10px] text-subtle sm:inline">+{list.length - 3}</span>}
                        </span>
                      )}
                      {overdue && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" aria-hidden />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-subtle">Pulsa un día para ver sus tareas. En ordenador, con doble clic creas una tarea en esa fecha.</p>
            </div>
          ) : (
            <ol className="grid gap-2 md:grid-cols-7">
              {days.map((key) => {
                const list = tasksByDay.get(key) ?? [];
                const isSel = key === selected;
                const isToday = key === today;
                return (
                  <li
                    key={key}
                    className={`flex min-h-[7rem] flex-col rounded-xl border p-2 transition-colors ${
                      isSel ? 'border-primary bg-primary/10' : 'border-line/70 bg-surface-2/30'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(key)}
                      className="flex items-center justify-between rounded-lg px-1 py-0.5 text-left md:flex-col md:items-start"
                      aria-pressed={isSel}
                      aria-label={`${formatDayHeading(key)}, ${plural(list.length, 'tarea', 'tareas')}`}
                    >
                      <span className="text-[11px] uppercase tracking-wide text-subtle">{WEEKDAY_LABELS[(fromDateKey(key).getDay() + 6) % 7]}</span>
                      <span className={`text-lg font-semibold ${isToday ? 'text-primary-soft' : 'text-fg'}`}>{fromDateKey(key).getDate()}</span>
                    </button>
                    <ul className="mt-2 space-y-1">
                      {list.map((t) => {
                        const color = (t.subjectId && subjects.get(t.subjectId)?.color) || 'rgb(var(--subtle))';
                        return (
                          <li key={t.id} className="flex items-center gap-1.5">
                            <div className="scale-75">
                              <TaskCheck task={t} onToggle={() => toggle(t)} />
                            </div>
                            <button
                              type="button"
                              onClick={() => openTaskForm({ task: t })}
                              className={`min-w-0 flex-1 truncate rounded-md border-l-2 px-1.5 py-1 text-left text-xs hover:bg-surface-2 ${
                                t.status === 'completed' ? 'text-subtle line-through' : isOverdue(t, today) ? 'text-danger' : 'text-fg'
                              }`}
                              style={{ borderColor: color }}
                            >
                              {t.title}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={() => openTaskForm({ defaults: { dueDate: key } })}
                      className="mt-auto flex items-center justify-center gap-1 rounded-lg py-1 text-xs text-subtle hover:bg-surface-2 hover:text-fg"
                      aria-label={`Añadir tarea el ${formatDayHeading(key)}`}
                    >
                      <Plus className="h-3.5 w-3.5" /> <span className="md:hidden">Añadir</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="card p-5" aria-labelledby="day-title">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 id="day-title" className="section-title">
                {formatDayHeading(selected)}
              </h2>
              <p className="mt-0.5 text-xs text-subtle">
                {selected === today ? 'Hoy · ' : ''}
                {plural(selectedTasks.length, 'tarea', 'tareas')}
              </p>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={() => openTaskForm({ defaults: { dueDate: selected } })}
              aria-label={`Añadir tarea el ${formatDayHeading(selected)}`}
            >
              <CalendarPlus className="h-5 w-5" />
            </button>
          </div>
          {selectedTasks.length > 0 ? (
            <ul className="-mx-2 mt-3 space-y-0.5">
              {selectedTasks.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  subject={t.subjectId ? subjects.get(t.subjectId) : undefined}
                  onToggle={() => toggle(t)}
                  onEdit={() => openTaskForm({ task: t })}
                  onDelete={() => void remove(t)}
                  showDate={false}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={CalendarPlus}
              title="Día libre"
              message="No hay tareas con fecha límite este día."
              action={
                <button type="button" className="btn-secondary" onClick={() => openTaskForm({ defaults: { dueDate: selected } })}>
                  <Plus className="h-4 w-4" /> Añadir tarea
                </button>
              }
            />
          )}
        </section>
      </div>
    </>
  );
}
