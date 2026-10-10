import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  /** Si se indica, el usuario debe escribir este texto para confirmar. */
  requireText?: string;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    setTyped('');
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  };

  const tone = opts?.tone ?? 'danger';
  const blocked = !!opts?.requireText && typed.trim() !== opts.requireText;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => close(false)}
        title={opts?.title ?? ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => close(false)} data-autofocus={!opts?.requireText || undefined}>
              Cancelar
            </button>
            <button
              type="button"
              className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
              disabled={blocked}
              onClick={() => close(true)}
            >
              {opts?.confirmLabel ?? 'Confirmar'}
            </button>
          </>
        }
      >
        <div className="flex gap-3">
          {tone === 'danger' && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
          )}
          <div className="min-w-0 space-y-3 text-sm leading-relaxed text-muted">{opts?.message}</div>
        </div>
        {opts?.requireText && (
          <div className="mt-4">
            <label className="label" htmlFor="confirm-text">
              Escribe <span className="font-mono text-fg">{opts.requireText}</span> para confirmar
            </label>
            <input
              id="confirm-text"
              className="input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              data-autofocus
            />
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx;
}
