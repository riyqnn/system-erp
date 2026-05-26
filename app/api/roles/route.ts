import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient()

    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, name, description')
      .order('name')

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      )
    }

    return NextResponse.json({ roles })
  } catch (error) {
    console.error('[Roles Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
