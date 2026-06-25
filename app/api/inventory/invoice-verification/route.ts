import { NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/services/notification.service'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'FINANCE', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase
      .from('tr_goods_receipt')
      .select(`
        *,
        ms_product (product_id, product_name, uom),
        ms_supplier (supplier_name)
      `)
      .eq('status', 'ACCEPTED')
      .order('receipt_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()
    const body = await request.json()
    const { receipt_id, po_id, supplier_id, invoice_amount } = body

    if (!receipt_id || !supplier_id || !invoice_amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate AP ID
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '')
    const { count } = await supabase
      .from('tr_account_payable')
      .select('*', { count: 'exact', head: true })
      
    const ap_id = `AP-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`

    const { data, error } = await supabase
      .from('tr_account_payable')
      .insert({
        ap_id,
        po_id: po_id || null,
        supplier_id,
        inv_supp_no: `INV-${receipt_id}`,
        invoice_date: new Date().toISOString().slice(0, 10),
        ap_amount: Number(invoice_amount),
        ap_status: 'DRAFT'
      })
      .select()
      .single()

    if (error) throw error

    // Notify Finance
    await createNotification({
      title: `Invoice Verified: ${receipt_id}`,
      message: `Inventory has verified invoice for GR ${receipt_id}. AP Draft ${ap_id} has been created for amount Rp ${Number(invoice_amount).toLocaleString()}.`,
      type: 'INFORMATION',
      priority: 'MEDIUM',
      recipientRole: 'FINANCE',
      sourceModule: 'INVENTORY',
      sourceRefId: ap_id,
      sourceRefType: 'ACCOUNT_PAYABLE',
      actionUrl: `/finance/account-payable`,
      createdBy: user.user_id,
    }).catch(err => console.error('Failed to send notification', err));

    // Update GR status to 'INVOICED' or similar if needed? 
    // We can just leave it as ACCEPTED but add it to a tracker, or not update GR for now.
    
    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
