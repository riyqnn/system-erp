import { requireAdmin } from '@/lib/auth/server-auth'
import { ModuleStatisticsClient } from './ModuleStatisticsClient'

// Server component - only ADMIN can access
export default async function ModuleStatisticsPage() {
  await requireAdmin()
  return <ModuleStatisticsClient />
}
