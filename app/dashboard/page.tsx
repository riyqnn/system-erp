import { getCurrentUser } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'

// Force dynamic rendering for this page since it uses cookies
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    // This shouldn't happen due to middleware, but just in case
    redirect('/login')
  }

  // Redirect based on user role
  const userRole = user?.role?.toUpperCase() || ''

  if (userRole === 'ADMIN' || userRole === 'MANAGEMENT') {
    // Admins and management go to admin dashboard
    redirect('/admin')
  } else if (userRole.includes('INVENTORY') || userRole.includes('GUDANG')) {
    redirect('/inventory')
  } else if (
    userRole.includes('FINANCE') ||
    userRole.includes('TREASURY') ||
    userRole.includes('ACCOUNTING') ||
    userRole.includes('PAYABLE') ||
    userRole.includes('RECEIVABLE')
  ) {
    redirect('/finance')
  } else if (userRole.includes('PURCHASING')) {
    redirect('/purchasing')
  } else if (userRole.includes('PRODUCTION')) {
    redirect('/production')
  } else if (userRole.includes('SALES') || userRole.includes('SNM')) {
    redirect('/snm')
  } else {
    // Default fallback to prevent a redirect loop
    redirect('/inventory')
  }
}
