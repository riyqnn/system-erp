import { requireRole } from '@/lib/auth/server-auth'
import { PlanningClient } from './PlanningClient'

export default async function PlanningPage() {
  await requireRole(['PRODUCTION', 'ADMIN'])
  return <PlanningClient />
}
