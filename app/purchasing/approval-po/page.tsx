import { requireRole } from '@/lib/auth/server-auth'
import { ApprovalPOClient } from './ApprovalPOClient'

export default async function ApprovalPOPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <ApprovalPOClient />
}