import { requireRole } from '@/lib/auth/server-auth'
import { InventoryPageClient } from './InventoryPageClient'

// Server component - handles role-based access control
export default async function InventoryPage() {
  // Only INVENTORY and ADMIN roles can access this page
  // Non-authorized users will be redirected to their own module
  await requireRole(['INVENTORY', 'ADMIN'])

  return <InventoryPageClient />
}

