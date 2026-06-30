import { requireRole } from '@/lib/auth/server-auth'
import { GoodsReceiptClient } from './GoodsReceiptClient'

export default async function GoodsReceiptPage() {
  await requireRole(['PURCHASING', 'ADMIN'])

  return <GoodsReceiptClient />
}