import { AppSwitcher } from '@/components/layout/AppSwitcher'
import { getCurrentUser } from '@/lib/actions/auth'

// Force dynamic rendering for this page since it uses cookies
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    // This shouldn't happen due to middleware, but just in case
    throw new Error('User not found')
  }

  // user already includes role from the backend response
  const userRole = user.role

  return <AppSwitcher userRole={userRole} />
}
