import { requireRole } from '@/lib/auth/server-auth'
import { FinancePageClient } from './FinancePageClient'

// Server component - handles role-based access control
export default async function FinanceDashboardPage() {
  // Only FINANCE and ADMIN roles can access this page
  await requireRole(['FINANCE', 'ADMIN'])

  return <FinancePageClient />
}
