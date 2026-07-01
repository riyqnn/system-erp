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
    const fg_id = body.product_id
    const qty_req = Number(body.qty_requested)

    // 1. Fetch BOM for the requested FG product
    const { data: bomData, error: bomError } = await supabase
      .from('ms_bom_header')
      .select(`
        bom_id,
        ms_bom_detail(component_id, qty_required)
      `)
      .eq('product_id', fg_id)
      .limit(1)

    if (bomError) throw bomError

    const bomDetails = bomData && bomData.length > 0 ? bomData[0].ms_bom_detail : []

    // 2. Fetch Stock for all BOM components
    const rmIds = bomDetails?.map((b: { component_id: string }) => b.component_id) || []
    const stockMap: Record<string, number> = {}
    
    if (rmIds.length > 0) {
      const { data: stockData, error: stockError } = await supabase
        .from('tr_stock_balance')
        .select('product_id, quantity')
        .in('product_id', rmIds)
        .eq('status', 'AVAILABLE')

      if (stockError) throw stockError
      stockData?.forEach((s: { product_id: string, quantity: number }) => {
        stockMap[s.product_id] = (stockMap[s.product_id] || 0) + Number(s.quantity)
      })
    }

    // 3. Compare Required vs Available
    let hasShortage = false;
    const shortages: { product_id: string; required: number; available: number; shortage: number }[] = [];

    bomDetails?.forEach((b: { component_id: string; qty_required: number }) => {
      const required = Number(b.qty_required) * qty_req;
      const available = stockMap[b.component_id] || 0;
      if (available < required) {
        hasShortage = true;
        shortages.push({
          product_id: b.component_id,
          required,
          available,
          shortage: required - available
        })
      }
    })

    if (hasShortage) {
      return NextResponse.json({ 
        error: 'Insufficient materials', 
        shortage: true, 
        shortages 
      }, { status: 400 })
    }

    // 4. No shortage -> Insert as PENDING (awaiting BOM Verification approval)
    const payload = {
      production_request_id: body.prd_code,
      fg_product_id: fg_id,
      qty_requested: qty_req,
      request_date: body.request_date || new Date().toISOString(),
      requested_by: user.user_id,
      status: 'PENDING', // Awaiting BOM verification approval
      notes: body.notes || null
    }

    const { data, error } = await supabase
      .from('tr_production_request')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    // 5. Notify Inventory to verify BOM
    const { createNotification } = await import('@/lib/services/notification.service')
    await createNotification({
      title: `Production Request Ready for BOM Verification: ${body.prd_code}`,
      message: `Materials are available. Awaiting BOM verification and approval.`,
      type: 'INFORMATION',
      priority: 'HIGH',
      recipientRole: 'INVENTORY_MANAGER',
      sourceModule: 'INVENTORY',
      sourceRefId: body.prd_code,
      sourceRefType: 'PRODUCTION_REQUEST',
      actionUrl: `/inventory/verifikasi-bom`,
      createdBy: user.user_id,
    }).catch(err => console.error('Failed to send notification', err))

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
