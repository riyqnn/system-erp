import { requireRole } from '@/lib/auth/server-auth'
import { PurchasingPageClient } from './PurchasingPageClient'

// Server component - handles role-based access control
export default async function PurchasingPage() {
  // Only PURCHASING and ADMIN roles can access this page
  // Non-authorized users will be redirected to their own module
  await requireRole(['PURCHASING', 'ADMIN'])

  return <PurchasingPageClient />
}

