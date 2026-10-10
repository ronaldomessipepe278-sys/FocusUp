import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Bell, Database, Download, HardDrive, Moon, Palette, Sun, Timer, Trash2, Upload, User, Volume2, BookOpen, Target } from 'lucide-react';
import type { Settings } from '../types';
import { useStore } from '../store/AppStore';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Field, Toggle } from '../components/ui/Field';
import { SubjectManager } from '../components/subjects/SubjectManager';
import { LIMITS, exportData, parseAppData } from '../lib/storage';
import { notificationPermission, playChime, requestNotificationPermission, showNotification } from '../lib/notify';
import { plural } from '../lib/format';

function Section({ icon: Icon, title, description, children }: { icon: typeof User; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-5 md:p-6" aria-labelledby={`sec-${title}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div>
          <h2 id={`sec-${title}`} className="section-title">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

type NumKey = keyof typeof LIMITS;
const TIMER_FIELDS: { key: NumKey; label: string }[] = [
  { key: 'focusMin', label: 'Concentración (min)' },
  { key: 'shortBreakMin', label: 'Descanso corto (min)' },
  { key: 'longBreakMin', label: 'Descanso largo (min)' },
  { key: 'longBreakEvery', label: 'Descanso largo cada (sesiones)' },
];

function NumberSettingsForm({
  fields,
  submitLabel,
  onSaved,
}: {
  fields: { key: NumKey; label: string }[];
  submitLabel: string;
  onSaved: (patch: Partial<Settings>) => void;
}) {
  const { state } = useStore();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, String(state.settings[f.key])])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = fields.some((f) => values[f.key] !== String(state.settings[f.key]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const patch: Partial<Settings> = {};
    for (const f of fields) {
      const [min, max] = LIMITS[f.key];
      const n = Number(values[f.key]);
      if (values[f.key].trim() === '' || !Number.isInteger(n) || n < min || n > max) errs[f.key] = `Entre ${min} y ${max}.`;
      else patch[f.key] = n;
    }
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSaved(patch);
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className={`grid gap-4 ${fields.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {fields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`set-${f.key}`} error={errors[f.key]}>
            <input
              id={`set-${f.key}`}
              type="number"
              inputMode="numeric"
              className="input"
              min={LIMITS[f.key][0]}
              max={LIMITS[f.key][1]}
              value={values[f.key]}
              onChange={(e) => {
                setValues((v) => ({ ...v, [f.key]: e.target.value }));
                setErrors((er) => ({ ...er, [f.key]: '' }));
              }}
              aria-invalid={!!errors[f.key]}
            />
          </Field>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" className="btn-primary" disabled={!dirty}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function SettingsPage() {
  const { state, actions } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const { settings } = state;
  const fileRef = useRef<HTMLInputElement>(null);
  const [permission, setPermission] = useState(notificationPermission);

  const onNotifications = async (on: boolean) => {
    if (!on) return actions.updateSettings({ notifications: false });
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      actions.updateSettings({ notifications: true });
      showNotification('Notificaciones activadas', 'Te avisaremos cuando termine cada período.');
    } else if (result === 'unsupported') {
      toast('error', 'No disponible', 'Este navegador no admite notificaciones. Seguirás viendo avisos dentro de la app.');
    } else {
      toast('error', 'Permiso denegado', 'Puedes habilitarlo en la configuración del sitio de tu navegador. La app sigue funcionando sin notificaciones.');
    }
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('error', 'Archivo demasiado grande', 'El límite es 10 MB.');
      return;
    }
    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('El archivo no contiene JSON válido.');
      }
      const { data, dropped } = parseAppData(json);
      const ok = await confirm({
        title: 'Importar copia de seguridad',
        tone: 'primary',
        confirmLabel: 'Reemplazar mis datos',
        message: (
          <>
            <p>El archivo contiene:</p>
            <ul className="list-disc pl-5">
              <li>{plural(data.tasks.length, 'tarea', 'tareas')}</li>
              <li>{plural(data.subjects.length, 'asignatura', 'asignaturas')}</li>
              <li>{plural(data.goals.length, 'objetivo', 'objetivos')}</li>
              <li>{plural(data.sessions.length, 'sesión registrada', 'sesiones registradas')}</li>
            </ul>
            {dropped > 0 && <p className="text-warning">Se omitirán {plural(dropped, 'registro no válido', 'registros no válidos')}.</p>}
            <p>
              <strong className="text-fg">Tus datos actuales se reemplazarán.</strong> Si quieres conservarlos, exporta antes una copia.
            </p>
          </>
        ),
      });
      if (ok) {
        actions.replaceData(data);
        toast('success', 'Copia importada', 'Tus datos se han restaurado.');
      }
    } catch (err) {
      toast('error', 'No se pudo importar', err instanceof Error ? err.message : 'Archivo no válido.');
    }
  };

  const onReset = async () => {
    const ok = await confirm({
      title: 'Borrar todos los datos',
      confirmLabel: 'Borrar todo',
      requireText: 'BORRAR',
      message: (
        <>
          <p>
            Se eliminarán de este navegador <strong className="text-fg">todas</strong> tus tareas, asignaturas, objetivos, sesiones y preferencias. Las
            asignaturas iniciales se restaurarán.
          </p>
          <p>Esta acción no se puede deshacer. Te recomendamos exportar antes una copia.</p>
        </>
      ),
    });
    if (ok) {
      actions.resetData();
      toast('info', 'Datos borrados', 'FocusUp ha vuelto a su estado inicial.');
    }
  };

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Personaliza FocusUp y gestiona tus datos." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Section icon={User} title="Perfil">
            <Field label="Tu nombre" htmlFor="set-name" hint="Se usa en el saludo del dashboard.">
              <input
                id="set-name"
                className="input"
                value={settings.userName}
                maxLength={40}
                placeholder="¿Cómo te llamas?"
                autoComplete="given-name"
                onChange={(e) => actions.updateSettings({ userName: e.target.value })}
              />
            </Field>
          </Section>

          <Section icon={Palette} title="Apariencia">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-fg">Tema</span>
              <Segmented
                label="Tema"
                value={settings.theme}
                onChange={(theme) => actions.updateSettings({ theme })}
                options={[
                  { value: 'dark', label: 'Oscuro' },
                  { value: 'light', label: 'Claro' },
                ]}
              />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
              {settings.theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              Se aplica a todas las secciones.
            </p>
          </Section>

          <Section icon={Timer} title="Temporizador" description="Los cambios se aplican al siguiente período que empieces.">
            <NumberSettingsForm
              key={`${settings.focusMin}-${settings.shortBreakMin}-${settings.longBreakMin}-${settings.longBreakEvery}`}
              fields={TIMER_FIELDS}
              submitLabel="Guardar duraciones"
              onSaved={(patch) => {
                actions.updateSettings(patch);
                toast('success', 'Duraciones guardadas');
              }}
            />
          </Section>

          <Section icon={Target} title="Objetivo diario de estudio" description="Minutos de concentración que quieres alcanzar cada día. Usa 0 para desactivarlo.">
            <NumberSettingsForm
              key={settings.dailyGoalMin}
              fields={[{ key: 'dailyGoalMin', label: 'Minutos al día' }]}
              submitLabel="Guardar objetivo"
              onSaved={(patch) => {
                actions.updateSettings(patch);
                toast('success', 'Objetivo diario guardado');
              }}
            />
          </Section>

          <Section icon={Bell} title="Notificaciones y sonido">
            <div className="space-y-4">
              <Toggle
                id="set-notif"
                checked={settings.notifications && permission === 'granted'}
                onChange={(v) => void onNotifications(v)}
                label="Notificaciones del navegador"
                description={
                  permission === 'unsupported'
                    ? 'Este navegador no admite notificaciones.'
                    : permission === 'denied'
                      ? 'Permiso bloqueado en el navegador. Actívalo en la configuración del sitio.'
                      : 'Aviso al terminar cada período, aunque la pestaña esté en segundo plano.'
                }
              />
              <Toggle
                id="set-sound"
                checked={settings.sound}
                onChange={(sound) => actions.updateSettings({ sound })}
                label="Sonido al terminar"
                description="Una campanilla breve."
              />
              <button type="button" className="btn-ghost -ml-2 min-h-[36px] px-2 text-xs" onClick={playChime}>
                <Volume2 className="h-4 w-4" /> Probar sonido
              </button>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section icon={BookOpen} title="Asignaturas" description="Crea, renombra y colorea tus asignaturas.">
            <SubjectManager />
          </Section>

          <Section icon={Database} title="Tus datos">
            <div className="mb-5 flex gap-3 rounded-xl border border-accent/30 bg-accent/10 p-3.5 text-sm">
              <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              <p className="text-muted">
                FocusUp guarda todo <strong className="text-fg">solo en este navegador</strong> (almacenamiento local). No hay cuentas ni servidor, y los
                datos <strong className="text-fg">no se sincronizan</strong> entre dispositivos. Si borras los datos del navegador, se perderán: exporta copias
                de vez en cuando.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  exportData(state);
                  toast('success', 'Copia exportada', 'Se ha descargado un archivo JSON.');
                }}
              >
                <Download className="h-4 w-4" /> Exportar copia (JSON)
              </button>
              <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Importar copia
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} aria-label="Archivo de copia de seguridad" />
            </div>
            <div className="mt-6 border-t border-line/70 pt-5">
              <p className="text-sm font-medium text-fg">Zona de peligro</p>
              <p className="mt-1 text-sm text-muted">Elimina todos los datos de FocusUp de este navegador.</p>
              <button type="button" className="btn mt-3 border border-danger/40 text-danger hover:bg-danger/10" onClick={() => void onReset()}>
                <Trash2 className="h-4 w-4" /> Borrar todos los datos
              </button>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
