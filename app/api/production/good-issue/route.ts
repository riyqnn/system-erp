import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('production_goods_issue')
    .select(`
      *,
      production_orders(po_number),
      products(name)
    `)
    .order('issue_date', { ascending: false })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()

  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('production_goods_issue')
    .insert([body])
    .select()

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}