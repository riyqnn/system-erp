import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { CustomersClient } from './CustomersClient'

export const dynamic = 'force-dynamic'

export default async function SnmCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const user = await requireRole(SNM_ROLES)
  const sp = await searchParams
  return <CustomersClient initialCategory={sp.category} userId={user.user_id} />
}
