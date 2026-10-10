import { useState, type FormEvent } from 'react';
import type { Goal, GoalMetric, GoalPeriod } from '../../types';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { useStore } from '../../store/AppStore';
import { useToast } from '../ui/Toast';
import { describeGoal } from '../../lib/stats';

export interface GoalFormRequest {
  goal?: Goal;
}

interface Props {
  request: GoalFormRequest;
  onClose: () => void;
}

interface FormState {
  title: string;
  metric: GoalMetric;
  period: GoalPeriod;
  target: string;
  subjectId: string;
}

export function GoalFormModal({ request, onClose }: Props) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => {
    const g = request.goal;
    return {
      title: g?.title ?? '',
      metric: g?.metric ?? 'minutes',
      period: g?.period ?? 'day',
      target: g ? String(g.target) : '90',
      subjectId: g?.subjectId ?? '',
    };
  });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const max = form.metric === 'minutes' ? (form.period === 'day' ? 960 : 6720) : 200;
  const targetNum = Number(form.target);
  const valid = Number.isInteger(targetNum) && targetNum >= 1 && targetNum <= max;

  const draft: Goal = {
    id: 'preview',
    createdAt: '',
    title: form.title,
    metric: form.metric,
    period: form.period,
    target: valid ? targetNum : 0,
    subjectId: form.metric === 'minutes' ? form.subjectId || null : null,
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setError(`Introduce un número entero entre 1 y ${max}.`);
      return;
    }
    const payload = {
      title: form.title.trim(),
      metric: form.metric,
      period: form.period,
      target: targetNum,
      subjectId: draft.subjectId,
    };
    if (request.goal) {
      actions.updateGoal(request.goal.id, payload);
      toast('success', 'Objetivo actualizado');
    } else {
      actions.addGoal(payload);
      toast('success', 'Objetivo creado', describeGoal(draft, state.subjects));
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={request.goal ? 'Editar objetivo' : 'Nuevo objetivo'}
      description="El progreso se calcula con tu actividad real: sesiones registradas y tareas completadas."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="goal-form" className="btn-primary">
            {request.goal ? 'Guardar cambios' : 'Crear objetivo'}
          </button>
        </>
      }
    >
      <form id="goal-form" onSubmit={submit} noValidate className="space-y-4">
        <div>
          <span className="label">Tipo de objetivo</span>
          <Segmented
            label="Tipo de objetivo"
            className="w-full"
            value={form.metric}
            onChange={(v) => {
              set('metric', v);
              set('target', v === 'minutes' ? '90' : '5');
              setError(null);
            }}
            options={[
              { value: 'minutes', label: 'Minutos de estudio' },
              { value: 'tasks', label: 'Tareas completadas' },
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={form.metric === 'minutes' ? 'Minutos' : 'Número de tareas'}
            htmlFor="goal-target"
            error={error}
          >
            <input
              id="goal-target"
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              className="input"
              value={form.target}
              onChange={(e) => {
                set('target', e.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
              data-autofocus
            />
          </Field>
          <div>
            <span className="label">Período</span>
            <Segmented
              label="Período"
              className="w-full"
              value={form.period}
              onChange={(v) => set('period', v)}
              options={[
                { value: 'day', label: 'Cada día' },
                { value: 'week', label: 'Cada semana' },
              ]}
            />
          </div>
        </div>

        {form.metric === 'minutes' && (
          <Field
            label="Asignatura"
            htmlFor="goal-subject"
            hint="Solo cuentan las sesiones vinculadas a una tarea de esta asignatura."
          >
            <select id="goal-subject" className="input" value={form.subjectId} onChange={(e) => set('subjectId', e.target.value)}>
              <option value="">Cualquier asignatura</option>
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Nombre personalizado" htmlFor="goal-title" optional>
          <input
            id="goal-title"
            className="input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={describeGoal({ ...draft, title: '' }, state.subjects)}
            maxLength={80}
          />
        </Field>
      </form>
    </Modal>
  );
}
