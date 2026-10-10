import { CheckCircle2, Flag, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Goal } from '../../types';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import { useConfirm } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import { ProgressBar } from '../ui/ProgressBar';
import { EmptyState } from '../ui/EmptyState';
import { describeGoal, goalProgress } from '../../lib/stats';

interface Props {
  /** Muestra botones de edición y borrado. */
  editable?: boolean;
  limit?: number;
}

export function GoalsList({ editable = true, limit }: Props) {
  const { state, actions } = useStore();
  const { openGoalForm } = useUI();
  const confirm = useConfirm();
  const toast = useToast();

  const goals = limit ? state.goals.slice(0, limit) : state.goals;

  if (state.goals.length === 0) {
    return (
      <EmptyState
        compact
        icon={Flag}
        title="Sin objetivos todavía"
        message="Marca una meta diaria o semanal y sigue tu progreso con datos reales."
        action={
          <button type="button" className="btn-secondary" onClick={() => openGoalForm()}>
            <Plus className="h-4 w-4" /> Crear objetivo
          </button>
        }
      />
    );
  }

  const remove = async (goal: Goal) => {
    const ok = await confirm({
      title: 'Eliminar objetivo',
      message: <p>Se eliminará «{describeGoal(goal, state.subjects)}». Tu historial de estudio no se ve afectado.</p>,
      confirmLabel: 'Eliminar',
    });
    if (ok) {
      actions.deleteGoal(goal.id);
      toast('info', 'Objetivo eliminado');
    }
  };

  return (
    <ul className="space-y-4">
      {goals.map((g) => {
        const p = goalProgress(g, state.sessions, state.tasks);
        const subject = g.subjectId ? state.subjects.find((s) => s.id === g.subjectId) : null;
        const unit = g.metric === 'minutes' ? 'min' : g.target === 1 ? 'tarea' : 'tareas';
        const name = describeGoal(g, state.subjects);
        return (
          <li key={g.id} className="group">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
                  {p.done && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Cumplido" />}
                  <span className="truncate">{name}</span>
                </p>
                <p className="mt-0.5 text-xs text-subtle">
                  {p.value} / {p.target} {unit} · {g.period === 'day' ? 'hoy' : 'esta semana'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className={`text-sm font-semibold tabular-nums ${p.done ? 'text-success' : 'text-fg'}`}>{p.pct}%</span>
                {editable && (
                  <>
                    <button type="button" className="btn-icon h-8 w-8" onClick={() => openGoalForm({ goal: g })} aria-label={`Editar objetivo ${name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn-icon h-8 w-8 hover:bg-danger/10 hover:text-danger"
                      onClick={() => void remove(g)}
                      aria-label={`Eliminar objetivo ${name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <ProgressBar value={p.pct} label={`Progreso de ${name}`} color={p.done ? 'rgb(var(--success))' : subject?.color} />
          </li>
        );
      })}
    </ul>
  );
}
