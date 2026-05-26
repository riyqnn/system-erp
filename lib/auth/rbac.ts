/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * User profile interface from database
 */
export interface UserProfile {
  id: string
  email: string
  full_name: string
  role_id: string
  is_active: boolean
  is_pending: boolean
  created_at: string
  updated_at: string
}

/**
 * Role interface
 */
export interface Role {
  id: string
  name: string
  description: string
}

/**
 * User with role information
 */
export interface UserWithRole extends UserProfile {
  role?: Role
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: UserWithRole | null, roleName: string): boolean {
  if (!user || !user.role) return false
  return user.role.name === roleName
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: UserWithRole | null, roleNames: string[]): boolean {
  if (!user || !user.role) return false
  return roleNames.includes(user.role.name)
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
    throw new Error('User not authenticated')
  }
  if (!user.role) {
    throw new Error('User does not have a role assigned')
  }
  if (user.role.name !== roleName) {
    throw new Error(`Access denied. Required role: ${roleName}. Your role: ${user.role.name}`)
  }
}

/**
 * Require any of the specified roles - throws error if user doesn't have any
 */
export function requireAnyRole(user: UserWithRole | null, roleNames: string[]): void {
  if (!user) {
    throw new Error('User not authenticated')
  }
  if (!user.role) {
    throw new Error('User does not have a role assigned')
  }
  if (!roleNames.includes(user.role.name)) {
    throw new Error(
      `Access denied. Required role(s): ${roleNames.join(', ')}. Your role: ${user.role.name}`
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
 * Get user from _request - extracts and validates user from session
 */
export async function getUserFromRequest(): Promise<UserWithRole | null> {
  const { createRouteHandlerClient } = await import('@/lib/supabase/server')
  const supabase = await createRouteHandlerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

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
    throw new AuthError('User account is inactive', 403)
  }

  if (data.is_pending) {
    throw new AuthError('Account pending admin approval', 403)
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
