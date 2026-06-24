import { AnyObject } from '@/lib/any';
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/services/notification.service'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase
      .from('tr_purchase_requisition')
      .select(`
        pr_id,
        request_date,
        requested_by,
        status,
        notes,
        tr_pr_detail (
          product_id,
          qty_requested,
          ms_product (
            product_id,
            product_name,
            uom
          )
        )
      `)
      .order('request_date', { ascending: false })

    if (error) throw error

    // Flatten/map database records to the old single-table format expected by the frontend
    const flattenedData: AnyObject[] = []
    data?.forEach((pr: AnyObject) => {
      const details = pr.tr_pr_detail || []

      let displayStatus = 'Pending'
      if (pr.status === 'PROCESSED') displayStatus = 'Processed'
      else if (pr.status === 'CLOSED') displayStatus = 'Closed'

      if (details.length === 0) {
        flattenedData.push({
          purchase_request_id: pr.pr_id,
          pr_code: pr.pr_id,
          product_id: null,
          qty_requested: 0,
          request_date: pr.request_date,
          requested_by: pr.requested_by,
          status: displayStatus,
          notes: pr.notes,
          ms_products: null
        })
      } else {
        details.forEach((det: AnyObject) => {
          flattenedData.push({
            purchase_request_id: pr.pr_id,
            pr_code: pr.pr_id,
            product_id: det.product_id,
            qty_requested: Number(det.qty_requested),
            request_date: pr.request_date,
            requested_by: pr.requested_by,
            status: displayStatus,
            notes: pr.notes,
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const { pr_code, product_id, qty_requested, notes, status } = body

    if (!pr_code || !product_id || !qty_requested) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Insert header
    const { data: headerData, error: headerError } = await supabase
      .from('tr_purchase_requisition')
      .insert({
        pr_id: pr_code,
        request_date: body.request_date || new Date().toISOString(),
        requested_by: user.user_id,
        status: status ? status.toUpperCase() : 'PENDING',
        notes: notes || null
      })
      .select()
      .single()

    if (headerError) throw headerError

    // 2. Insert detail
    const { error: detailError } = await supabase
      .from('tr_pr_detail')
      .insert({
        pr_id: pr_code,
        product_id: product_id,
        qty_requested: Number(qty_requested)
      })

    if (detailError) {
      // Rollback header if detail fails
      await supabase.from('tr_purchase_requisition').delete().eq('pr_id', pr_code)
      throw detailError
    }

    // 3. Create a notification for Purchasing department
    await createNotification({
      title: `New PR Created: ${pr_code}`,
      message: `A new Purchase Requisition has been requested by the Inventory module.`,
      type: 'INFORMATION',
      priority: 'HIGH',
      recipientRole: 'PURCHASING', // broadcast to purchasing module
      sourceModule: 'INVENTORY',
      sourceRefId: pr_code,
      sourceRefType: 'PURCHASE_REQUISITION',
      actionUrl: `/apps/purchasing/purchase-requisition`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data: headerData }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
