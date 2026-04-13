import { requireRole } from '@/lib/auth/server-auth'
import { ProductionPageClient } from './ProductionPageClient'

// Server component - handles role-based access control
export default async function ProductionPage() {
  // Only PRODUCTION and ADMIN roles can access this page
  // Non-authorized users will be redirected to their own module
  await requireRole(['PRODUCTION', 'ADMIN'])

  return <ProductionPageClient />
}

