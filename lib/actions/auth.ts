'use server'

import { createRouteHandlerClient } from '@/lib/supabase/server'
import { type UserWithRole, type UserProfile, resolveUserProfile } from '@/lib/auth/rbac'

/**
 * Get current user from Supabase session + ms_user profile
 * Server-side function that fetches the authenticated user with their role
 */
export async function getCurrentUser(): Promise<UserWithRole | null> {
  try {
    const supabase = await createRouteHandlerClient()

    // Get the authenticated user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    let dbProfile: UserProfile | null = null

    try {
      const { data, error } = await supabase
        .from('ms_user')
        .select('user_id, username, full_name, email, role, status, created_at')
        .eq('email', user.email)
        .maybeSingle()

      if (data && !error) {
        dbProfile = data as UserProfile
      }
    } catch (e) {
      console.error('Error fetching user profile in action:', e)
    }

    const profileData = resolveUserProfile(user.email, user, dbProfile)

    if (!profileData) {
      return null
    }

    if (profileData.status !== 'ACTIVE') {
      return null
    }

    return profileData
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}
