import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

type PRAction = 'APPROVE' | 'REJECT'

function normalizeStatus(value?: string | null) {
  const status = String(value || '').toUpperCase()

  if (status === 'PENDING') return 'PENDING_REVIEW'
  if (status === 'PROCESSED') return 'PROCESSED'
  if (status === 'CLOSED') return 'CLOSED'

  return status || 'PENDING_REVIEW'
}

function getStatusLabel(value?: string | null) {
  const status = normalizeStatus(value)

  const labelMap: Record<string, string> = {
    PENDING_REVIEW: 'Pending Manager Review',
    PROCESSED: 'Approved for Purchasing',
    CLOSED: 'Closed',
  }

  return labelMap[status] || status
}

function parseBudgetFromNotes(notes?: string | null) {
  const value = String(notes || '')

  const budgetMatch = value.match(/\[BUDGET_AMOUNT:(\d+)\]/)
  const budgetNoteMatch = value.match(/\[BUDGET_NOTE:([\s\S]*?)\]/)
  const managerDecisionMatch = value.match(/\[MANAGER_DECISION:([\s\S]*?)\]/)
  const rejectionReasonMatch = value.match(/\[REJECTION_REASON:([\s\S]*?)\]/)

  return {
    budgetAmount: budgetMatch ? Number(budgetMatch[1] || 0) : 0,
    budgetNote: budgetNoteMatch ? budgetNoteMatch[1].trim() : '',
    managerDecision: managerDecisionMatch
      ? managerDecisionMatch[1].trim()
      : '',
    rejectionReason: rejectionReasonMatch
      ? rejectionReasonMatch[1].trim()
      : '',
  }
}

function stripSystemNotes(notes?: string | null) {
  return String(notes || '')
    .replace(/\[BUDGET_AMOUNT:\d+\]/g, '')
    .replace(/\[BUDGET_NOTE:[\s\S]*?\]/g, '')
    .replace(/\[MANAGER_DECISION:[\s\S]*?\]/g, '')
    .replace(/\[REJECTION_REASON:[\s\S]*?\]/g, '')
    .trim()
}

function buildApprovedNotes({
  existingNotes,
  budgetAmount,
  budgetNote,
}: {
  existingNotes?: string | null
  budgetAmount: number
  budgetNote?: string | null
}) {
  const cleanNotes = stripSystemNotes(existingNotes)
  const noteParts = []

  if (cleanNotes) noteParts.push(cleanNotes)

  noteParts.push(`[BUDGET_AMOUNT:${Math.round(Number(budgetAmount || 0))}]`)

  if (budgetNote?.trim()) {
    noteParts.push(`[BUDGET_NOTE:${budgetNote.trim()}]`)
  }

  noteParts.push(`[MANAGER_DECISION:APPROVED]`)

  return noteParts.join('\n')
}

function buildRejectedNotes({
  existingNotes,
  rejectionReason,
}: {
  existingNotes?: string | null
  rejectionReason?: string | null
}) {
  const cleanNotes = stripSystemNotes(existingNotes)
  const noteParts = []

  if (cleanNotes) noteParts.push(cleanNotes)

  noteParts.push(`[MANAGER_DECISION:REJECTED]`)

  if (rejectionReason?.trim()) {
    noteParts.push(`[REJECTION_REASON:${rejectionReason.trim()}]`)
  }

  return noteParts.join('\n')
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
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}) {
  const { error } = await supabase.from('notifications').insert({
    title,
    message,
    type: 'INFORMATION',
    priority,
    status: 'UNREAD',
    recipient_role: recipientRole,
    source_module: 'PURCHASING',
    source_ref_id: sourceRefId,
    source_ref_type: 'PR',
    action_url: actionUrl,
  })

  if (error) {
    console.warn('Failed to create notification:', error.message)
  }
}

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

    const purchaseRequisitions = prResult.data || []
    const prDetails = prDetailResult.data || []
    const products = productResult.data || []
    const users = userResult.data || []
    const supplierPrices = supplierPriceResult.data || []

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

    const userMap = new Map(users.map((user: any) => [user.user_id, user]))

    const priceByProduct = new Map<string, number>()

    supplierPrices.forEach((price: any) => {
      const productId = String(price.product_id || '')
      const unitPrice = Number(price.unit_price_estimate || 0)

      if (!priceByProduct.has(productId)) {
        priceByProduct.set(productId, unitPrice)
      }
    })

    const detailsByPR = new Map<string, any[]>()

    prDetails.forEach((detail: any) => {
      const prId = String(detail.pr_id || '')
      const currentDetails = detailsByPR.get(prId) || []

      currentDetails.push(detail)
      detailsByPR.set(prId, currentDetails)
    })

    const data = purchaseRequisitions.map((pr: any) => {
      const items = detailsByPR.get(pr.pr_id) || []
      const requester = userMap.get(pr.requested_by)
      const budgetInfo = parseBudgetFromNotes(pr.notes)
      const cleanPurpose = stripSystemNotes(pr.notes)

      const mappedItems = items.map((item: any) => {
        const product = productMap.get(item.product_id)
        const qty = Number(item.qty_requested || 0)
        const estimatedPrice = Number(priceByProduct.get(item.product_id) || 0)
        const subtotal = qty * estimatedPrice

        return {
          id: String(item.pr_detail_id),
          productCode: product?.product_id || item.product_id || '-',
          productName: product?.product_name || '-',
          category: product?.category || '-',
          currentStock: 0,
          minimumStock: Number(product?.minimum_stock || 0),
          shortageQty: qty,
          requestQty: qty,
          qty,
          unit: product?.uom || '-',
          estimatedPrice,
          subtotal,
        }
      })

      const firstItem = mappedItems[0]

      const totalRequestQty = mappedItems.reduce(
        (total: number, item: any) => total + Number(item.requestQty || 0),
        0
      )

      const totalEstimatedValue = mappedItems.reduce(
        (total: number, item: any) => total + Number(item.subtotal || 0),
        0
      )

      return {
        id: pr.pr_id,
        prNo: pr.pr_id,
        requestDate: pr.request_date || pr.created_at,
        requiredDate: null,

        requestedBy: requester?.full_name || requester?.username || '-',
        requesterName: requester?.full_name || requester?.username || '-',
        requestedById: pr.requested_by || null,
        department: requester?.role || 'Inventory',

        rawStatus: pr.status || 'PENDING',
        status: normalizeStatus(pr.status),
        statusLabel: getStatusLabel(pr.status),
        priority: 'Normal',

        purpose:
          cleanPurpose || 'Purchase requisition submitted from Inventory module.',
        notes: pr.notes || '-',

        budgetAmount: budgetInfo.budgetAmount,
        budgetNote: budgetInfo.budgetNote,
        managerDecision: budgetInfo.managerDecision,
        rejectionReason: budgetInfo.rejectionReason,
        isBudgetProvided: budgetInfo.budgetAmount > 0,

        totalEstimatedValue,

        productCode: firstItem?.productCode || '-',
        productName: firstItem?.productName || '-',
        category: firstItem?.category || '-',
        currentStock: firstItem?.currentStock || 0,
        minimumStock: firstItem?.minimumStock || 0,
        shortageQty: firstItem?.shortageQty || 0,
        requestQty: totalRequestQty,
        unit: firstItem?.unit || '-',

        items: mappedItems,
      }
    })

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