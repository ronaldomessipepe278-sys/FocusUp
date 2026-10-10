interface Context {
  hour: number;
  todayMinutes: number;
  dailyGoal: number;
  pendingToday: number;
  overdue: number;
  hasAnyData: boolean;
}

const GENERAL = [
  'Una sesión bien hecha vale más que tres a medias.',
  'Empieza por lo que más te cuesta; lo demás irá rodado.',
  'No hace falta hacerlo todo hoy, solo avanzar un poco.',
  'La constancia gana a la intensidad.',
  'Elige una tarea, silencia el móvil y dale 25 minutos.',
  'Repasar un poco cada día es más eficaz que un maratón final.',
  'Divide lo grande en pasos pequeños y ve tachando.',
  'Descansar también forma parte de estudiar bien.',
  'Lo que planificas hoy es tiempo que ganas mañana.',
  'Hoy es buen día para adelantar algo que vence pronto.',
];

/** Mensaje breve que depende del contexto real y rota a diario, sin repetirse en cada visita. */
export function pickMotivation(ctx: Context, date = new Date()): string {
  if (!ctx.hasAnyData) return 'Añade tus primeras tareas y prueba una sesión de concentración.';
  if (ctx.dailyGoal > 0 && ctx.todayMinutes >= ctx.dailyGoal) return 'Objetivo de hoy cumplido. Lo que sumes ahora es extra.';
  if (ctx.overdue > 0) return ctx.overdue === 1 ? 'Tienes una tarea atrasada; quizá sea buen momento para cerrarla.' : `Tienes ${ctx.overdue} tareas atrasadas; empieza por la más corta.`;
  if (ctx.dailyGoal > 0 && ctx.todayMinutes > 0) {
    const left = Math.ceil(ctx.dailyGoal - ctx.todayMinutes);
    return `Te faltan ${left} min para tu objetivo de hoy.`;
  }
  if (ctx.hour >= 22) return 'Si estudias ahora, que sea algo ligero: dormir bien también cuenta.';
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return GENERAL[dayIndex % GENERAL.length];
}

export function greeting(hour: number): string {
  if (hour >= 6 && hour < 13) return 'Buenos días';
  if (hour >= 13 && hour < 21) return 'Buenas tardes';
  return 'Buenas noches';
}
