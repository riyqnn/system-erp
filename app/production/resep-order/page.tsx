import { requireRole } from '@/lib/auth/server-auth'
import { ResepOrderClient } from './ResepOrderClient'

export default async function ResepOrderPage() {
  await requireRole(['PRODUCTION', 'ADMIN'])
  return <ResepOrderClient />
}
