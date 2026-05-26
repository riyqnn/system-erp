/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createRouteHandlerClient } from '@/lib/supabase/server'
import type { UserWithRole } from '@/lib/auth/rbac'

/**
 * Get current user from Supabase
 * Server-side function that fetches the authenticated user with their role
 */
export async function getCurrentUser(): Promise<UserWithRole | null> {
  try {
    const supabase = await createRouteHandlerClient()

    // Get the authenticated user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Fetch user profile with role from database
    const { data, error } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        role_id,
        is_active,
        is_pending,
        created_at,
        updated_at,
        roles (
          id,
          name,
          description
        )
      `
      )
      .eq('id', user.id)
      .single()

    if (error || !data) {
      return null
    }

    if (!data.is_active) {
      return null
    }

    if (data.is_pending) {
      return null
    }

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role_id: data.role_id,
      is_active: data.is_active,
      is_pending: data.is_pending,
      created_at: data.created_at,
      updated_at: data.updated_at,
      role: (data as any).roles,
    }
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}
