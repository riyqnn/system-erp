import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY', 'SALES'])

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase
      .from('tr_delivery_order')
      .select(`
        *,
        ms_products (product_code, product_name, units)
      `)
      .order('order_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const { do_id, status, do_code, product_id, quantity, warehouse_id } = body

    if (!warehouse_id) {
      return NextResponse.json({ error: 'Warehouse ID is required' }, { status: 400 })
    }

    // 1. Check current status to prevent duplicate stock deduction
    const { data: currentDO, error: fetchError } = await supabase
      .from('tr_delivery_order')
      .select('status')
      .eq('do_id', do_id)
      .single()

    if (fetchError) throw fetchError

    if ((currentDO.status === 'Shipped' || currentDO.status === 'Delivered') && status === currentDO.status) {
      return NextResponse.json({ error: `DO is already in ${status} status` }, { status: 400 })
    }

    // 2. Update DO Status
    const { data: doData, error: doError } = await supabase
      .from('tr_delivery_order')
      .update({ 
        status: status,
        shipping_date: status === 'Shipped' || status === 'Delivered' ? new Date().toISOString() : undefined,
        shipped_by: user.id
      })
      .eq('do_id', do_id)
      .select()
      .single()

    if (doError) throw doError

    // 3. If transitioning to Shipped, deduct stock
    if (status === 'Shipped' && currentDO.status !== 'Shipped') {
      const payload = {
        product_id,
        warehouse_id,
        type: 'OUT',
        quantity,
        reference_id: do_code,
        reference_type: 'DO'
      }

      const { error: mvError } = await supabase
        .from('tr_stock_movements')
        .insert([payload])

      if (mvError) {
        console.error("CRITICAL: Failed to insert stock movement:", mvError)
        throw new Error('Gagal memotong stok. Silakan hubungi administrator.')
      }
    }

    return NextResponse.json({ data: doData })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
