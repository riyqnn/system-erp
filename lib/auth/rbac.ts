/**
 * User profile interface from ms_user table
 */
export interface UserProfile {
  user_id: number
  username: string
  full_name: string | null
  email: string | null
  role: string
  status: string
  created_at: string
}

/**
 * Alias for backward compatibility
 */
export type UserWithRole = UserProfile

/**
 * Check if user has a specific role
 */
export function hasRole(user: UserWithRole | null, roleName: string): boolean {
  if (!user) return false
  return user.role.toUpperCase() === roleName.toUpperCase()
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: UserWithRole | null, roleNames: string[]): boolean {
  if (!user) return false
  return roleNames.some(r => r.toUpperCase() === user.role.toUpperCase())
}

/**
 * Check if user has all of the specified roles
 * (Note: A user typically has only one role, so this checks if their role is in the list)
 */
export function hasAllRoles(user: UserWithRole | null, roleNames: string[]): boolean {
  return hasAnyRole(user, roleNames)
}

/**
 * Require a specific role - throws error if user doesn't have it
 */
export function requireRole(user: UserWithRole | null, roleName: string): void {
  if (!user) {
    throw new AuthError('User not authenticated', 401)
  }
  if (user.role.toUpperCase() !== roleName.toUpperCase()) {
    throw new AuthError(`Access denied. Required role: ${roleName}. Your role: ${user.role}`, 403)
  }
}

/**
 * Require any of the specified roles - throws error if user doesn't have any
 */
export function requireAnyRole(user: UserWithRole | null, roleNames: string[]): void {
  if (!user) {
    throw new AuthError('User not authenticated', 401)
  }
  if (!roleNames.some(r => r.toUpperCase() === user.role.toUpperCase())) {
    throw new AuthError(
      `Access denied. Required role(s): ${roleNames.join(', ')}. Your role: ${user.role}`,
      403
    )
  }
}

/**
 * Auth error for API responses
 */
export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Helper to resolve user profile from ms_user table.
 * If user profile is not found in database, a mock profile fallback is used ONLY in non-production environments.
 * Standardizes roles across the application.
 */
export function resolveUserProfile(
  email: string | undefined,
  supabaseUser: { created_at?: string; user_metadata?: { full_name?: string } } | null,
  dbProfile: UserProfile | null
): UserWithRole | null {
  if (dbProfile) {
    return dbProfile
  }

  // Security: In production, mock bypass/fallbacks are completely disabled.
  // Only users registered in ms_user can log in or access modules.
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  // Fallback for local testing / development
  const resolvedEmail = email || 'admin@mayora.id'
  const emailPrefix = resolvedEmail.split('@')[0]
  let role = 'ADMIN'

  const prefixLower = emailPrefix.toLowerCase()
  if (prefixLower.includes('inventory')) {
    role = 'INVENTORY'
  } else if (prefixLower.includes('finance')) {
    role = 'FINANCE'
  } else if (prefixLower.includes('production')) {
    role = 'PRODUCTION'
  } else if (prefixLower.includes('purchasing')) {
    role = 'PURCHASING'
  } else if (prefixLower.includes('snm') || prefixLower.includes('sales')) {
    role = 'SALES'
  }

  return {
    user_id: 1,
    username: emailPrefix,
    full_name: (supabaseUser?.user_metadata?.full_name || emailPrefix).toUpperCase(),
    email: resolvedEmail,
    role: role,
    status: 'ACTIVE',
    created_at: supabaseUser?.created_at || new Date().toISOString(),
  }
}

/**
 * Get user from request - extracts and validates user from Supabase session,
 * then fetches profile from ms_user table.
 */
export async function getUserFromRequest(): Promise<UserWithRole | null> {
  const { createRouteHandlerClient } = await import('@/lib/supabase/server')
  const supabase = await createRouteHandlerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

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
    console.error('Error fetching profile from ms_user:', e)
  }

  const profileData = resolveUserProfile(user.email, user, dbProfile)

  if (!profileData) {
    return null

  }

  if (profileData.status !== 'ACTIVE') {
    throw new AuthError('User account is not active', 403)
  }

  return profileData
}

/**
 * Require authentication - throws error if user is not authenticated
 */
export async function requireAuth(): Promise<UserWithRole> {
  const user = await getUserFromRequest()

  if (!user) {
    throw new AuthError('User not authenticated', 401)
  }

  return user
}
