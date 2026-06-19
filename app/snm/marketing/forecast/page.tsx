import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { ForecastClient } from './ForecastClient'

export const dynamic = 'force-dynamic'

export default async function SnmForecastPage() {
  const user = await requireRole(SNM_ROLES)
  return <ForecastClient userId={user.user_id} />
}
