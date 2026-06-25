import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/services/notification.service'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'PURCHASING', 'PURCHASING_MANAGER'])

    const supabase = await createRouteHandlerClient()

    // Fetch account payables with PRICE_MISMATCH status
    const { data, error } = await supabase
      .from('tr_account_payable')
      .select('*, ms_supplier(supplier_name)')
      .eq('ap_status', 'PRICE_MISMATCH')
      .order('created_at', { ascending: false })

    if (error) {
      throw error;
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Purchasing Invoice Returns GET Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error';
    const status = err.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'PURCHASING', 'PURCHASING_MANAGER'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const { ap_id, no_invoice, notes } = body

    if (!ap_id) {
      return NextResponse.json({ error: 'Missing ap_id' }, { status: 400 })
    }

    // Update status to PENDING_VERIFICATION (Resubmitted)
    const { data, error } = await supabase
      .from('tr_account_payable')
      .update({ ap_status: 'PENDING_VERIFICATION' })
      .eq('ap_id', ap_id)
      .select()
      .single()

    if (error) {
      throw error;
    }

    // Send Feedback Notification to Finance (Two-Way Action)
    await createNotification({
      title: `Invoice Resubmitted: ${no_invoice}`,
      message: `Purchasing telah merevisi dan meresubmit invoice ${no_invoice}. Catatan: ${notes || '-'}`,
      type: 'INFORMATION',
      priority: 'HIGH',
      recipientRole: 'FINANCE', 
      sourceModule: 'PURCHASING',
      sourceRefId: String(ap_id),
      sourceRefType: 'INVOICE_RESUBMISSION',
      actionUrl: `/finance/account-payable`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("Purchasing Invoice Returns POST Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error';
    const status = err.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
