import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const warehouseId = searchParams.get('warehouse_id')

    const supabase = await createRouteHandlerClient()

    let query = supabase
      .from('tr_stock_balance')
      .select('batch_number, quantity, expiry_date')
      .eq('status', 'AVAILABLE')
      .gt('quantity', 0)
      .not('batch_number', 'is', null)

    if (productId) query = query.eq('product_id', productId)
    if (warehouseId) query = query.eq('warehouse_id', warehouseId)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("GET Batches Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error'
    const status = err.statusCode || 500
    return NextResponse.json({ error: msg }, { status })
  }
}
