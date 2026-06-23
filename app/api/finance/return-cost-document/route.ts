import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/services/notification.service'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'FINANCE', 'COST_ACCOUNTING'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const { settlement_id } = body

    if (!settlement_id) {
      return NextResponse.json({ error: 'Missing settlement_id' }, { status: 400 })
    }

    // Change status in tr_order_settlement to RETURNED
    const { data, error } = await supabase
      .from('tr_order_settlement')
      .update({ settlement_status: 'RETURNED' })
      .eq('settlement_id', settlement_id)
      .select()
      .single()

    if (error) {
      throw error;
    }

    // CREATE NOTIFICATION FOR PRODUCTION (Two-Way Trigger)
    await createNotification({
      title: `Cost Document Returned: ${settlement_id}`,
      message: `Finance / Cost Accounting mengembalikan dokumen biaya produksi ${settlement_id} karena tidak valid/lengkap. Harap lengkapi dan kirim ulang.`,
      type: 'WARNING',
      priority: 'HIGH',
      recipientRole: 'PRODUCTION', // Notify Production
      sourceModule: 'FINANCE',
      sourceRefId: String(settlement_id),
      sourceRefType: 'COST_DOCUMENT_RETURN',
      actionUrl: `/production/cost-documents`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("Finance Return Cost Document Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error';
    const status = err.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
