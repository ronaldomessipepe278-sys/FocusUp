import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, PartyPopper, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info' | 'celebrate';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

type ToastFn = (kind: ToastKind, title: string, message?: string) => void;

const ToastContext = createContext<ToastFn | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
  celebrate: PartyPopper,
};

const TONE: Record<ToastKind, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
  celebrate: 'text-primary-soft',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const push = useCallback<ToastFn>(
    (kind, title, message) => {
      const id = nextId.current++;
      setItems((xs) => [...xs.slice(-3), { id, kind, title, message }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card ${
                t.kind === 'celebrate' ? 'shadow-glow' : ''
              }`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${TONE[t.kind]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{t.title}</p>
                {t.message && <p className="mt-0.5 text-sm text-muted">{t.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-m-1 rounded-lg p-1 text-subtle hover:text-fg"
                aria-label="Cerrar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
