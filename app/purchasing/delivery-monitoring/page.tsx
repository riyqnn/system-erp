import { requireRole } from '@/lib/auth/server-auth'
import { DeliveryMonitoringClient } from './DeliveryMonitoringClient'

export default async function DeliveryMonitoringPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <DeliveryMonitoringClient />
}