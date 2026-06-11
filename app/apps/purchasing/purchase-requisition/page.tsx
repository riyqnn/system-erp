import { requireRole } from '@/lib/auth/server-auth'
import { PurchaseRequisitionClient } from './PurchaseRequisitionClient'

export default async function PurchaseRequisitionPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <PurchaseRequisitionClient />
}