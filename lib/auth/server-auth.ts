import { getCurrentUser } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'

/**
 * Role-to-module mapping
 * Maps each role to their allowed module path
 */
const ROLE_MODULE_MAP: Record<string, string> = {
  'INVENTORY': '/apps/inventory',
  'FINANCE': '/apps/finance',
  'PURCHASING': '/apps/purchasing',
  'PRODUCTION': '/apps/production',
  'SNM': '/apps/snm',
  'SALES': '/apps/snm',
  'ADMIN': '/dashboard',
}

/**
 * Get the default redirect path for a user based on their role
 */
export function getRoleRedirect(roleName: string | undefined): string {
  if (!roleName) return '/dashboard'
  const upperRole = roleName.toUpperCase()
  return ROLE_MODULE_MAP[upperRole] || '/dashboard'
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

/**
 * Require specific roles - redirect to user's own module if not authorized
 * Admin can access everything, other roles can only access their assigned module
 *
 * @param allowedRoles - Array of role names that can access this resource (e.g., ['FINANCE', 'ADMIN'])
 */
export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()

  const userRole = user?.role?.name?.toUpperCase()

  // Admin can access everything
  if (userRole === 'ADMIN') {
    return user
  }

  // Check if user's role is in the allowed list
  if (userRole && allowedRoles.includes(userRole)) {
    return user
  }

  // Redirect to user's own module
  const redirectPath = getRoleRedirect(userRole)
  redirect(redirectPath)
}

/**
 * Require admin role - redirect to user's own module if not admin
 */
export async function requireAdmin() {
  return requireRole(['ADMIN'])
}
