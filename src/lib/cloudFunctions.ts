import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { retryOnUnauthorized } from '@/lib/retryOnUnauthorized';

// Public endpoint credentials only. Data and Auth remain on the configured project.
const CLOUD_URL = 'https://akgakdrpdhrcxnibxbii.supabase.co';
const CLOUD_PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZ2FrZHJwZGhyY3huaWJ4YmlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjU0NTYsImV4cCI6MjA5MDA0MTQ1Nn0.Uwz47TfVElzlValih-qGD-Sh-i3OZs5G4d228o2Gzhk';
const external = new URL(import.meta.env.VITE_SUPABASE_URL).origin !== CLOUD_URL;

const cloud = createClient(CLOUD_URL, CLOUD_PUBLIC_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { headers: { 'x-data-backend': external ? 'external' : 'cloud' } },
  accessToken: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('Iniciá sesión para usar esta función.');
    return data.session.access_token;
  },
});

async function renewSession() {
  const { data, error } = await supabase.auth.refreshSession();
  return !error && !!data.session;
}

// A stale session (for example after the tab slept) gets one automatic renewal and retry.
export const cloudFunctions = {
  invoke: ((name, options) =>
    retryOnUnauthorized(() => cloud.functions.invoke(name, options), renewSession)) as typeof cloud.functions.invoke,
};