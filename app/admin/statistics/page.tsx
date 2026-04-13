import { requireAdmin } from '@/lib/auth/server-auth'
import { StatisticsClient } from './StatisticsClient'

// Server component - only ADMIN can access
export default async function StatisticsPage() {
  await requireAdmin()
  return <StatisticsClient />
}
