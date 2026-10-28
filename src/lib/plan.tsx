import { createContext, useContext, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cloudFunctions } from '@/lib/cloudFunctions';
import { useAuth } from '@/lib/auth';
import { freeAvatarAllowance } from '../../supabase/functions/_shared/avatarRules';
import { calculateTryonQuota, TRYON_LIMITS, tryonMonthStart } from '../../supabase/functions/_shared/tryonQuota';
import { applyRecordedTryon } from '@/lib/tryonQuotaCache';
import { availableTryonCredits, canGenerateTryon, type TryonPackKey } from '../../supabase/functions/_shared/tryonPacks';
export { TRYON_PACKS, type TryonPackKey } from '../../supabase/functions/_shared/tryonPacks';

export type PlanTier = 'free' | 'premium';

export const PREMIUM_PRICE = 4.99;
export const PREMIUM_CURRENCY = 'USD';

/** Formatea precios como "4,99 USD" */
export function formatPrice(amount: number) {
  return `${amount.toFixed(2).replace('.', ',')} ${PREMIUM_CURRENCY}`;
}
export const FREE_HISTORY_LIMIT = 5;

/** Sugerencias de outfit por día del plan gratis (debe coincidir con quotas.ts) */
export const FREE_OUTFITS_PER_DAY = 2;

/** Límites de uso de IA por plan (deben coincidir con supabase/functions/_shared/quotas.ts) */
export const LIMITS = {
  free: { avatarFreeTotal: 1, savedModels: 1, ...TRYON_LIMITS.free },
  premium: { avatarFreeTotal: 1, savedModels: 1, ...TRYON_LIMITS.premium },
} as const;

export type AvatarPackKey = 'avatar_1' | 'avatar_3';

export const AVATAR_PACKS: { key: AvatarPackKey; credits: number; price: number; title: string; note: string }[] = [
  { key: 'avatar_1', credits: 1, price: 0.99, title: '1 avatar extra', note: 'Para armar un modelo más' },
  { key: 'avatar_3', credits: 3, price: 1.99, title: 'Pack de 3 avatares', note: 'La opción más conveniente' },
];

interface Subscription {
  plan: PlanTier;
  status: 'active' | 'canceled';
  current_period_end: string | null;
  price_amount: number;
  currency: string;
}

export interface Quota {
  tryonCredits: number;
  canGenerateTryon: boolean;
  avatarCredits: number;
  avatarsTotal: number;
  avatarsThisMonth: number;
  avatarsToday: number;
  tryonsThisMonth: number;
  tryonsToday: number;
  tryonsDailyLeft: number | null;
  savedModels: number;
  /** Cuántos modelos podés generar ahora mismo (0 = hay que comprar o esperar) */
  avatarsLeft: number;
  tryonsLeft: number;
  savedModelsLimit: number;
  canSaveModel: boolean;
  /** Sugerencias de outfit usadas hoy (plan gratis) */
  outfitsToday: number;
  /** Sugerencias restantes hoy; null = ilimitadas (Premium) */
  outfitsLeft: number | null;
}

interface PlanContextType {
  plan: PlanTier;
  isPremium: boolean;
  loading: boolean;
  subscription: Subscription | null;
  quota: Quota;
  quotaLoading: boolean;
  quotaError: boolean;
  refreshQuota: () => void;
  recordSuccessfulTryon: (usedCredit?: boolean) => Promise<void>;
  startTryonCheckout: (pack: TryonPackKey) => Promise<string>;
  startingTryonCheckout: boolean;
  startCheckout: () => Promise<string>;
  startingCheckout: boolean;
  startAvatarCheckout: (pack: AvatarPackKey) => Promise<string>;
  startingAvatarCheckout: boolean;
  cancelSubscription: () => Promise<void>;
  refreshPlan: () => void;
  FREE_HISTORY_LIMIT: number;
}

// Keep the same context identity when Vite refreshes this mixed hook/provider module.
// Otherwise an existing provider can be paired with a newly created consumer context.
const PlanContext = (import.meta.hot?.data.planContext as ReturnType<typeof createContext<PlanContextType | undefined>> | undefined)
  ?? createContext<PlanContextType | undefined>(undefined);
if (import.meta.hot) import.meta.hot.data.planContext = PlanContext;

function startOfMonthISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function startOfDayISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError: subscriptionError } = useQuery({
    queryKey: ['subscription', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Subscription | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, price_amount, currency')
        .eq('user_id', user.id)
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

  const quotaQueryKey = ['ai_quota', user?.id, isPremium, tryonMonthStart(), startOfDayISO()] as const;
  const { data: usage, isLoading: usageLoading, isError: usageError } = useQuery({
    queryKey: quotaQueryKey,
    enabled: !!user && !isLoading,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!user) throw new Error('Iniciá sesión para ver tus cupos.');
      const monthStart = startOfMonthISO();
      const dayStart = startOfDayISO();

      const [credits, avatarsTotal, avatarsMonth, avatarsDay, tryonsMonth, models, tryonGrants, tryonSpent, outfitsDay] = await Promise.all([
        supabase.from('avatar_credits').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('kind', 'avatar'),
        supabase
          .from('ai_usage_events')
          .select('id', { count: 'exact', head: true })
          .eq('kind', 'avatar')
          .eq('user_id', user.id)
          .gte('created_at', monthStart),
        supabase
          .from('ai_usage_events')
          .select('id', { count: 'exact', head: true })
          .eq('kind', 'avatar')
          .eq('user_id', user.id)
          .gte('created_at', dayStart),
        supabase
          .from('ai_usage_events')
          .select('plan_tier, created_at, used_credit')
          .eq('kind', 'tryon')
          .eq('user_id', user.id)
          .eq('plan_tier', isPremium ? 'premium' : 'free')
          .gte('created_at', monthStart),
        supabase.from('user_models').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('kind', 'tryon_credit'),
        supabase.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('kind', 'tryon').eq('used_credit', true),
        supabase
          .from('ai_usage_events')
          .select('id', { count: 'exact', head: true })
          .eq('kind', 'outfit')
          .eq('user_id', user.id)
          .gte('created_at', dayStart),
      ]);

      for (const result of [credits, avatarsTotal, avatarsMonth, avatarsDay, tryonsMonth, models, tryonGrants, tryonSpent, outfitsDay]) {
        if (result.error) throw result.error;
      }

      return {
        tryonCredits: availableTryonCredits(tryonGrants.count ?? 0, tryonSpent.count ?? 0),
        avatarCredits: credits.data?.balance ?? 0,
        avatarsTotal: avatarsTotal.count ?? 0,
        avatarsThisMonth: avatarsMonth.count ?? 0,
        avatarsToday: avatarsDay.count ?? 0,
        ...calculateTryonQuota(tryonsMonth.data ?? [], isPremium ? 'premium' : 'free'),
        savedModels: models.count ?? 0,
        outfitsToday: outfitsDay.count ?? 0,
      };
    },
  });

  const base = usage ?? {
    tryonCredits: 0,
    avatarCredits: 0,
    avatarsTotal: 0,
    avatarsThisMonth: 0,
    avatarsToday: 0,
    tryonsThisMonth: 0,
    tryonsToday: 0,
    savedModels: 0,
    outfitsToday: 0,
  };

  const savedModelsLimit = isPremium ? LIMITS.premium.savedModels : LIMITS.free.savedModels;

  const avatarsLeft = freeAvatarAllowance(base.avatarsTotal, base.avatarCredits, base.savedModels);

  const tryonsLeft = Math.max(
    0,
    (isPremium ? LIMITS.premium.tryonsPerMonth : LIMITS.free.tryonsPerMonth) - base.tryonsThisMonth,
  );

  const quota: Quota = {
    ...base,
    canGenerateTryon: canGenerateTryon(tryonsLeft, isPremium ? Math.max(0, LIMITS.premium.tryonsPerDay - base.tryonsToday) : null, base.tryonCredits),
    avatarsLeft,
    tryonsLeft,
    tryonsDailyLeft: isPremium ? Math.max(0, LIMITS.premium.tryonsPerDay - base.tryonsToday) : null,
    savedModelsLimit,
    canSaveModel: base.savedModels < savedModelsLimit,
    outfitsLeft: isPremium ? null : Math.max(0, FREE_OUTFITS_PER_DAY - base.outfitsToday),
  };

  const checkout = useMutation({
    mutationFn: async (product: 'premium' | AvatarPackKey): Promise<string> => {
      const { data, error } = await cloudFunctions.invoke('mock-payments', {
        body: { action: 'create_session', product },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.checkout_url as string;
    },
  });

  const avatarCheckout = useMutation({
    mutationFn: async (product: AvatarPackKey): Promise<string> => {
      const { data, error } = await cloudFunctions.invoke('mock-payments', {
        body: { action: 'create_session', product },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.checkout_url as string;
    },
  });

  const tryonCheckout = useMutation({
    mutationFn: async (product: TryonPackKey): Promise<string> => {
      const { data, error } = await cloudFunctions.invoke('mock-payments', { body: { action: 'create_session', product } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.checkout_url as string;
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { data, error } = await cloudFunctions.invoke('mock-payments', {
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
        quota,
        quotaLoading: !(subscriptionError || usageError) && (isLoading || usageLoading || !usage),
        quotaError: !usage && (subscriptionError || usageError),
        refreshQuota: () => queryClient.invalidateQueries({ queryKey: ['ai_quota'] }),
        recordSuccessfulTryon: (usedCredit = false) => applyRecordedTryon(queryClient, quotaQueryKey, usedCredit),
        startTryonCheckout: (pack: TryonPackKey) => tryonCheckout.mutateAsync(pack),
        startingTryonCheckout: tryonCheckout.isPending,
        startCheckout: () => checkout.mutateAsync('premium'),
        startingCheckout: checkout.isPending,
        startAvatarCheckout: (pack: AvatarPackKey) => avatarCheckout.mutateAsync(pack),
        startingAvatarCheckout: avatarCheckout.isPending,
        cancelSubscription: async () => {
          await cancel.mutateAsync();
        },
        refreshPlan: () => {
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['ai_quota'] });
        },
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
