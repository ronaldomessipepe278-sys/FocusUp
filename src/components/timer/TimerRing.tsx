import type { ReactNode } from 'react';

interface Props {
  progress: number; // 0..1
  variant: 'focus' | 'break';
  active: boolean;
  children: ReactNode;
  size?: number;
  stroke?: number;
}

/** Indicador circular de progreso. */
export function TimerRing({ progress, variant, active, children, size = 300, stroke = 10 }: Props) {
  const r = (size - stroke) / 2 - 6;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const gradId = `ring-${variant}`;

  return (
    <div className="relative mx-auto aspect-square w-full" style={{ maxWidth: size }}>
      <div
        className={`absolute inset-[12%] rounded-full blur-3xl transition-opacity duration-700 ${active ? 'opacity-60' : 'opacity-25'} ${
          variant === 'focus' ? 'bg-primary/40' : 'bg-success/35'
        }`}
        aria-hidden
      />
      <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            {variant === 'focus' ? (
              <>
                <stop offset="0" stopColor="rgb(var(--primary))" />
                <stop offset="1" stopColor="rgb(var(--accent))" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="rgb(var(--success))" />
                <stop offset="1" stopColor="#14b8a6" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} opacity={0.6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={{ transition: 'stroke-dashoffset 300ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
