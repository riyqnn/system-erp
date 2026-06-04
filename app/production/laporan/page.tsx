import { requireRole } from '@/lib/auth/server-auth'
import { LaporanClient } from './LaporanClient'

export default async function LaporanPage() {
  await requireRole(['PRODUCTION', 'ADMIN'])
  return <LaporanClient />
}
