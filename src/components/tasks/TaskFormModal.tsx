import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { DateKey, Priority, Task } from '../../types';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { useStore } from '../../store/AppStore';
import { useTaskActions } from '../../hooks/useTaskActions';
import { useToast } from '../ui/Toast';
import { isValidDateKey, todayKey } from '../../lib/dates';
import { PRIORITY_LABEL } from './taskMeta';

export interface TaskFormRequest {
  task?: Task;
  defaults?: { dueDate?: DateKey; subjectId?: string | null };
}

interface Props {
  request: TaskFormRequest;
  onClose: () => void;
}

interface FormState {
  title: string;
  description: string;
  subjectId: string;
  dueDate: string;
  priority: Priority;
  estimated: string;
  completed: boolean;
}

type Errors = Partial<Record<'title' | 'dueDate' | 'estimated', string>>;

function initialForm(req: TaskFormRequest): FormState {
  const t = req.task;
  return {
    title: t?.title ?? '',
    description: t?.description ?? '',
    subjectId: t?.subjectId ?? req.defaults?.subjectId ?? '',
    dueDate: t?.dueDate ?? req.defaults?.dueDate ?? todayKey(),
    priority: t?.priority ?? 'medium',
    estimated: t?.estimatedMinutes ? String(t.estimatedMinutes) : '',
    completed: t?.status === 'completed',
  };
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.title.trim()) e.title = 'Escribe un título para la tarea.';
  else if (f.title.trim().length > 120) e.title = 'El título no puede superar los 120 caracteres.';
  if (!isValidDateKey(f.dueDate)) e.dueDate = 'Indica una fecha límite válida.';
  if (f.estimated.trim()) {
    const n = Number(f.estimated);
    if (!Number.isInteger(n) || n < 1 || n > 600) e.estimated = 'Introduce un número entero de minutos entre 1 y 600.';
  }
  return e;
}

export function TaskFormModal({ request, onClose }: Props) {
  const { state, actions } = useStore();
  const { remove: removeTask } = useTaskActions();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => initialForm(request));
  const [errors, setErrors] = useState<Errors>({});
  const editing = !!request.task;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      subjectId: form.subjectId || null,
      dueDate: form.dueDate,
      priority: form.priority,
      estimatedMinutes: form.estimated.trim() ? Number(form.estimated) : null,
      status: form.completed ? ('completed' as const) : ('pending' as const),
    };
    if (request.task) {
      actions.updateTask(request.task.id, payload);
      toast('success', 'Tarea actualizada');
    } else {
      actions.addTask(payload);
      toast('success', 'Tarea creada', payload.title);
    }
    onClose();
  };

  const remove = async () => {
    if (request.task && (await removeTask(request.task))) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Editar tarea' : 'Nueva tarea'}
      footer={
        <>
          {editing && (
            <button type="button" onClick={remove} className="btn-ghost text-danger hover:bg-danger/10 hover:text-danger sm:mr-auto">
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="task-form" className="btn-primary">
            {editing ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Título" htmlFor="task-title" error={errors.title}>
          <input
            id="task-title"
            className="input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ej.: Resolver ejercicios de derivadas"
            maxLength={120}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'task-title-error' : undefined}
            data-autofocus
          />
        </Field>

        <Field label="Descripción" htmlFor="task-desc" optional>
          <textarea
            id="task-desc"
            className="input min-h-[84px] resize-y py-2.5"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Detalles, páginas, enlaces..."
            maxLength={1000}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Asignatura" htmlFor="task-subject">
            <select id="task-subject" className="input" value={form.subjectId} onChange={(e) => set('subjectId', e.target.value)}>
              <option value="">Sin asignatura</option>
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha límite" htmlFor="task-due" error={errors.dueDate}>
            <input
              id="task-due"
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
              aria-invalid={!!errors.dueDate}
              required
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="label" id="task-priority-label">
              Prioridad
            </span>
            <Segmented
              label="Prioridad"
              value={form.priority}
              onChange={(v) => set('priority', v)}
              options={(['low', 'medium', 'high'] as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
              className="w-full"
            />
          </div>
          <Field label="Tiempo estimado (min)" htmlFor="task-est" optional error={errors.estimated}>
            <input
              id="task-est"
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              className="input"
              value={form.estimated}
              onChange={(e) => set('estimated', e.target.value)}
              placeholder="Ej.: 45"
              aria-invalid={!!errors.estimated}
            />
          </Field>
        </div>

        {editing && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.completed}
              onChange={(e) => set('completed', e.target.checked)}
              className="h-4 w-4 accent-[rgb(var(--primary))]"
            />
            <span className="text-sm text-fg">Marcar como completada</span>
          </label>
        )}
      </form>
    </Modal>
  );
}
