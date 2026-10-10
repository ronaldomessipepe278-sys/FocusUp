import { useState, type FormEvent } from 'react';
import { Check, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Subject } from '../../types';
import { useStore } from '../../store/AppStore';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { SUBJECT_COLORS } from '../../lib/storage';
import { hrefFor } from '../../hooks/useRoute';
import { plural } from '../../lib/format';
import { describeGoal } from '../../lib/stats';

function ColorPicker({ value, onChange, idPrefix }: { value: string; onChange: (c: string) => void; idPrefix: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Color de la asignatura">
      {SUBJECT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value.toLowerCase() === c}
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={`flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110 ${
            value.toLowerCase() === c ? 'ring-2 ring-fg' : ''
          }`}
          style={{ backgroundColor: c }}
        >
          {value.toLowerCase() === c && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
        </button>
      ))}
      <label className="relative flex h-7 items-center gap-1.5 rounded-full border border-line px-2 text-xs text-muted hover:text-fg" htmlFor={`${idPrefix}-custom`}>
        Otro
        <input
          id={`${idPrefix}-custom`}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      </label>
    </div>
  );
}

interface EditorState {
  subject?: Subject;
  name: string;
  color: string;
}

export function SubjectManager() {
  const { state, actions } = useStore();
  const toast = useToast();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [moveTo, setMoveTo] = useState('');

  const taskCount = (id: string) => state.tasks.filter((t) => t.subjectId === id).length;

  const openEditor = (subject?: Subject) => {
    const used = new Set(state.subjects.map((s) => s.color));
    setEditor({
      subject,
      name: subject?.name ?? '',
      color: subject?.color ?? SUBJECT_COLORS.find((c) => !used.has(c)) ?? SUBJECT_COLORS[0],
    });
    setEditorError(null);
  };

  const saveEditor = (e: FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) return setEditorError('Escribe un nombre.');
    if (name.length > 40) return setEditorError('Máximo 40 caracteres.');
    const duplicate = state.subjects.some(
      (s) => s.id !== editor.subject?.id && s.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'),
    );
    if (duplicate) return setEditorError('Ya existe una asignatura con ese nombre.');
    if (editor.subject) {
      actions.updateSubject(editor.subject.id, { name, color: editor.color });
      toast('success', 'Asignatura actualizada');
    } else {
      actions.addSubject({ name, color: editor.color });
      toast('success', 'Asignatura creada', name);
    }
    setEditor(null);
  };

  const startDelete = (s: Subject) => {
    setDeleting(s);
    setMoveTo('');
  };

  const confirmDelete = () => {
    if (!deleting) return;
    actions.deleteSubject(deleting.id, moveTo || null);
    toast('info', 'Asignatura eliminada', deleting.name);
    setDeleting(null);
  };

  const affectedTasks = deleting ? taskCount(deleting.id) : 0;
  const affectedSessions = deleting ? state.sessions.filter((s) => s.subjectId === deleting.id).length : 0;
  const affectedGoals = deleting ? state.goals.filter((g) => g.subjectId === deleting.id) : [];
  const target = state.subjects.find((s) => s.id === moveTo);

  return (
    <div>
      {state.subjects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">No tienes asignaturas. Crea la primera.</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {state.subjects.map((s) => {
            const n = taskCount(s.id);
            return (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{s.name}</p>
                  <p className="text-xs text-subtle">{plural(n, 'tarea', 'tareas')}</p>
                </div>
                <a
                  href={hrefFor('tareas', { asignatura: s.id })}
                  className="btn-icon h-9 w-9"
                  aria-label={`Ver tareas de ${s.name}`}
                  title="Ver tareas"
                >
                  <ListChecks className="h-4 w-4" />
                </a>
                <button type="button" className="btn-icon h-9 w-9" onClick={() => openEditor(s)} aria-label={`Editar ${s.name}`} title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn-icon h-9 w-9 hover:bg-danger/10 hover:text-danger"
                  onClick={() => startDelete(s)}
                  aria-label={`Eliminar ${s.name}`}
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className="btn-secondary mt-3 w-full sm:w-auto" onClick={() => openEditor()}>
        <Plus className="h-4 w-4" /> Nueva asignatura
      </button>

      {editor && (
        <Modal
          open
          size="sm"
          onClose={() => setEditor(null)}
          title={editor.subject ? 'Editar asignatura' : 'Nueva asignatura'}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setEditor(null)}>
                Cancelar
              </button>
              <button type="submit" form="subject-form" className="btn-primary">
                Guardar
              </button>
            </>
          }
        >
          <form id="subject-form" onSubmit={saveEditor} className="space-y-4" noValidate>
            <Field label="Nombre" htmlFor="subject-name" error={editorError}>
              <input
                id="subject-name"
                className="input"
                value={editor.name}
                maxLength={40}
                onChange={(e) => {
                  setEditor({ ...editor, name: e.target.value });
                  setEditorError(null);
                }}
                placeholder="Ej.: Química"
                aria-invalid={!!editorError}
                data-autofocus
              />
            </Field>
            <div>
              <span className="label">Color</span>
              <ColorPicker value={editor.color} onChange={(color) => setEditor({ ...editor, color })} idPrefix="subject" />
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          open
          size="sm"
          onClose={() => setDeleting(null)}
          title={`Eliminar «${deleting.name}»`}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setDeleting(null)} data-autofocus>
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={confirmDelete}>
                Eliminar asignatura
              </button>
            </>
          }
        >
          {affectedTasks + affectedSessions + affectedGoals.length === 0 ? (
            <p className="text-sm text-muted">Esta asignatura no tiene tareas, sesiones ni objetivos asociados. Se eliminará sin afectar a nada más.</p>
          ) : (
            <div className="space-y-4 text-sm text-muted">
              <p>No se perderá ningún dato. Esto es lo que ocurrirá:</p>
              <ul className="list-disc space-y-1 pl-5">
                {affectedTasks > 0 && <li>{plural(affectedTasks, 'tarea se conservará', 'tareas se conservarán')} y se moverán al destino elegido.</li>}
                {affectedSessions > 0 && (
                  <li>{plural(affectedSessions, 'sesión registrada pasará', 'sesiones registradas pasarán')} al destino elegido en las estadísticas.</li>
                )}
                {affectedGoals.map((g) => (
                  <li key={g.id}>
                    El objetivo «{describeGoal(g, state.subjects)}»{' '}
                    {target ? `pasará a contar el tiempo de ${target.name}.` : 'pasará a contar el tiempo de cualquier asignatura.'}
                  </li>
                ))}
              </ul>
              <Field label="Mover a" htmlFor="subject-move">
                <select id="subject-move" className="input" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                  <option value="">Sin asignatura</option>
                  {state.subjects
                    .filter((s) => s.id !== deleting.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
