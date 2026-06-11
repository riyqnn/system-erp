import { requireRole } from '@/lib/auth/server-auth'
import { ProduksiClient } from './ProduksiClient'

export default async function ProduksiPage() {
  await requireRole(['PRODUCTION', 'ADMIN'])
  return <ProduksiClient />
}
