// src/lib/supabase.ts
// Singleton Supabase clients – one for client-side, one server-side (service role)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser / client-side client (uses anon key, RLS applies) */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side admin client (service role key – NEVER expose to browser).
 * Use only inside API routes and server components.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
