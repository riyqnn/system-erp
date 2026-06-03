import { requireRole } from '@/lib/auth/server-auth'
import { SnmPageClient } from './SnmPageClient'

// Server component - handles role-based access control
export default async function SnmPage() {
  // Only SNM, SALES, and ADMIN roles can access this page
  // Non-authorized users will be redirected to their own module
  await requireRole(['SNM', 'SALES', 'ADMIN'])

  return <SnmPageClient />
}

