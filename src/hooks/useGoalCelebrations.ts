import { useEffect } from 'react';
import { useStore } from '../store/AppStore';
import { useToast } from '../components/ui/Toast';
import { describeGoal, goalProgress, todayMinutes } from '../lib/stats';
import { todayKey } from '../lib/dates';

/** Id reservado para el objetivo diario definido en Ajustes. */
export const DAILY_SETTING_GOAL = '__daily';

/**
 * Muestra un aviso positivo (sin bloquear) la primera vez que se cumple un
 * objetivo en su período. Lo ya celebrado se guarda para no repetirlo.
 */
export function useGoalCelebrations() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { goals, sessions, tasks, celebrated, subjects, settings } = state;

  useEffect(() => {
    for (const g of goals) {
      const p = goalProgress(g, sessions, tasks);
      if (p.done && celebrated[g.id] !== p.periodKey) {
        dispatch({ type: 'goal/celebrate', id: g.id, periodKey: p.periodKey });
        toast('celebrate', '¡Objetivo cumplido!', describeGoal(g, subjects));
      }
    }
    const today = todayKey();
    if (
      settings.dailyGoalMin > 0 &&
      celebrated[DAILY_SETTING_GOAL] !== today &&
      todayMinutes(sessions) >= settings.dailyGoalMin
    ) {
      dispatch({ type: 'goal/celebrate', id: DAILY_SETTING_GOAL, periodKey: today });
      toast('celebrate', '¡Objetivo diario alcanzado!', `Has estudiado ${settings.dailyGoalMin} min hoy.`);
    }
  }, [goals, sessions, tasks, celebrated, subjects, settings.dailyGoalMin, dispatch, toast]);
}
