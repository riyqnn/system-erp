import { AnyObject } from '@/lib/any';
import { NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    // 1. Fetch products
    const { data: products, error: pError } = await supabase
      .from('ms_product')
      .select('product_id, product_name, category, uom, minimum_stock')

    if (pError) throw pError

    // 2. Fetch warehouses
    const { data: warehouses, error: wError } = await supabase
      .from('ms_warehouse')
      .select('warehouse_id, warehouse_name')

    if (wError) throw wError

    // 3. Fetch all stock movements
    const { data: movements, error: mError } = await supabase
      .from('tr_stock_movement')
      .select('product_id, warehouse_id, type, quantity')

    if (mError) throw mError

    // 4. Calculate net quantities per product & warehouse
    const stockMap = new Map<string, number>()
    movements?.forEach((mv: AnyObject) => {
      if (!mv.product_id || !mv.warehouse_id) return
      const key = `${mv.product_id}_${mv.warehouse_id}`
      const current = stockMap.get(key) || 0
      const qty = Number(mv.quantity) || 0
      if (mv.type === 'IN') {
        stockMap.set(key, current + qty)
      } else if (mv.type === 'OUT') {
        stockMap.set(key, current - qty)
      }
    })

    // 5. Build dynamic result array
    const result: AnyObject[] = []
    products?.forEach((p: AnyObject) => {
      warehouses?.forEach((w: AnyObject) => {
        const key = `${p.product_id}_${w.warehouse_id}`
        const availableQty = stockMap.get(key) || 0

        result.push({
          product_id: p.product_id,
          product_code: p.product_id,
          product_name: p.product_name,
          category: p.category,
          units: p.uom,
          minimum_stock: Number(p.minimum_stock) || 0,
          warehouse_id: w.warehouse_id,
          warehouse_code: w.warehouse_id,
          warehouse_name: w.warehouse_name,
          available_qty: availableQty,
          reserved_qty: 0,
          quarantine_qty: 0,
          nearest_expiry: null
        })
      })
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
