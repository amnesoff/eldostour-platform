import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://thzdrakkfpuqwjuopyei.supabase.co';

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-service-role-key';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '⚠️ [supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not defined. Falling back to anon key. ' +
        'Note: RLS-protected tables (students, admin_security) require the service_role key to bypass RLS policies.'
    );
  }
}

// Server-side privileged Supabase client with admin capabilities (Bypasses RLS when service_role key is present)
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
