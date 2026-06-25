import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/services/notification.service'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'FINANCE', 'FINANCE_MANAGER'])

    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    const { product_id, reason, system_qty } = body

    if (!product_id) {
      return NextResponse.json({ error: 'Missing product_id' }, { status: 400 })
    }

    // Insert to DB using the actual table inventory_valuation
    const payload = {
      product_id: product_id,
      period: new Date().toISOString().slice(0, 7), // Format YYYY-MM
      method: 'FIFO',
      quantity: Number(system_qty || 0),
      unit_cost: Number(system_qty || 0), // Store system qty in unit_cost to prevent overwrite loss
      total_value: 0,
      status: 'SENT', // from valuation_status_enum
      created_by: user.user_id
    }

    const { data, error } = await supabase
      .from('inventory_valuation')
      .insert([payload])
      .select()
      .single()

    if (error) {
      throw error; // No more mocking!
    }

    // CREATE NOTIFICATION FOR INVENTORY (Two-Way Trigger)
    await createNotification({
      title: `Stock Opname Request: VAL-${data.valuation_id}`,
      message: `Finance requested a physical audit for product ${product_id}. Reason: ${reason || 'Discrepancy'}`,
      type: 'WARNING',
      priority: 'HIGH',
      recipientRole: 'INVENTORY', // Notify Inventory
      sourceModule: 'FINANCE',
      sourceRefId: String(data.valuation_id),
      sourceRefType: 'STOCK_OPNAME_REQUEST',
      actionUrl: `/inventory/stock-opname`,
      createdBy: user.user_id,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Finance Stock Opname Request Error:", error)
    const err = error as { message?: string, details?: string, statusCode?: number }
    const msg = err.message || err.details || 'Internal server error';
    const status = err.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
