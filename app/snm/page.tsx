import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { SnmPageClient } from './SnmPageClient'

export const dynamic = 'force-dynamic'

// Server component — handles role-based access control for the SNM module.
// Allowed: SNM / SALES / Admin Sales / Sales Manager / ADMIN (see SNM_ROLES).
export default async function SnmPage() {
  await requireRole(SNM_ROLES)
  return <SnmPageClient />
}
