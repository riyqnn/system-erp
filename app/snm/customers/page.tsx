import { requireRole } from '@/lib/auth/server-auth'
import { CustomersClient } from './CustomersClient'

export const dynamic = 'force-dynamic'

export default async function SnmCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  await requireRole(['SNM', 'SALES', 'ADMIN'])
  const sp = await searchParams
  return <CustomersClient initialCategory={sp.category} />
}
