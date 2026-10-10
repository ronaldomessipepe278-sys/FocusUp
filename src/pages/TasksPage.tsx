import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, CircleDashed, ListTodo, Plus, Search, SearchX, X } from 'lucide-react';
import type { Priority, Task } from '../types';
import { useStore, useSubjectMap } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useTaskActions } from '../hooks/useTaskActions';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/ui/EmptyState';
import { TaskItem } from '../components/tasks/TaskItem';
import { PRIORITY_LABEL } from '../components/tasks/taskMeta';
import { PRIORITY_WEIGHT, isOverdue } from '../lib/stats';
import { todayKey } from '../lib/dates';
import { plural } from '../lib/format';

type View = 'today' | 'all';
type StatusFilter = 'all' | 'pending' | 'completed' | 'overdue';
type SortKey = 'due' | 'priority' | 'created';

const SORTERS: Record<SortKey, (a: Task, b: Task) => number> = {
  due: (a, b) => a.dueDate.localeCompare(b.dueDate) || PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority],
  priority: (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.dueDate.localeCompare(b.dueDate),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

export function TasksPage({ params }: { params: URLSearchParams }) {
  const { state } = useStore();
  const subjects = useSubjectMap();
  const { openTaskForm } = useUI();
  const { toggle, remove } = useTaskActions();

  const [view, setView] = useState<View>(params.get('asignatura') ? 'all' : 'today');
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(params.get('asignatura') ?? 'all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('due');

  // Permite llegar filtrado desde Ajustes → Asignaturas.
  useEffect(() => {
    const s = params.get('asignatura');
    if (s) {
      setSubjectFilter(s);
      setView('all');
    }
  }, [params]);

  const today = todayKey();
  const tasks = state.tasks;
  const counts = useMemo(
    () => ({
      pending: tasks.filter((t) => t.status === 'pending').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      overdue: tasks.filter((t) => isOverdue(t, today)).length,
    }),
    [tasks, today],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es');
    return tasks
      .filter((t) => {
        if (view === 'today' && !(t.dueDate === today || isOverdue(t, today))) return false;
        if (q && !t.title.toLocaleLowerCase('es').includes(q)) return false;
        if (subjectFilter === 'none' ? t.subjectId !== null : subjectFilter !== 'all' && t.subjectId !== subjectFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (statusFilter === 'overdue') return isOverdue(t, today);
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // Las completadas siempre al final, salvo que se filtren explícitamente.
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return SORTERS[sort](a, b);
      });
  }, [tasks, view, query, subjectFilter, priorityFilter, statusFilter, sort, today]);

  const hasFilters = query !== '' || subjectFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => {
    setQuery('');
    setSubjectFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    if (params.get('asignatura')) window.location.hash = '#/tareas';
  };

  const newTaskButton = (
    <button type="button" className="btn-primary" onClick={() => openTaskForm()}>
      <Plus className="h-4 w-4" /> Nueva tarea
    </button>
  );

  return (
    <>
      <PageHeader title="Mis tareas" subtitle="Organiza tus entregas, exámenes y repasos." actions={newTaskButton} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Counter icon={CircleDashed} label="Pendientes" value={counts.pending} tone="text-accent" />
        <Counter icon={CheckCircle2} label="Completadas" value={counts.completed} tone="text-success" />
        <Counter icon={AlertCircle} label="Vencidas" value={counts.overdue} tone="text-danger" />
      </div>

      <section className="card p-3 md:p-4" aria-label="Lista de tareas">
        <div className="flex flex-col gap-3 border-b border-line/70 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Segmented
              label="Vista"
              value={view}
              onChange={setView}
              options={[
                { value: 'today', label: 'Hoy' },
                { value: 'all', label: 'Todas' },
              ]}
              className="w-full sm:w-auto"
            />
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                type="search"
                className="input pl-9"
                placeholder="Buscar por título"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar tareas por título"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <select className="input" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label="Filtrar por asignatura">
              <option value="all">Todas las asignaturas</option>
              <option value="none">Sin asignatura</option>
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
              aria-label="Filtrar por prioridad"
            >
              <option value="all">Cualquier prioridad</option>
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <option key={p} value={p}>
                  Prioridad {PRIORITY_LABEL[p].toLowerCase()}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filtrar por estado"
            >
              <option value="all">Cualquier estado</option>
              <option value="pending">Pendientes</option>
              <option value="completed">Completadas</option>
              <option value="overdue">Vencidas</option>
            </select>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar tareas">
              <option value="due">Ordenar: fecha límite</option>
              <option value="priority">Ordenar: prioridad</option>
              <option value="created">Ordenar: más recientes</option>
            </select>
          </div>
          {hasFilters && (
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{plural(filtered.length, 'resultado', 'resultados')}</span>
              <button type="button" className="inline-flex items-center gap-1 rounded-md px-1 text-primary-soft hover:underline" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Todavía no tienes tareas"
            message="Apunta tu primera entrega, examen o repaso y FocusUp te ayudará a no perderla de vista."
            action={
              <button type="button" className="btn-primary" onClick={() => openTaskForm()}>
                <Plus className="h-4 w-4" /> Crear mi primera tarea
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="Sin coincidencias"
              message="Ninguna tarea cumple estos filtros."
              action={
                <button type="button" className="btn-secondary" onClick={clearFilters}>
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Nada pendiente para hoy"
              message="No tienes tareas que venzan hoy ni tareas atrasadas."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setView('all')}>
                    Ver todas
                  </button>
                  <button type="button" className="btn-primary" onClick={() => openTaskForm({ defaults: { dueDate: today } })}>
                    <Plus className="h-4 w-4" /> Tarea para hoy
                  </button>
                </div>
              }
            />
          )
        ) : (
          <ul className="mt-2 space-y-0.5">
            {filtered.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                subject={t.subjectId ? subjects.get(t.subjectId) : undefined}
                onToggle={() => toggle(t)}
                onEdit={() => openTaskForm({ task: t })}
                onDelete={() => void remove(t)}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Counter({ icon: Icon, label, value, tone }: { icon: typeof ListTodo; label: string; value: number; tone: string }) {
  return (
    <div className="card flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <Icon className={`h-5 w-5 ${tone}`} aria-hidden />
      <div>
        <p className="text-xl font-bold tabular-nums text-fg">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}
