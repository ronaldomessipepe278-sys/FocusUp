import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { TaskFormModal, type TaskFormRequest } from '../components/tasks/TaskFormModal';
import { GoalFormModal, type GoalFormRequest } from '../components/goals/GoalFormModal';

interface UIApi {
  openTaskForm: (req?: TaskFormRequest) => void;
  openGoalForm: (req?: GoalFormRequest) => void;
}

const UIContext = createContext<UIApi | null>(null);

/** Formularios de tarea y objetivo accesibles desde cualquier pantalla. */
export function UIProvider({ children }: { children: ReactNode }) {
  const [taskReq, setTaskReq] = useState<{ key: number; req: TaskFormRequest } | null>(null);
  const [goalReq, setGoalReq] = useState<{ key: number; req: GoalFormRequest } | null>(null);
  const counter = useRef(0);

  const openTaskForm = useCallback((req: TaskFormRequest = {}) => setTaskReq({ key: ++counter.current, req }), []);
  const openGoalForm = useCallback((req: GoalFormRequest = {}) => setGoalReq({ key: ++counter.current, req }), []);
  const value = useMemo(() => ({ openTaskForm, openGoalForm }), [openTaskForm, openGoalForm]);

  return (
    <UIContext.Provider value={value}>
      {children}
      {taskReq && <TaskFormModal key={taskReq.key} request={taskReq.req} onClose={() => setTaskReq(null)} />}
      {goalReq && <GoalFormModal key={goalReq.key} request={goalReq.req} onClose={() => setGoalReq(null)} />}
    </UIContext.Provider>
  );
}

export function useUI(): UIApi {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI debe usarse dentro de UIProvider');
  return ctx;
}
