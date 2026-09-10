import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type PlanTier = 'free' | 'premium';

const STORAGE_KEY = 'dresscode_plan';

interface PlanContextType {
  plan: PlanTier;
  isPremium: boolean;
  setPlan: (plan: PlanTier) => void;
  togglePlan: () => void;
  FREE_HISTORY_LIMIT: number;
}

const FREE_HISTORY_LIMIT = 5;

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<PlanTier>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return stored === 'premium' ? 'premium' : 'free';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, plan);
  }, [plan]);

  const setPlan = (p: PlanTier) => setPlanState(p);
  const togglePlan = () => setPlanState((p) => (p === 'premium' ? 'free' : 'premium'));

  return (
    <PlanContext.Provider value={{ plan, isPremium: plan === 'premium', setPlan, togglePlan, FREE_HISTORY_LIMIT }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
