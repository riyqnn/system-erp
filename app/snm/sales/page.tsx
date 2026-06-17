import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { SalesClient } from './SalesClient'

export const dynamic = 'force-dynamic'

export default async function SnmSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await requireRole(SNM_ROLES)
  const sp = await searchParams
  return <SalesClient initialStatus={sp.status} userId={user.user_id} />
}
