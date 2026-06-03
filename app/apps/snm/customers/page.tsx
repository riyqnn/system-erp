import { requireRole } from '@/lib/auth/server-auth'
import { CustomersClient } from './CustomersClient'

export const dynamic = 'force-dynamic'

export default async function SnmCustomersPage() {
  await requireRole(['SNM', 'SALES', 'ADMIN'])
  return <CustomersClient />
}
