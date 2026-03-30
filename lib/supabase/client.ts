import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a Supabase client for use in browser components
 * This client automatically handles cookies and session management
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
