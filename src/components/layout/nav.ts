import { BarChart3, CalendarDays, CheckSquare, LayoutDashboard, Settings, Timer, type LucideIcon } from 'lucide-react';
import type { RouteName } from '../../hooks/useRoute';

export interface NavItem {
  name: RouteName;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'dashboard', label: 'Dashboard', short: 'Inicio', icon: LayoutDashboard },
  { name: 'tareas', label: 'Mis tareas', short: 'Tareas', icon: CheckSquare },
  { name: 'temporizador', label: 'Temporizador', short: 'Timer', icon: Timer },
  { name: 'calendario', label: 'Calendario', short: 'Agenda', icon: CalendarDays },
  { name: 'estadisticas', label: 'Estadísticas', short: 'Progreso', icon: BarChart3 },
  { name: 'ajustes', label: 'Ajustes', short: 'Ajustes', icon: Settings },
];
