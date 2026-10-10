import type { SubjectSlice } from '../../lib/stats';
import { formatMinutes } from '../../lib/format';

/** Reparto del tiempo por asignatura como barras horizontales etiquetadas. */
export function SubjectBreakdown({ slices }: { slices: SubjectSlice[] }) {
  const total = slices.reduce((a, s) => a + s.minutes, 0);
  return (
    <ul className="space-y-3.5">
      {slices.map((s) => {
        const pct = total > 0 ? (s.minutes / total) * 100 : 0;
        return (
          <li key={s.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                <span className="truncate text-fg">{s.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                {formatMinutes(s.minutes)} <span className="text-subtle">· {Math.round(pct)}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: s.color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
