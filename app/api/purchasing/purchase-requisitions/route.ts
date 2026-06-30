import { NextResponse } from 'next/server'
import { createNotification as createGlobalNotification } from '@/lib/services/notification.service'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface DBUser {
  user_id: number
  username: string
  full_name: string
  email: string
  role: string
}

interface DBProduct {
  product_id: string
  product_name: string
  category: string
  uom: string
  minimum_stock: number
}

interface DBPRDetail {
  pr_detail_id: string
  pr_id: string
  product_id: string
  qty_requested: number
}

interface DBPurchaseRequisition {
  pr_id: string
  requested_by: number
  request_date: string
  status: string
  notes: string
  created_at: string
}

async function createNotification({
  title,
  message,
  recipientRole,
  sourceRefId,
  actionUrl,
  priority = 'MEDIUM',
}: {
  title: string
  message: string
  recipientRole: string
  sourceRefId: string
  actionUrl: string
  priority?: string
}) {
  try {
    await createGlobalNotification({
      title,
      message,
      type: 'INFORMATION',
      priority: (priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') || 'MEDIUM',
      recipientRole,
      sourceModule: 'PURCHASING',
      sourceRefId,
      sourceRefType: 'PR',
      actionUrl,
    })
  } catch (error) {
    console.warn('Failed to create notification:', error)
  }
}

function buildApprovedNotes({
  existingNotes,
  budgetAmount,
  budgetNote,
}: {
  existingNotes?: string | null
  budgetAmount: number
  budgetNote?: string
}) {
  const base = existingNotes ? `${existingNotes}\n\n` : ''
  const budgetStr = `[BUDGET_AMOUNT:${budgetAmount}]`
  const noteStr = budgetNote ? `\nNote: ${budgetNote}` : ''
  return `${base}Approved by Manager Purchasing\n${budgetStr}${noteStr}`
}

function buildRejectedNotes({
  existingNotes,
  rejectionReason,
}: {
  existingNotes?: string | null
  rejectionReason?: string
}) {
  const base = existingNotes ? `${existingNotes}\n\n` : ''
  const noteStr = rejectionReason ? `\nReason: ${rejectionReason}` : ''
  return `${base}Rejected by Manager Purchasing${noteStr}`
}

export async function GET(request: Request) {
  try {
    const [
      prResult,
      prDetailResult,
      productResult,
      userResult,
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
    ])

    const errors = [
      prResult.error,
      prDetailResult.error,
      productResult.error,
      userResult.error,
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

    const prs: DBPurchaseRequisition[] = prResult.data || []
    const prDetails: DBPRDetail[] = prDetailResult.data || []
    const products: DBProduct[] = productResult.data || []
    const users: DBUser[] = userResult.data || []

    const userMap = new Map<number, DBUser>(users.map((u) => [u.user_id, u]))
    const productMap = new Map<string, DBProduct>(products.map((p) => [p.product_id, p]))

    const detailsByPR = new Map<string, DBPRDetail[]>()
    prDetails.forEach((d) => {
      const prId = String(d.pr_id || '')
      if (!detailsByPR.has(prId)) detailsByPR.set(prId, [])
      detailsByPR.get(prId)!.push(d)
    })

    const data = prs.map((pr) => {
      const requestedBy = userMap.get(pr.requested_by)
      const items = detailsByPR.get(pr.pr_id) || []
      
      let budgetAmount = 0
      const notesStr = pr.notes || ''
      const budgetMatch = notesStr.match(/\[BUDGET_AMOUNT:([^\]]+)\]/i)
      if (budgetMatch && budgetMatch[1]) {
        budgetAmount = Number(budgetMatch[1].replace(/[^\d.,-]/g, ''))
      }

      return {
        id: pr.pr_id,
        prNo: pr.pr_id,
        requestDate: pr.request_date || pr.created_at,
        requestedBy: requestedBy?.full_name || requestedBy?.username || pr.requested_by || '-',
        department: requestedBy?.role || '-',
        notes: notesStr || '-',
        status: pr.status || 'PENDING',
        budgetAmount: budgetAmount || null,
        items: items.map((item) => {
          const product = productMap.get(item.product_id)
          return {
            id: item.pr_detail_id || item.product_id,
            productCode: product?.product_id || item.product_id || '-',
            productName: product?.product_name || '-',
            category: product?.category || '-',
            qty: item.qty_requested || 0,
            unit: product?.uom || '-',
            minimumStock: product?.minimum_stock || 0
          }
        })
      }
    })

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    
    const total = data.length
    const paginatedData = data.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      message: 'Purchase requisitions fetched successfully',
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
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
      action?: 'APPROVE' | 'REJECT'
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
        recipientRole: 'INVENTORY',
        sourceRefId: targetPR,
        actionUrl: `/inventory/purchase-requisition?highlight=${targetPR}`,
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
      actionUrl: `/inventory/purchase-requisition?highlight=${targetPR}`,
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