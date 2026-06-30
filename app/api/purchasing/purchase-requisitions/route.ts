import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const [
      prResult,
      prDetailResult,
      productResult,
      userResult,
      supplierPriceResult,
    ] = await Promise.all([
      supabase
        .from('tr_purchase_requisition')
        .select('pr_id, requested_by, request_date, status, notes, created_at')
        .order('request_date', { ascending: false }),

      supabase
        .from('tr_pr_detail')
        .select('pr_detail_id, pr_id, product_id, qty_requested'),

      supabase
        .from('ms_product')
        .select('product_id, product_name, category, uom, minimum_stock'),

      supabase
        .from('ms_user')
        .select('user_id, username, full_name, email, role'),

      supabase
        .from('ms_supplier_price')
        .select('supplier_price_id, product_id, unit_price_estimate, uom'),
    ])

    const errors = [
      prResult.error,
      prDetailResult.error,
      productResult.error,
      userResult.error,
      supplierPriceResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase requisitions',
          error: errors[0]?.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Purchase requisitions fetched successfully',
      data,
      meta: {
        total: data.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching purchase requisitions',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    const {
      prNo,
      prId,
      action,
      budgetAmount,
      budgetNote,
      rejectionReason,
    }: {
      prNo?: string
      prId?: string
      action?: PRAction
      budgetAmount?: number | string
      budgetNote?: string
      rejectionReason?: string
    } = body

    const targetPR = prId || prNo

    if (!targetPR) {
      return NextResponse.json(
        {
          message: 'PR number is required',
        },
        { status: 400 }
      )
    }

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        {
          message: 'Action must be APPROVE or REJECT',
        },
        { status: 400 }
      )
    }

    const { data: prData, error: fetchError } = await supabase
      .from('tr_purchase_requisition')
      .select('*')
      .eq('pr_id', targetPR)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase requisition',
          error: fetchError.message,
        },
        { status: 500 }
      )
    }

    if (!prData) {
      return NextResponse.json(
        {
          message: 'Purchase requisition not found',
          error: `PR ${targetPR} does not exist`,
        },
        { status: 404 }
      )
    }

    const currentStatus = String(prData.status || '').toUpperCase()

    if (currentStatus !== 'PENDING') {
      return NextResponse.json(
        {
          message: 'Only pending purchase requisitions can be reviewed by manager',
          error: `Current PR status is ${prData.status}`,
        },
        { status: 400 }
      )
    }

    if (action === 'APPROVE') {
      const numericBudget = Number(budgetAmount || 0)

      if (!numericBudget || Number.isNaN(numericBudget) || numericBudget <= 0) {
        return NextResponse.json(
          {
            message: 'Budget amount is required when approving PR',
          },
          { status: 400 }
        )
      }

      const updatedNotes = buildApprovedNotes({
        existingNotes: prData.notes,
        budgetAmount: numericBudget,
        budgetNote,
      })

      const { data, error } = await supabase
        .from('tr_purchase_requisition')
        .update({
          status: 'PROCESSED',
          notes: updatedNotes,
        })
        .eq('pr_id', targetPR)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          {
            message: 'Failed to approve purchase requisition',
            error: error.message,
          },
          { status: 500 }
        )
      }

      await createNotification({
        title: 'Purchase Requisition Approved',
        message: `PR ${targetPR} has been approved with budget Rp ${new Intl.NumberFormat(
          'id-ID'
        ).format(numericBudget)} and is ready for RFQ/Sourcing.`,
        recipientRole: 'PURCHASING',
        sourceRefId: targetPR,
        actionUrl: `/apps/purchasing/purchase-requisition`,
        priority: 'HIGH',
      })

      return NextResponse.json({
        message: 'Purchase requisition approved successfully',
        data,
      })
    }

    const updatedNotes = buildRejectedNotes({
      existingNotes: prData.notes,
      rejectionReason,
    })

    const { data, error } = await supabase
      .from('tr_purchase_requisition')
      .update({
        status: 'CLOSED',
        notes: updatedNotes,
      })
      .eq('pr_id', targetPR)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to reject purchase requisition',
          error: error.message,
        },
        { status: 500 }
      )
    }

    await createNotification({
      title: 'Purchase Requisition Rejected',
      message: `PR ${targetPR} has been rejected by Manager Purchasing.`,
      recipientRole: 'INVENTORY',
      sourceRefId: targetPR,
      actionUrl: `/apps/purchasing/purchase-requisition`,
      priority: 'HIGH',
    })

    return NextResponse.json({
      message: 'Purchase requisition rejected successfully',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while reviewing purchase requisition',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}