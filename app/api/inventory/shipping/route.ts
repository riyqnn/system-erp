import { AnyObject } from '@/lib/any';
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
        do_id,
        do_date,
        delivery_address,
        status,
        warehouse_id,
        tr_so_header (
          so_id,
          ms_customer (
            cust_id,
            name
          ),
          tr_so_detail (
            product_id,
            qty_order,
            ms_product (
              product_id,
              product_name,
              uom
            )
          )
        )
      `)
      .order('do_date', { ascending: false })

    if (error) throw error

    // Flatten and map relation results for the frontend
    const flattenedData: AnyObject[] = []
    data?.forEach((d: AnyObject) => {
      const soHeader = d.tr_so_header
      const customer = soHeader?.ms_customer
      const details = soHeader?.tr_so_detail || []

      let displayStatus = 'Pending'
      if (d.status === 'SHIPPED') displayStatus = 'Shipped'
      else if (d.status === 'DELIVERED') displayStatus = 'Delivered'
      else if (d.status === 'CANCELLED') displayStatus = 'Void'

      if (details.length === 0) {
        flattenedData.push({
          do_id: d.do_id,
          do_code: d.do_id,
          customer_id: customer?.cust_id || '',
          customer_name: customer?.name || 'Unknown Customer',
          product_id: '',
          quantity: 0,
          order_date: d.do_date || d.created_at,
          shipping_date: d.delivered_at || null,
          delivery_address: d.delivery_address || '',
          status: displayStatus,
          ms_products: null
        })
      } else {
        details.forEach((det: AnyObject) => {
          flattenedData.push({
            do_id: d.do_id,
            do_code: d.do_id,
            customer_id: customer?.cust_id || '',
            customer_name: customer?.name || 'Unknown Customer',
            product_id: det.product_id,
            quantity: Number(det.qty_order),
            order_date: d.do_date || d.created_at,
            shipping_date: d.delivered_at || null,
            delivery_address: d.delivery_address || '',
            status: displayStatus,
            ms_products: det.ms_product ? {
              product_code: det.ms_product.product_id,
              product_name: det.ms_product.product_name,
              units: det.ms_product.uom
            } : null
          })
        })
      }
    })

    return NextResponse.json({ data: flattenedData })
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

    // 1. Check current status
    const { data: currentDO, error: fetchError } = await supabase
      .from('tr_delivery_order')
      .select('status')
      .eq('do_id', do_id)
      .single()

    if (fetchError) throw fetchError

    let dbStatus = 'DELIVERED'
    if (status === 'Void' || status === 'CANCELLED') {
      dbStatus = 'CANCELLED'
    } else if (status === 'Shipped' || status === 'SHIPPED') {
      dbStatus = 'SHIPPED'
    }

    if (currentDO.status === dbStatus) {
      return NextResponse.json({ error: `DO is already in ${status} status` }, { status: 400 })
    }

    // 2. Update DO Status
    const updatePayload: AnyObject = { 
      status: dbStatus,
      updated_at: new Date().toISOString()
    }
    if (dbStatus === 'DELIVERED') {
      updatePayload.delivered_at = new Date().toISOString()
    }

    const { data: doData, error: doError } = await supabase
      .from('tr_delivery_order')
      .update(updatePayload)
      .eq('do_id', do_id)
      .select()
      .single()

    if (doError) throw doError

    // 3. If transitioning to DELIVERED, deduct stock
    if (dbStatus === 'DELIVERED' && currentDO.status !== 'DELIVERED') {
      const now = new Date()
      const timestamp = now.getTime().toString().slice(-6)
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
      const mvCode = `MV-${timestamp}-${randomStr}`

      const payload = {
        movement_id: mvCode,
        product_id,
        warehouse_id: String(warehouse_id),
        type: 'OUT',
        quantity: Number(quantity),
        reference_id: do_code,
        reference_type: 'DO',
        movement_date: now.toISOString()
      }

      const { error: mvError } = await supabase
        .from('tr_stock_movement')
        .insert([payload])

      if (mvError) {
        console.error("CRITICAL: Failed to insert stock movement:", mvError)
        throw new Error('Gagal memotong stok. Silakan hubungi administrator.')
      }

      // Notify Sales that Delivery Order has been delivered
      const { createNotification } = await import('@/lib/services/notification.service')
      await createNotification({
        title: `Order Delivered: ${do_code}`,
        message: `Inventory has successfully delivered the order to the customer.`,
        type: 'INFORMATION',
        priority: 'MEDIUM',
        recipientRole: 'SALES', // Notify Sales
        sourceModule: 'INVENTORY',
        sourceRefId: do_code,
        sourceRefType: 'DELIVERY_ORDER',
        actionUrl: `/snm/sales`, // Link to Sales module
        createdBy: user.user_id,
      })
    }

    return NextResponse.json({ data: doData })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
