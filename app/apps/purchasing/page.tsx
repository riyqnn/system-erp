import { requireRole } from '@/lib/auth/server-auth'
import { PurchasingDefaultRedirect } from './PurchasingDefaultRedirect'

// Server component - handles role-based access control
export default async function PurchasingPage() {
  await requireRole(['PURCHASING', 'MANAGER_PURCHASING', 'ADMIN'])

  return <PurchasingDefaultRedirect />
}