import { requireRole } from '@/lib/auth/server-auth'
import { CreatePurchaseRequisitionClient } from './CreatePurchaseRequisitionClient'

export default async function CreatePurchaseRequisitionPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <CreatePurchaseRequisitionClient />
}