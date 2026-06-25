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
      .from('tr_stock_movement')
      .select(`
        *,
        ms_product!inner(product_id, product_name, uom, category),
        ms_warehouse(warehouse_name)
      `)
      .eq('type', 'IN')
      .eq('reference_type', 'PROD_RECEIPT')
      .eq('ms_product.category', 'FG')
      .order('movement_date', { ascending: false })

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

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const now = new Date()
    const timestamp = now.getTime().toString().slice(-6)
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
    const mvCode = `MV-${timestamp}-${randomStr}`

    const payload = {
      movement_id: mvCode,
      product_id: body.product_id,
      warehouse_id: String(body.warehouse_id),
      type: 'IN',
      quantity: Number(body.quantity),
      reference_id: body.ref_id, // e.g. PRD-2026...
      reference_type: 'PROD_RECEIPT',
    }

    const { data, error } = await supabase
      .from('tr_stock_movement')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    // Update actual stock balance (ms_inventory equivalent)
    const { data: existingStock } = await supabase
      .from('tr_stock_balance')
      .select('*')
      .eq('product_id', body.product_id)
      .eq('warehouse_id', String(body.warehouse_id))
      .eq('batch_number', body.batch_number || null)
      .single()

    if (existingStock) {
      await supabase
        .from('tr_stock_balance')
        .update({ quantity: Number(existingStock.quantity) + Number(body.quantity) })
        .eq('stock_id', existingStock.stock_id)
    } else {
      await supabase
        .from('tr_stock_balance')
        .insert([{
          product_id: body.product_id,
          warehouse_id: String(body.warehouse_id),
          batch_number: body.batch_number || null,
          quantity: Number(body.quantity),
          expiry_date: body.expiry_date || null,
          status: 'AVAILABLE'
        }])
    }

    // Automatically complete the related Production Request
    if (body.ref_id) {
      await supabase
        .from('tr_production_request')
        .update({ status: 'COMPLETED' })
        .eq('production_request_id', body.ref_id)
    }

    // Notify Production that Finished Goods have been received
    const { createNotification } = await import('@/lib/services/notification.service')
    await createNotification({
      title: `Finished Goods Received: ${mvCode}`,
      message: `Inventory has successfully received Finished Goods from Production.`,
      type: 'APPROVAL', // or INFORMATION
      priority: 'MEDIUM',
      recipientRole: 'PRODUCTION', // Notify Production
      sourceModule: 'INVENTORY',
      sourceRefId: mvCode,
      sourceRefType: 'FG_RECEIPT',
      actionUrl: `/production/goods-receipt`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
