import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

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

    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
