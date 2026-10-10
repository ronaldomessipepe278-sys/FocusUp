import { useCallback, useEffect, useState } from 'react';

export type RouteName = 'dashboard' | 'tareas' | 'temporizador' | 'calendario' | 'estadisticas' | 'ajustes';

const ROUTES: RouteName[] = ['dashboard', 'tareas', 'temporizador', 'calendario', 'estadisticas', 'ajustes'];

export interface Route {
  name: RouteName;
  params: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const name = (ROUTES as string[]).includes(path) ? (path as RouteName) : 'dashboard';
  return { name, params: new URLSearchParams(query) };
}

export function hrefFor(name: RouteName, params?: Record<string, string>): string {
  const q = params ? `?${new URLSearchParams(params).toString()}` : '';
  return `#/${name === 'dashboard' ? '' : name}${q}`;
}

/** Navegación sin recarga basada en el hash de la URL (funciona con atrás/adelante). */
export function useRoute() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function useNavigate() {
  return useCallback((name: RouteName, params?: Record<string, string>) => {
    window.location.hash = hrefFor(name, params);
  }, []);
}
