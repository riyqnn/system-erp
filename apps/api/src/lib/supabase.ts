import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Get Supabase configuration from environment
 */
function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing env.SUPABASE_URL. Please check your .env file.');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY. Please check your .env file.');
  }

  return { supabaseUrl, supabaseServiceKey, supabaseAnonKey };
}

/**
 * Lazy-loaded Supabase client singleton for backend operations.
 * Uses service_role key to bypass RLS policies for admin operations.
 *
 * WARNING: This key has full access to your database. Never expose it to clients.
 */
let _supabaseClient: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_supabaseClient) {
      const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
      _supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return _supabaseClient[prop as keyof SupabaseClient];
  },
});

/**
 * Supabase client for operations that require user context (respects RLS).
 * This should be used when you need to perform operations as a specific user.
 *
 * @param userAccessToken - The user's JWT access token
 * @returns A Supabase client configured with the user's token
 */
export function createSupabaseClientForUser(userAccessToken: string): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  if (!supabaseAnonKey) {
    throw new Error('Missing env.SUPABASE_ANON_KEY. Please check your .env file.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    },
  });
}
