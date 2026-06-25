import { NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { AnyObject } from '@/lib/any'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'PRODUCTION', 'PRODUCTION_MANAGER'])

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
      .eq('status', 'IN_PROGRESS')
      .order('request_date', { ascending: false })

    if (error) throw error

    const mappedData = data?.map((item: AnyObject) => {
      let displayStatus = 'Pending'
      if (item.status === 'IN_PROGRESS') displayStatus = 'In Progress'
      else if (item.status === 'COMPLETED') displayStatus = 'Completed'
      else if (item.status === 'CANCELLED') displayStatus = 'Cancelled'

      return {
        id: item.production_request_id,
        product_id: item.fg_product_id,
        qty_requested: Number(item.qty_requested),
        request_date: item.request_date,
        requested_by: item.requested_by,
        status: displayStatus,
        notes: item.notes,
        products: item.ms_product ? {
          id: item.ms_product.product_id,
          name: item.ms_product.product_name,
          units: item.ms_product.uom
        } : null
      }
    })

    return NextResponse.json({ data: mappedData })
  } catch (error) {
    console.error("Production Requests GET Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    return NextResponse.json({ error: err.message || err.details || 'Internal error' }, { status: err.statusCode || 500 })
  }
}
