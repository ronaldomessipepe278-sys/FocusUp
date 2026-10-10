import { Pause, Play } from 'lucide-react';
import { useTimer } from '../../store/TimerContext';
import { formatClock } from '../../lib/format';
import { MODE_LABEL } from '../../lib/timer';

/** Indicador compacto del temporizador, visible fuera de su sección. */
export function TimerPill({ compact = false }: { compact?: boolean }) {
  const { timer, remainingMs, toggle } = useTimer();
  if (timer.status === 'idle' && timer.startedAt === null) return null;

  const running = timer.status === 'running';
  const isFocus = timer.mode === 'focus';

  return (
    <div
      className={`flex items-center gap-1 rounded-xl border bg-surface-2/70 p-1 ${
        isFocus ? 'border-primary/40' : 'border-success/40'
      } ${compact ? '' : 'w-full'}`}
    >
      <a
        href="#/temporizador"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1"
        aria-label={`${MODE_LABEL[timer.mode]}: quedan ${formatClock(remainingMs)}. Abrir temporizador`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${isFocus ? 'bg-primary' : 'bg-success'} ${running ? 'animate-pulse-soft' : ''}`}
          aria-hidden
        />
        {!compact && <span className="truncate text-xs text-muted">{MODE_LABEL[timer.mode]}</span>}
        <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-fg">{formatClock(remainingMs)}</span>
      </a>
      <button
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-fg"
        aria-label={running ? 'Pausar temporizador' : 'Reanudar temporizador'}
      >
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </div>
  );
}
