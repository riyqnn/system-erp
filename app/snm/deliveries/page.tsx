import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { DeliveriesClient } from './DeliveriesClient'

export const dynamic = 'force-dynamic'

export default async function SnmDeliveriesPage() {
  await requireRole(SNM_ROLES)
  return <DeliveriesClient />
}
