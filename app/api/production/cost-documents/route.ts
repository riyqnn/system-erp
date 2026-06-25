import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/services/notification.service'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'PRODUCTION', 'PRODUCTION_MANAGER'])

    const supabase = await createRouteHandlerClient()

    // Fetch order settlement with RETURNED status
    const { data, error } = await supabase
      .from('tr_order_settlement')
      .select('*')
      .eq('settlement_status', 'RETURNED')
      .order('settlement_date', { ascending: false })

    if (error) {
      throw error;
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Production Cost Documents GET Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error';
    const status = err.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'PRODUCTION', 'PRODUCTION_MANAGER'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const { settlement_id, notes, material_cost, labor_cost, other_cost } = body

    if (!settlement_id) {
      return NextResponse.json({ error: 'Missing settlement_id' }, { status: 400 })
    }

    const actual_cost = Number(material_cost || 0) + Number(labor_cost || 0) + Number(other_cost || 0);

    // Update status to RECEIVED
    const { data, error } = await supabase
      .from('tr_order_settlement')
      .update({ 
        settlement_status: 'RECEIVED',
        material_cost: material_cost,
        labor_cost: labor_cost,
        other_cost: other_cost,
        actual_cost: actual_cost
      })
      .eq('settlement_id', settlement_id)
      .select()
      .single()

    if (error) {
      throw error;
    }

    // Send Feedback Notification to Finance (Two-Way Action)
    await createNotification({
      title: `Cost Document Resubmitted: ${settlement_id}`,
      message: `Production telah merevisi dan meresubmit dokumen biaya produksi ${settlement_id}. Catatan: ${notes || '-'}`,
      type: 'INFORMATION',
      priority: 'HIGH',
      recipientRole: 'FINANCE', 
      sourceModule: 'PRODUCTION',
      sourceRefId: String(settlement_id),
      sourceRefType: 'COST_DOCUMENT_RESUBMISSION',
      actionUrl: `/finance/cost-accounting`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("Production Cost Documents POST Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error';
    const status = err.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
