import { requireRole } from '@/lib/auth/server-auth'
import { RFQSourcingClient } from './RFQSourcingClient'

export default async function RFQSourcingPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <RFQSourcingClient />
}