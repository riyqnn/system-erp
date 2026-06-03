import { requireRole } from '@/lib/auth/server-auth'
import { GoodsIssueClient } from './GoodsIssueClient'

export default async function GoodsIssuePage() {
  await requireRole(['PRODUCTION', 'ADMIN'])
  return <GoodsIssueClient />
}
