import { requireRole } from '@/lib/auth/server-auth'
import { CreatePurchaseOrderClient } from './CreatePurchaseOrderClient'

export default async function CreatePurchaseOrderPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <CreatePurchaseOrderClient />
}