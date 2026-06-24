import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/services/notification.service'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'PRODUCTION', 'PRODUCTION_MANAGER'])

    const supabase = await createRouteHandlerClient()
    const { action, product_id, qty_requested, notes, start_date, end_date } = await request.json()

    if (action === 'PROCESS') {
      // 1. Update Request Status
      const { error: reqError } = await supabase
        .from('tr_production_request')
        .update({ status: 'COMPLETED', notes: notes })
        .eq('production_request_id', id)
      if (reqError) throw reqError

      // 2. Create Production Order
      const prodOrderId = `PROD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
      const { error: poError } = await supabase
        .from('tr_production_order')
        .insert({
          prod_order_id: prodOrderId,
          production_request_id: id,
          product_id: product_id,
          target_qty: qty_requested,
          start_date: start_date,
          end_date: end_date,
          status: 'PLANNED'
        })
      if (poError) throw poError

      // 3. Notify Inventory
      await createNotification({
        title: `Production Request Processed`,
        message: `Permintaan produksi ${id} telah diproses menjadi PO: ${prodOrderId}.`,
        type: 'INFORMATION',
        priority: 'MEDIUM',
        recipientRole: 'INVENTORY',
        sourceModule: 'PRODUCTION',
        sourceRefId: id,
        sourceRefType: 'PRODUCTION_REQUEST',
        actionUrl: `/inventory/permintaan-produksi`,
        createdBy: user.user_id,
      })

      return NextResponse.json({ message: 'Processed successfully', po_id: prodOrderId })
    }

    if (action === 'REJECT') {
      // 1. Update Request Status
      const { error: reqError } = await supabase
        .from('tr_production_request')
        .update({ status: 'CANCELLED' })
        .eq('production_request_id', id)
      if (reqError) throw reqError

      // 2. Notify Inventory
      await createNotification({
        title: `Production Request Rejected`,
        message: `Permintaan produksi ${id} telah ditolak oleh Production.`,
        type: 'WARNING',
        priority: 'HIGH',
        recipientRole: 'INVENTORY',
        sourceModule: 'PRODUCTION',
        sourceRefId: id,
        sourceRefType: 'PRODUCTION_REQUEST',
        actionUrl: `/inventory/permintaan-produksi`,
        createdBy: user.user_id,
      })

      return NextResponse.json({ message: 'Rejected successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Production Requests PATCH Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
