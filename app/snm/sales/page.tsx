import { requireRole } from '@/lib/auth/server-auth'
import { SalesClient } from './SalesClient'

export const dynamic = 'force-dynamic'

export default async function SnmSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requireRole(['SNM', 'SALES', 'ADMIN'])
  const sp = await searchParams
  return <SalesClient initialStatus={sp.status} />
}
