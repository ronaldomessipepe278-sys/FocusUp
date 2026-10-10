interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, label, className = '' }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex max-w-full rounded-xl border border-line bg-surface-2/60 p-1 text-sm ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-[32px] min-w-0 flex-auto truncate whitespace-nowrap rounded-lg px-2.5 font-medium transition-all sm:px-3 ${
              active ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
