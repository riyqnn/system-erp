import { AnyObject } from '@/lib/any';
import { NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase
      .from('tr_stock_movement')
      .select(`
        *,
        ms_product (product_id, product_name, uom, category),
        ms_warehouse (warehouse_name)
      `)
      .order('movement_date', { ascending: false })
      .limit(1000) // Add limit to prevent memory issue

    if (error) throw error

    // Map DB fields to what the frontend expects (ms_products, ms_warehouses, product_code, units)
    const mappedData = data?.map((item: AnyObject) => ({
      ...item,
      ms_products: item.ms_product ? {
        product_code: item.ms_product.product_id,
        product_name: item.ms_product.product_name,
        units: item.ms_product.uom,
        category: item.ms_product.category
      } : null,
      ms_warehouses: item.ms_warehouse ? {
        warehouse_name: item.ms_warehouse.warehouse_name
      } : null
    }))

    return NextResponse.json({ data: mappedData })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
