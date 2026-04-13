import { requireAdmin } from '@/lib/auth/server-auth'
import { AdminDashboardClient } from './AdminDashboardClient'

// Server component - only ADMIN can access
export default async function AdminDashboardPage() {
  // Only ADMIN role can access this page
  await requireAdmin()

  return <AdminDashboardClient />
}
