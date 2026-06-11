import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase
      .from('tr_stock_movements')
      .select(`
        *,
        ms_products!inner(product_code, product_name, units, category),
        ms_warehouses(warehouse_name)
      `)
      .eq('type', 'IN')
      .eq('reference_type', 'ADJ')
      .eq('ms_products.category', 'FG')
      .order('movement_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const payload = {
      product_id: body.product_id,
      warehouse_id: body.warehouse_id,
      type: 'IN',
      quantity: body.quantity,
      reference_id: body.ref_id, // e.g. PRD-2026...
      reference_type: 'ADJ',
      // We don't have received_by in tr_stock_movements directly, but movement_date is auto
    }

    const { data, error } = await supabase
      .from('tr_stock_movements')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    // Automatically complete the related Production Request
    if (body.ref_id) {
      await supabase
        .from('tr_production_request')
        .update({ status: 'Completed' })
        .eq('prd_code', body.ref_id)
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
