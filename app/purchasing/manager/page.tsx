import { requireRole } from '@/lib/auth/server-auth'
import { PurchasingPageClient } from '../PurchasingPageClient'

export default async function ManagerPurchasingPage() {
  await requireRole(['PURCHASING', 'MANAGER_PURCHASING', 'ADMIN'])

  return <PurchasingPageClient workspaceRole="MANAGER_PURCHASING" />
}