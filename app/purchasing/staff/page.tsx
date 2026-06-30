import { requireRole } from '@/lib/auth/server-auth'
import { PurchasingPageClient } from '../PurchasingPageClient'

export default async function PurchasingStaffPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <PurchasingPageClient workspaceRole="PURCHASING" />
}