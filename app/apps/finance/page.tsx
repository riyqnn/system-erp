import { requireRole } from '@/lib/auth/server-auth'
import { FinancePageClient } from './FinancePageClient'

// Server component - handles role-based access control
export default async function FinancePage() {
  // Only FINANCE and ADMIN roles can access this page
  // Non-authorized users will be redirected to their own module
  await requireRole(['FINANCE', 'ADMIN'])

  return <FinancePageClient />
}

