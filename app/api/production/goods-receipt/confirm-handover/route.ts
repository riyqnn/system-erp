import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createNotification } from '@/lib/services/notification.service'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'PRODUCTION', 'PRODUCTION_MANAGER'])

    const { issue_id, action, notes } = await request.json()

    if (action === 'RECEIVE') {
      const supabase = await import('@/lib/supabase/server').then(m => m.createRouteHandlerClient())
      
      // 1. Fetch the Goods Issue record
      const { data: giData, error: giError } = await supabase
        .from('tr_goods_issue')
        .select('*')
        .eq('issue_id', issue_id)
        .single()
        
      if (giError || !giData) throw new Error('Goods Issue not found')
      
      // 2. Fetch the corresponding Stock Balance
      const { data: existingStock } = await supabase
        .from('tr_stock_balance')
        .select('*')
        .eq('product_id', giData.product_id)
        .eq('warehouse_id', giData.warehouse_id)
        .eq('batch_number', giData.batch_number)
        .single()
        
      if (existingStock) {
        // 3. Deduct stock balance
        await supabase
          .from('tr_stock_balance')
          .update({ quantity: Number(existingStock.quantity) - Number(giData.quantity) })
          .eq('stock_id', existingStock.stock_id)
      } else {
        throw new Error('Stock balance not found for this batch')
      }

      // 4. Insert into tr_stock_movement (Ledger)
      const now = new Date()
      const mvCode = `MV-${now.getTime().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      
      await supabase
        .from('tr_stock_movement')
        .insert([{
          movement_id: mvCode,
          product_id: giData.product_id,
          warehouse_id: giData.warehouse_id,
          type: 'OUT',
          quantity: Number(giData.quantity),
          reference_id: issue_id,
          reference_type: 'GI',
          movement_date: now.toISOString()
        }])

      // 5. Notify Inventory that material has been received
      await createNotification({
        title: `Material Diterima: ${issue_id}`,
        message: notes
          ? `Tim Production telah mengkonfirmasi penerimaan material ${issue_id}. Catatan: ${notes}`
          : `Tim Production telah mengkonfirmasi penerimaan material ${issue_id}. Serah terima fisik berhasil.`,
        type: 'INFORMATION',
        priority: 'MEDIUM',
        recipientRole: 'INVENTORY',
        sourceModule: 'PRODUCTION',
        sourceRefId: issue_id,
        sourceRefType: 'GOODS_ISSUE',
        actionUrl: `/inventory/material-handover`,
        createdBy: user.user_id,
      })
      return NextResponse.json({ message: 'Confirmed successfully' })
    }

    if (action === 'REJECT') {
      // Notify Inventory that material was rejected
      await createNotification({
        title: `Material Ditolak: ${issue_id}`,
        message: notes
          ? `Tim Production menolak material ${issue_id}. Alasan: ${notes}`
          : `Tim Production menolak penerimaan material ${issue_id}. Silakan cek fisik material.`,
        type: 'WARNING',
        priority: 'HIGH',
        recipientRole: 'INVENTORY',
        sourceModule: 'PRODUCTION',
        sourceRefId: issue_id,
        sourceRefType: 'GOODS_ISSUE',
        actionUrl: `/inventory/material-handover`,
        createdBy: user.user_id,
      })
      return NextResponse.json({ message: 'Rejected successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error("Production Confirm Handover Error:", error)
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
