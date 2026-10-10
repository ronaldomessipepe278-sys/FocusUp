interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  label: string;
  size?: 'sm' | 'md';
}

export function ProgressBar({ value, color, label, size = 'md' }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={`w-full overflow-hidden rounded-full bg-surface-2 ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${color ? '' : 'bg-gradient-to-r from-primary to-accent'}`}
        style={{ width: `${v}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}
