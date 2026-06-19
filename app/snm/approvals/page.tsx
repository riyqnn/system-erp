import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { ApprovalsClient } from './ApprovalsClient'

export const dynamic = 'force-dynamic'

export default async function SnmApprovalsPage() {
  const user = await requireRole(SNM_ROLES)
  return <ApprovalsClient userId={user.user_id} />
}
