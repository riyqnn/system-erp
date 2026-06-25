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
      .from('tr_goods_receipt')
      .select(`
        *,
        ms_supplier (supplier_id, supplier_name),
        ms_product (product_id, product_name, uom),
        ms_warehouse (warehouse_id, warehouse_name)
      `)
      .order('receipt_date', { ascending: false })

    if (error) throw error

    // Map database enum/columns to frontend formats
    const mappedData = data?.map((item: AnyObject) => {
      let displayStatus = 'Accepted'
      if (item.status === 'REJECTED') displayStatus = 'Rejected'
      else if (item.status === 'PARTIAL') displayStatus = 'Partial'

      return {
        ...item,
        gr_code: item.receipt_id,
        status: displayStatus,
        ms_suppliers: item.ms_supplier ? {
          supplier_name: item.ms_supplier.supplier_name
        } : null,
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

    const dbStatus = body.status ? body.status.toUpperCase() : 'ACCEPTED'

    const payload = {
      receipt_id: body.gr_code,
      supplier_id: body.supplier_id,
      product_id: body.product_id,
      warehouse_id: String(body.warehouse_id),
      quantity: Number(body.quantity),
      batch_number: body.batch_number,
      expiry_date: body.expiry_date || null,
      receipt_date: body.receipt_date || new Date().toISOString(),
      received_by: user.user_id,
      status: dbStatus,
      reject_qty: Number(body.reject_qty) || 0,
      reject_reason: body.reject_reason || null
    }

    const { data, error } = await supabase
      .from('tr_goods_receipt')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    // Insert stock movement for net quantity if accepted/partial
    const netQuantity = Number(body.quantity) - (Number(body.reject_qty) || 0)
    if (netQuantity > 0 && (dbStatus === 'ACCEPTED' || dbStatus === 'PARTIAL')) {
      const now = new Date()
      const timestamp = now.getTime().toString().slice(-6)
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
      const mvCode = `MV-${timestamp}-${randomStr}`

      const movementPayload = {
        movement_id: mvCode,
        product_id: body.product_id,
        warehouse_id: String(body.warehouse_id),
        type: 'IN',
        quantity: Number(netQuantity),
        reference_id: body.gr_code,
        reference_type: 'GR',
        movement_date: now.toISOString()
      }

      const { error: mvError } = await supabase
        .from('tr_stock_movement')
        .insert([movementPayload])

      if (mvError) {
        console.error("CRITICAL: Failed to insert stock movement for GR:", mvError)
        throw new Error('Gagal menambah stok movement. Silakan hubungi administrator.')
      }

      // Update actual stock balance (ms_inventory equivalent)
      const { data: existingStock } = await supabase
        .from('tr_stock_balance')
        .select('*')
        .eq('product_id', body.product_id)
        .eq('warehouse_id', String(body.warehouse_id))
        .eq('batch_number', body.batch_number)
        .single()

      if (existingStock) {
        await supabase
          .from('tr_stock_balance')
          .update({ quantity: Number(existingStock.quantity) + netQuantity })
          .eq('stock_id', existingStock.stock_id)
      } else {
        await supabase
          .from('tr_stock_balance')
          .insert([{
            product_id: body.product_id,
            warehouse_id: String(body.warehouse_id),
            batch_number: body.batch_number,
            quantity: netQuantity,
            expiry_date: body.expiry_date || null,
            status: 'AVAILABLE'
          }])
      }
    }

    // Notify Purchasing that Goods have been received so they can track PO fulfillment
    const { createNotification } = await import('@/lib/services/notification.service')
    await createNotification({
      title: `Goods Received: ${body.gr_code}`,
      message: `A new Goods Receipt has been processed by Inventory.`,
      type: 'INFORMATION',
      priority: 'MEDIUM',
      recipientRole: 'PURCHASING', // Notify Purchasing
      sourceModule: 'INVENTORY',
      sourceRefId: body.gr_code,
      sourceRefType: 'GOODS_RECEIPT',
      actionUrl: `/apps/purchasing/goods-receipt`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
