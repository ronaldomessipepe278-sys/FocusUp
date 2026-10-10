export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="fu-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--primary))" />
          <stop offset="1" stopColor="rgb(var(--accent))" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#fu-logo)" />
      <circle
        cx="16"
        cy="16"
        r="8.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeDasharray="40 14"
        strokeLinecap="round"
        transform="rotate(-90 16 16)"
      />
      <circle cx="16" cy="16" r="2.6" fill="#fff" />
    </svg>
  );
}

export function Logo() {
  return (
    <a href="#/" className="flex items-center gap-2.5 rounded-xl" aria-label="FocusUp, ir al dashboard">
      <LogoMark />
      <span className="text-lg font-bold tracking-tight text-fg">
        Focus<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Up</span>
      </span>
    </a>
  );
}
