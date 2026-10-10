import { AlertCircle, CalendarClock, Check, Clock, Pencil, Trash2 } from 'lucide-react';
import type { Subject, Task } from '../../types';
import { formatShortDate, relativeDue, todayKey } from '../../lib/dates';
import { isOverdue } from '../../lib/stats';
import { formatMinutes } from '../../lib/format';
import { PRIORITY_LABEL, PRIORITY_STYLE } from './taskMeta';

export function SubjectBadge({ subject }: { subject: Subject | undefined | null }) {
  if (!subject) return <span className="chip bg-surface-2 text-subtle">Sin asignatura</span>;
  return (
    <span className="chip max-w-[11rem] bg-surface-2 text-muted">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} aria-hidden />
      <span className="truncate">{subject.name}</span>
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  return <span className={`chip ${PRIORITY_STYLE[priority]}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function TaskCheck({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const done = task.status === 'completed';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      onClick={onToggle}
      aria-label={done ? `Marcar «${task.title}» como pendiente` : `Marcar «${task.title}» como completada`}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110 ${
        done ? 'border-transparent bg-gradient-to-br from-primary to-accent text-white' : 'border-line hover:border-primary'
      }`}
    >
      {done && <Check className="h-3.5 w-3.5 animate-scale-in" strokeWidth={3} />}
    </button>
  );
}

interface TaskItemProps {
  task: Task;
  subject: Subject | undefined;
  onToggle: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}

export function TaskItem({ task, subject, onToggle, onEdit, onDelete, showDate = true }: TaskItemProps) {
  const done = task.status === 'completed';
  const overdue = isOverdue(task);
  const today = todayKey();

  return (
    <li
      className={`group flex items-start gap-3 rounded-xl border px-3 py-3 transition-all duration-200 hover:border-line hover:bg-surface-2/50 ${
        overdue ? 'border-danger/30 bg-danger/[0.04]' : 'border-transparent'
      }`}
    >
      <div className="pt-0.5">
        <TaskCheck task={task} onToggle={onToggle} />
      </div>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 rounded-lg text-left" aria-label={`Editar tarea «${task.title}»`}>
        <p className={`truncate text-sm font-medium transition-colors ${done ? 'text-subtle line-through' : 'text-fg'}`}>{task.title}</p>
        {task.description && <p className="mt-0.5 line-clamp-1 text-xs text-subtle">{task.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SubjectBadge subject={subject} />
          <PriorityBadge priority={task.priority} />
          {showDate && (
            <span
              className={`chip ${overdue ? 'bg-danger/15 text-danger' : task.dueDate === today && !done ? 'bg-accent/15 text-accent' : 'text-subtle'}`}
              title={formatShortDate(task.dueDate)}
            >
              {overdue ? <AlertCircle className="h-3 w-3" aria-hidden /> : <CalendarClock className="h-3 w-3" aria-hidden />}
              {overdue ? `Vencida · ${relativeDue(task.dueDate, today).toLowerCase()}` : relativeDue(task.dueDate, today)}
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="chip text-subtle">
              <Clock className="h-3 w-3" aria-hidden />
              {formatMinutes(task.estimatedMinutes)}
            </span>
          )}
        </div>
      </button>
      <div className="flex shrink-0 items-center opacity-100 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
        <button type="button" onClick={onEdit} className="btn-icon h-8 w-8" aria-label={`Editar «${task.title}»`}>
          <Pencil className="h-4 w-4" />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="btn-icon h-8 w-8 hover:bg-danger/10 hover:text-danger"
            aria-label={`Eliminar «${task.title}»`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
}
