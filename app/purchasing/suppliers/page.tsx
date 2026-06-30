import { requireRole } from '@/lib/auth/server-auth'
import { SuppliersPageClient } from './SuppliersPageClient'

export default async function SuppliersPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <SuppliersPageClient />
}