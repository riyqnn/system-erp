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
  const userRole = user?.role?.name?.toUpperCase()

  if (userRole === 'ADMIN') {
    // Admins go to admin dashboard
    redirect('/admin')
  } else {
    // Other roles go to their respective modules
    const roleRedirects: Record<string, string> = {
      'INVENTORY': '/inventory',
      'FINANCE': '/finance',
      'PURCHASING': '/purchasing',
      'PRODUCTION': '/production',
      'SNM': '/snm',
      'SALES': '/snm',
    }

    const redirectPath = roleRedirects[userRole || ''] || '/login'
    redirect(redirectPath)
  }
}
