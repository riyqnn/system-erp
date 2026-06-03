import { requireRole } from '@/lib/auth/server-auth'
import { ForecastClient } from './ForecastClient'

export const dynamic = 'force-dynamic'

export default async function SnmForecastPage() {
  await requireRole(['SNM', 'SALES', 'ADMIN'])
  return <ForecastClient />
}
