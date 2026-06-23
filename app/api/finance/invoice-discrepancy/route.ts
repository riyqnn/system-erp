import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/services/notification.service'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'FINANCE', 'ACCOUNT_PAYABLE'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const { ap_id, no_invoice } = body

    if (!ap_id) {
      return NextResponse.json({ error: 'Missing ap_id' }, { status: 400 })
    }

    // Ubah status tr_account_payable menjadi PRICE_MISMATCH (sebagai Return)
    const { data, error } = await supabase
      .from('tr_account_payable')
      .update({ ap_status: 'PRICE_MISMATCH' })
      .eq('ap_id', ap_id)
      .select()
      .single()

    if (error) {
      throw error;
    }

    // CREATE NOTIFICATION FOR PURCHASING (Two-Way Trigger)
    await createNotification({
      title: `Invoice Discrepancy: ${no_invoice}`,
      message: `Finance / AP mengembalikan invoice ${no_invoice} karena terdapat ketidaksesuaian data (Discrepancy). Harap periksa dan resubmit.`,
      type: 'WARNING',
      priority: 'HIGH',
      recipientRole: 'PURCHASING', // Notify Purchasing
      sourceModule: 'FINANCE',
      sourceRefId: String(ap_id),
      sourceRefType: 'INVOICE_RETURN',
      actionUrl: `/purchasing/invoice-returns`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("Finance Invoice Discrepancy Return Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error';
    const status = err.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
