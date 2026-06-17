import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { DeliveriesClient } from './DeliveriesClient'

export const dynamic = 'force-dynamic'

export default async function SnmDeliveriesPage() {
  const user = await requireRole(SNM_ROLES)
  return <DeliveriesClient userId={user.user_id} />
}
