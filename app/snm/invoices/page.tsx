import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { InvoicesClient } from './InvoicesClient'

export const dynamic = 'force-dynamic'

export default async function SnmInvoicesPage() {
  await requireRole(SNM_ROLES)
  return <InvoicesClient />
}
