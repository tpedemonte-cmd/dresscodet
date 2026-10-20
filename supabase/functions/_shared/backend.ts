import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { selectDataBackend, type DataBackend } from './backendSelection.ts';

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error('Falta configurar la conexión de datos.');
  return value;
}

export function requestBackend(req: Request): DataBackend {
  return selectDataBackend(req.headers.get('x-data-backend'));
}

export function userClient(authHeader: string, backend: DataBackend = 'cloud') {
  const url = required(backend === 'external' ? 'EXTERNAL_SUPABASE_URL' : 'SUPABASE_URL');
  const key = required(backend === 'external' ? 'EXTERNAL_SUPABASE_PUBLISHABLE_KEY' : 'SUPABASE_ANON_KEY');
  return createClient(url, key, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function adminClient(backend: DataBackend = 'cloud') {
  return createClient(
    required(backend === 'external' ? 'EXTERNAL_SUPABASE_URL' : 'SUPABASE_URL'),
    required(backend === 'external' ? 'EXTERNAL_SUPABASE_SECRET_KEY' : 'SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function authenticatedClient(req: Request) {
  const header = req.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const backend = requestBackend(req);
  const client = userClient(header, backend);
  // The selected project's Auth server verifies the signature, expiry and account.
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, user: data.user, backend };
}