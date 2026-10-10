import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'primary' | 'accent' | 'success' | 'warning';
  children?: ReactNode;
}

const TONES = {
  primary: 'bg-primary/15 text-primary-soft',
  accent: 'bg-accent/15 text-accent',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
};

export function StatCard({ icon: Icon, label, value, hint, tone = 'primary', children }: StatCardProps) {
  return (
    <div className="card flex flex-col p-4 transition-colors hover:border-line md:p-5">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONES[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-fg tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-subtle">{hint}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
