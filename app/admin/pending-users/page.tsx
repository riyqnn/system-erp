import { requireAdmin } from '@/lib/auth/server-auth'
import { UserManagementPageClient } from './UserManagementPageClient'

// Server component - only ADMIN can access
export default async function UserManagementPage() {
  // Only ADMIN role can access this page
  // Non-admins will be redirected to their own module
  await requireAdmin()

  return <UserManagementPageClient />
}
