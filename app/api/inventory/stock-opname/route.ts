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
      .from('inventory_valuation')
      .select('*')
      .eq('status', 'SENT') // Finance sent it as SENT
      .order('created_at', { ascending: false })

    if (error) {
      throw error; // No more mocking!
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Inventory Stock Opname GET Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error';
    const status = err.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const { valuation_id, actual_qty } = body

    if (!valuation_id || actual_qty === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update the request
    const { data, error } = await supabase
      .from('inventory_valuation')
      .update({
        status: 'VALIDATED', // from valuation_status_enum
        quantity: Number(actual_qty)
      })
      .eq('valuation_id', valuation_id)
      .select()
      .single()

    if (error) throw error; // No more mocking!

    // Send Feedback Notification to Finance (Two-Way Action)
    await createNotification({
      title: `Stock Opname Completed: VAL-${valuation_id}`,
      message: `Inventory has completed the physical audit. Actual Qty: ${actual_qty}.`,
      type: 'INFORMATION',
      priority: 'HIGH',
      recipientRole: 'FINANCE', 
      sourceModule: 'INVENTORY',
      sourceRefId: String(valuation_id),
      sourceRefType: 'STOCK_OPNAME_RESULT',
      actionUrl: `/finance/cost-accounting`, // where finance views it
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("Inventory Stock Opname POST Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error';
    const status = err.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
