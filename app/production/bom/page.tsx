import { requireRole } from '@/lib/auth/server-auth'
import { BomClient } from './BomClient'

export default async function BomPage() {
  await requireRole(['PRODUCTION', 'ADMIN'])
  return <BomClient />
}
