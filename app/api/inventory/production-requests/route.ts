import { AnyObject } from '@/lib/any';
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY', 'PRODUCTION'])

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase
      .from('tr_production_request')
      .select(`
        production_request_id,
        fg_product_id,
        qty_requested,
        request_date,
        requested_by,
        status,
        notes,
        ms_product (
          product_id,
          product_name,
          uom
        )
      `)
      .order('request_date', { ascending: false })

    if (error) throw error

    // Map database enum/columns to what the frontend expects
    const mappedData = data?.map((item: AnyObject) => {
      // Map status enum: 'PENDING' -> 'Pending', 'IN_PROGRESS' -> 'In Progress', etc.
      let displayStatus = 'Pending'
      if (item.status === 'IN_PROGRESS') displayStatus = 'In Progress'
      else if (item.status === 'COMPLETED') displayStatus = 'Completed'
      else if (item.status === 'CANCELLED') displayStatus = 'Cancelled'

      return {
        production_request_id: item.production_request_id,
        prd_code: item.production_request_id,
        product_id: item.fg_product_id,
        qty_requested: Number(item.qty_requested),
        request_date: item.request_date,
        requested_by: item.requested_by,
        status: displayStatus,
        notes: item.notes,
        ms_products: item.ms_product ? {
          product_code: item.ms_product.product_id,
          product_name: item.ms_product.product_name,
          units: item.ms_product.uom
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

    const payload = {
      production_request_id: body.prd_code,
      fg_product_id: body.product_id,
      qty_requested: Number(body.qty_requested),
      request_date: body.request_date || new Date().toISOString(),
      requested_by: user.user_id,
      status: body.status ? body.status.toUpperCase().replace(' ', '_') : 'PENDING',
      notes: body.notes || null
    }

    const { data, error } = await supabase
      .from('tr_production_request')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    // Notify Production that a new request has been made
    const { createNotification } = await import('@/lib/services/notification.service')
    await createNotification({
      title: `New Production Request: ${body.prd_code}`,
      message: `A new request has been submitted by Inventory.`,
      type: 'INFORMATION',
      priority: 'HIGH',
      recipientRole: 'PRODUCTION', // Notify Production
      sourceModule: 'INVENTORY',
      sourceRefId: body.prd_code,
      sourceRefType: 'PRODUCTION_REQUEST',
      actionUrl: `/production/orders`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
