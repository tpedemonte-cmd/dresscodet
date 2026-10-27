import { authenticatedClient, adminClient } from '../_shared/backend.ts';
import { TRYON_PACKS } from '../_shared/tryonPacks.ts';
import { grantTryonPack } from '../_shared/tryonCredits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-data-backend, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CURRENCY = 'USD';

const PRODUCTS: Record<string, { amount: number; credits: number; label: string }> = {
  premium: { amount: 4.99, credits: 0, label: 'DressCode Premium (mensual)' },
  avatar_1: { amount: 0.99, credits: 1, label: '1 avatar extra' },
  avatar_3: { amount: 1.99, credits: 3, label: 'Pack de 3 avatares' },
  ...Object.fromEntries(TRYON_PACKS.map(pack => [pack.key, { amount: pack.price, credits: pack.credits, label: pack.title }])),
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authenticated = await authenticatedClient(req);
    if (!authenticated) return json({ error: 'No autorizado' }, 401);
    const { client: supabase, user, backend } = authenticated;

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === 'create_session') {
      const productKey = (body?.product as string) || 'premium';
      const product = PRODUCTS[productKey];
      if (!product) return json({ error: 'Producto inválido' }, 400);

      const { data, error } = await supabase
        .from('payment_sessions')
        .insert({
          user_id: user.id,
          amount: product.amount,
          currency: CURRENCY,
          status: 'pending',
          product: productKey,
        })
        .select('id, amount, currency, status, product')
        .single();
      if (error) return json({ error: error.message }, 400);

      return json({
        session_id: data.id,
        amount: Number(data.amount),
        currency: data.currency,
        product: data.product,
        product_label: product.label,
        checkout_url: `/pago/${data.id}`,
        mode: 'sandbox',
      });
    }

    if (action === 'get_session') {
      const { data, error } = await supabase
        .from('payment_sessions')
        .select('id, amount, currency, status, paid_at, product')
        .eq('id', body?.session_id)
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: 'Sesión de pago no encontrada' }, 404);
      return json({
        ...data,
        amount: Number(data.amount),
        product_label: PRODUCTS[data.product ?? 'premium']?.label ?? 'DressCode',
      });
    }

    if (action === 'confirm_payment') {
      const { data: session, error: sessionError } = await supabase
        .from('payment_sessions')
        .select('id, status, product, amount, currency')
        .eq('id', body?.session_id)
        .maybeSingle();
      if (sessionError) return json({ error: sessionError.message }, 400);
      if (!session) return json({ error: 'Sesión de pago no encontrada' }, 404);

      const productKey = session.product ?? 'premium';
      const product = PRODUCTS[productKey];
      if (!product) return json({ error: 'Producto inválido' }, 400);

      const paidAt = new Date();

      if (productKey.startsWith('tryon_')) {
        if (Number(session.amount) !== product.amount || session.currency !== CURRENCY) {
          return json({ error: 'El precio de esta sesión no coincide con el pack.' }, 400);
        }
        const balance = await grantTryonPack(backend, user.id, session.id, product.credits);
        const { error } = await adminClient(backend).from('payment_sessions')
          .update({ status: 'paid', paid_at: paidAt.toISOString() }).eq('id', session.id).eq('user_id', user.id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, product: productKey, tryon_credits: balance });
      }

      if (session.status !== 'paid') {
        const { error: payError } = await supabase
          .from('payment_sessions')
          .update({ status: 'paid', paid_at: paidAt.toISOString() })
          .eq('id', session.id);
        if (payError) return json({ error: payError.message }, 400);
      }

      if (product.credits > 0) {
        const admin = adminClient(backend);
        const { data: current } = await admin
          .from('avatar_credits')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();
        const nextBalance = (current?.balance ?? 0) + product.credits;
        const { error: creditError } = await admin
          .from('avatar_credits')
          .upsert(
            { user_id: user.id, balance: nextBalance, updated_at: paidAt.toISOString() },
            { onConflict: 'user_id' },
          );
        if (creditError) return json({ error: creditError.message }, 400);

        return json({ ok: true, product: productKey, avatar_credits: nextBalance });
      }

      const periodEnd = new Date(paidAt);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan: 'premium',
          status: 'active',
          price_amount: product.amount,
          currency: CURRENCY,
          interval: 'month',
          current_period_end: periodEnd.toISOString(),
          updated_at: paidAt.toISOString(),
        }, { onConflict: 'user_id' });
      if (subError) return json({ error: subError.message }, 400);

      return json({ ok: true, product: 'premium', plan: 'premium', current_period_end: periodEnd.toISOString() });
    }

    if (action === 'cancel_subscription') {
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan: 'free',
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, plan: 'free' });
    }

    return json({ error: 'Acción inválida' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500);
  }
});
