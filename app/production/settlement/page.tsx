import { requireRole } from '@/lib/auth/server-auth'
import { SettlementClient } from './SettlementClient'

export default async function SettlementPage() {
  await requireRole(['PRODUCTION', 'ADMIN'])
  return <SettlementClient />
}
