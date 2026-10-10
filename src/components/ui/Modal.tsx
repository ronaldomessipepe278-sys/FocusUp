import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'md:max-w-md', md: 'md:max-w-lg', lg: 'md:max-w-2xl' };
const modalStack: symbol[] = [];
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Enfoca el primer campo (o el primer control) del diálogo.
    const first =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>('input, select, textarea') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const token = Symbol('modal');
    modalStack.push(token);

    const onKey = (e: KeyboardEvent) => {
      // Solo el diálogo superior responde al teclado.
      if (modalStack[modalStack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && panel) {
        const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!nodes.length) return;
        const firstEl = nodes[0];
        const lastEl = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      modalStack.splice(modalStack.indexOf(token), 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`relative flex max-h-[92dvh] w-full animate-slide-up flex-col rounded-t-3xl border border-line bg-surface shadow-card md:animate-scale-in md:rounded-3xl ${SIZES[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line/70 px-5 pb-4 pt-5 md:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn-icon -mr-2 -mt-1" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line/70 px-5 py-4 sm:flex-row sm:justify-end md:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
