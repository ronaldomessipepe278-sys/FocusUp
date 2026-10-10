import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, message, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-6' : 'py-12'}`}>
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-xl" aria-hidden />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary-soft">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      </div>
      <p className="font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
