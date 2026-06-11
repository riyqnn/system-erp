import { requireRole } from '@/lib/auth/server-auth'
import { PurchaseOrdersClient } from './PurchaseOrdersClient'

export default async function PurchaseOrdersPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <PurchaseOrdersClient />
}