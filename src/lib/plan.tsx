import { createContext, useContext, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type PlanTier = 'free' | 'premium';

export const PREMIUM_PRICE = 1;
export const PREMIUM_CURRENCY = 'USD';
export const FREE_HISTORY_LIMIT = 5;

interface Subscription {
  plan: PlanTier;
  status: 'active' | 'canceled';
  current_period_end: string | null;
  price_amount: number;
  currency: string;
}

interface PlanContextType {
  plan: PlanTier;
  isPremium: boolean;
  loading: boolean;
  subscription: Subscription | null;
  startCheckout: () => Promise<string>;
  startingCheckout: boolean;
  cancelSubscription: () => Promise<void>;
  refreshPlan: () => void;
  FREE_HISTORY_LIMIT: number;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Subscription | null> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, price_amount, currency')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        plan: data.plan as PlanTier,
        status: data.status as 'active' | 'canceled',
        current_period_end: data.current_period_end,
        price_amount: Number(data.price_amount),
        currency: data.currency,
      };
    },
  });

  const expired = !!data?.current_period_end && new Date(data.current_period_end) < new Date();
  const isPremium = !!data && data.plan === 'premium' && data.status === 'active' && !expired;

  const checkout = useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('mock-payments', {
        body: { action: 'create_session' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.checkout_url as string;
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('mock-payments', {
        body: { action: 'cancel_subscription' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });

  return (
    <PlanContext.Provider
      value={{
        plan: isPremium ? 'premium' : 'free',
        isPremium,
        loading: isLoading,
        subscription: data ?? null,
        startCheckout: () => checkout.mutateAsync(),
        startingCheckout: checkout.isPending,
        cancelSubscription: async () => {
          await cancel.mutateAsync();
        },
        refreshPlan: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
        FREE_HISTORY_LIMIT,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
