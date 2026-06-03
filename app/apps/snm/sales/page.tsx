import { requireRole } from '@/lib/auth/server-auth'
import { SalesClient } from './SalesClient'

export const dynamic = 'force-dynamic'

export default async function SnmSalesPage() {
  await requireRole(['SNM', 'SALES', 'ADMIN'])
  return <SalesClient />
}
