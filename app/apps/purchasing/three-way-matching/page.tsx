import { requireRole } from '@/lib/auth/server-auth'
import { ThreeWayMatchingClient } from './ThreeWayMatchingClient'

export default async function ThreeWayMatchingPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <ThreeWayMatchingClient />
}