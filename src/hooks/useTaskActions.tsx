import { useCallback } from 'react';
import type { Task } from '../types';
import { useStore } from '../store/AppStore';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';

/** Acciones de tarea con confirmaciones y avisos, compartidas entre pantallas. */
export function useTaskActions() {
  const { actions } = useStore();
  const confirm = useConfirm();
  const toast = useToast();

  const toggle = useCallback(
    (task: Task) => {
      actions.toggleTask(task.id);
      if (task.status === 'pending') toast('success', 'Tarea completada', task.title);
    },
    [actions, toast],
  );

  const remove = useCallback(
    async (task: Task) => {
      const ok = await confirm({
        title: 'Eliminar tarea',
        message: (
          <p>
            Se eliminará <strong className="text-fg">«{task.title}»</strong>. El tiempo de estudio ya registrado se conserva en
            tus estadísticas. Esta acción no se puede deshacer.
          </p>
        ),
        confirmLabel: 'Eliminar',
      });
      if (ok) {
        actions.deleteTask(task.id);
        toast('info', 'Tarea eliminada');
      }
      return ok;
    },
    [actions, confirm, toast],
  );

  return { toggle, remove };
}
