import type { ReactNode } from 'react';
import { HardDrive, Settings } from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { Logo, LogoMark } from './Logo';
import { TimerPill } from './TimerPill';
import { hrefFor, type RouteName } from '../../hooks/useRoute';

interface Props {
  current: RouteName;
  children: ReactNode;
}

export function AppShell({ current, children }: Props) {
  const onTimerPage = current === 'temporizador';

  return (
    <div className="min-h-dvh">
      {/* Fondo con un brillo sutil */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        aria-hidden
        style={{
          background:
            'radial-gradient(60rem 30rem at 85% -10%, rgb(var(--primary) / 0.10), transparent 60%), radial-gradient(50rem 30rem at -10% 110%, rgb(var(--accent) / 0.07), transparent 60%)',
        }}
      />

      <button
        type="button"
        onClick={() => document.getElementById('main')?.focus()}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </button>

      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line/70 bg-surface/60 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const active = item.name === current;
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={hrefFor(item.name)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active ? 'bg-primary/15 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                {active && <span className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-primary to-accent" aria-hidden />}
                <Icon className={`h-[18px] w-[18px] ${active ? 'text-primary-soft' : 'text-subtle group-hover:text-fg'}`} aria-hidden />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          {!onTimerPage && <TimerPill />}
          <div className="flex items-start gap-2 rounded-xl border border-line/70 bg-surface-2/40 p-3 text-xs text-subtle">
            <HardDrive className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Tus datos se guardan solo en este navegador.</span>
          </div>
        </div>
      </aside>

      {/* Barra superior (móvil y tablet) */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line/70 bg-bg/80 px-4 backdrop-blur-xl lg:hidden">
        <a href="#/" className="flex items-center gap-2" aria-label="FocusUp, ir al dashboard">
          <LogoMark className="h-8 w-8" />
          <span className="font-bold tracking-tight">FocusUp</span>
        </a>
        <div className="ml-auto flex items-center gap-1">
          {!onTimerPage && <TimerPill compact />}
          <a
            href={hrefFor('ajustes')}
            className={`btn-icon ${current === 'ajustes' ? 'bg-primary/15 text-primary-soft' : ''}`}
            aria-label="Ajustes"
            aria-current={current === 'ajustes' ? 'page' : undefined}
          >
            <Settings className="h-5 w-5" />
          </a>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none px-4 pb-28 pt-5 sm:px-6 md:pt-8 lg:ml-64 lg:px-10 lg:pb-12">
        <div className="mx-auto max-w-6xl animate-fade-in" key={current}>
          {children}
        </div>
      </main>

      {/* Navegación inferior (móvil y tablet) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Navegación principal"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV_ITEMS.filter((i) => i.name !== 'ajustes').map((item) => {
            const active = item.name === current;
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <a
                  href={hrefFor(item.name)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    active ? 'text-primary-soft' : 'text-subtle hover:text-fg'
                  }`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? 'bg-primary/15' : ''}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {item.short}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
