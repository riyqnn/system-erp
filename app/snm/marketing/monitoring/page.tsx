import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { MonitoringClient } from './MonitoringClient'

export const dynamic = 'force-dynamic'

export default async function SnmMonitoringPage() {
  await requireRole(SNM_ROLES)
  return <MonitoringClient />
}
