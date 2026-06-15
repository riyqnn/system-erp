import { AnyObject } from '@/lib/any';
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase
      .from('tr_goods_issue')
      .select(`
        *,
        ms_product (product_id, product_name, uom),
        ms_warehouse (warehouse_id, warehouse_name)
      `)
      .order('issue_date', { ascending: false })

    if (error) throw error

    // Map database enum/columns to frontend formats
    const mappedData = data?.map((item: AnyObject) => {
      let displayPurpose = 'Production'
      if (item.purpose === 'SAMPLING') displayPurpose = 'Sampling'
      else if (item.purpose === 'RETURN') displayPurpose = 'Return'

      return {
        ...item,
        issue_code: item.issue_id,
        purpose: displayPurpose,
        ref_id: item.prod_order_id || '',
        ms_products: item.ms_product ? {
          product_code: item.ms_product.product_id,
          product_name: item.ms_product.product_name,
          units: item.ms_product.uom
        } : null,
        ms_warehouses: item.ms_warehouse ? {
          warehouse_name: item.ms_warehouse.warehouse_name
        } : null
      }
    })

    return NextResponse.json({ data: mappedData })
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

    const dbPurpose = body.purpose ? body.purpose.toUpperCase() : 'PRODUCTION'

    const payload = {
      issue_id: body.issue_code,
      prod_order_id: body.ref_id || null,
      product_id: body.product_id,
      warehouse_id: String(body.warehouse_id),
      batch_number: body.batch_number,
      quantity: Number(body.quantity),
      purpose: dbPurpose,
      issue_date: body.issue_date || new Date().toISOString(),
      issued_by: user.user_id
    }

    const { data, error } = await supabase
      .from('tr_goods_issue')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    // Insert stock movement to deduct stock
    if (payload.quantity > 0) {
      const now = new Date()
      const timestamp = now.getTime().toString().slice(-6)
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
      const mvCode = `MV-${timestamp}-${randomStr}`

      const movementPayload = {
        movement_id: mvCode,
        product_id: body.product_id,
        warehouse_id: String(body.warehouse_id),
        type: 'OUT',
        quantity: Number(body.quantity),
        reference_id: body.issue_code,
        reference_type: 'GI',
        movement_date: now.toISOString()
      }

      const { error: mvError } = await supabase
        .from('tr_stock_movement')
        .insert([movementPayload])

      if (mvError) {
        console.error("CRITICAL: Failed to insert stock movement for GI:", mvError)
        throw new Error('Gagal memotong stok. Silakan hubungi administrator.')
      }
    }

    // Notify Production that Materials have been issued
    const { createNotification } = await import('@/lib/services/notification.service')
    await createNotification({
      title: `Materials Issued: ${body.issue_code}`,
      message: `Materials have been handed over to Production by Inventory.`,
      type: 'INFORMATION',
      priority: 'MEDIUM',
      recipientRole: 'PRODUCTION', // Notify Production
      sourceModule: 'INVENTORY',
      sourceRefId: body.issue_code,
      sourceRefType: 'GOODS_ISSUE',
      actionUrl: `/apps/production/goods-receipt`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
