import { requireRole } from '@/lib/auth/server-auth'
import { OrdersClient } from './OrdersClient'

export default async function ProductionOrdersPage() {
  await requireRole(['PRODUCTION', 'ADMIN'])
  return <OrdersClient />
}
