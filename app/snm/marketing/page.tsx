import { requireRole, SNM_ROLES } from '@/lib/auth/server-auth'
import { MarketingClient } from './MarketingClient'

export const dynamic = 'force-dynamic'

export default async function SnmMarketingPage() {
  await requireRole(SNM_ROLES)
  return <MarketingClient />
}
