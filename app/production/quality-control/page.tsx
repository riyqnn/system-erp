import { requireRole } from '@/lib/auth/server-auth'
import { QualityControlClient } from './QualityControlClient'

export default async function QualityControlPage() {
  await requireRole(['PRODUCTION', 'ADMIN'])
  return <QualityControlClient />
}
