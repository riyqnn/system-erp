import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/services/notification.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json()
    const supabase = await createRouteHandlerClient()

    let mappedStatus = body.status;
    if (typeof body.status === 'string') {
      mappedStatus = body.status.toUpperCase().replace(' ', '_');
    }

    const { data, error } = await supabase
      .from('tr_production_request')
      .update({ status: mappedStatus })
      .eq('production_request_id', id)
      .select()
      .single()

    if (error) throw error

    if (mappedStatus === 'IN_PROGRESS') {
      await createNotification({
        title: `Production Request Verified: ${id}`,
        message: `Inventory has verified BOM and approved Production Request ${id}. Materials are ready for production.`,
        type: 'INFORMATION',
        priority: 'HIGH',
        recipientRole: 'PRODUCTION',
        sourceModule: 'INVENTORY',
        sourceRefId: id,
        sourceRefType: 'PRODUCTION_REQUEST',
        actionUrl: `/production/orders`,
        createdBy: user.user_id,
      }).catch(err => console.error('Failed to send notification', err));
    }

    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
