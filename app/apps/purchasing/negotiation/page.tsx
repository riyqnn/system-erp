import { requireRole } from '@/lib/auth/server-auth'
import { PriceNegotiationClient } from './PriceNegotiationClient'

export default async function PriceNegotiationPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <PriceNegotiationClient />
}