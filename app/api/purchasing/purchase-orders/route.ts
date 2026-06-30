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

interface DBSupplier {
  supplier_id: string
  supplier_name: string
  contact: string
  address: string
  lead_time?: string
  top?: string
  status: string
}

interface DBProduct {
  product_id: string
  product_name: string
  category: string
  uom: string
}

interface DBPurchaseRequisition {
  pr_id: string
  requested_by: string
  request_date: string
  status: string
  notes: string
  created_at: string
}

interface DBPurchaseOrder {
  po_id: string
  pr_id: string | null
  supplier_id: string | null
  quotation_id: string | null
  approved_by: string | null
  total_value: number
  status: string
  rejection_reason: string | null
  created_at: string
  po_release_date: string | null
}

interface DBPoDetail {
  po_detail_id: string
  po_id: string
  product_id: string
  qty_order: number
  unit_price: number
  subtotal: number
}

function normalizeStatus(value?: string | null) {
  const status = String(value || '').toUpperCase()

  if (status === 'DRAFT') return 'DRAFT'

  if (['PENDING', 'PENDING_APPROVAL', 'WAITING_APPROVAL'].includes(status)) {
    return 'PENDING_APPROVAL'
  }

  if (status === 'APPROVED') return 'APPROVED'

  if (['RELEASED', 'ISSUED', 'SENT'].includes(status)) {
    return 'RELEASED'
  }

  if (['REVISION_REQUIRED', 'REJECTED', 'CANCELLED'].includes(status)) {
    return 'REVISION_REQUIRED'
  }

  if (status === 'COMPLETED') return 'COMPLETED'

  return status || 'DRAFT'
}

function denormalizeStatus(value?: string | null) {
  const status = normalizeStatus(value)

  if (status === 'PENDING_APPROVAL') return 'PENDING_APPROVAL'
  if (status === 'RELEASED') return 'RELEASED'
  if (status === 'APPROVED') return 'APPROVED'
  if (status === 'REVISION_REQUIRED') return 'REVISION_REQUIRED'
  if (status === 'COMPLETED') return 'COMPLETED'

  return 'DRAFT'
}

function parseBudgetAmount(notes?: string | null) {
  const text = String(notes || '')
  const match = text.match(/\[BUDGET_AMOUNT:([^\]]+)\]/i)

  if (!match?.[1]) return null

  const rawValue = match[1].trim().replace(/[^\d.,-]/g, '')

  if (!rawValue) return null

  let normalizedValue = rawValue

  if (rawValue.includes('.') && rawValue.includes(',')) {
    const lastDotIndex = rawValue.lastIndexOf('.')
    const lastCommaIndex = rawValue.lastIndexOf(',')

    normalizedValue =
      lastCommaIndex > lastDotIndex
        ? rawValue.replace(/\./g, '').replace(',', '.')
        : rawValue.replace(/,/g, '')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(rawValue)) {
    normalizedValue = rawValue.replace(/\./g, '')
  } else if (/^\d{1,3}(,\d{3})+$/.test(rawValue)) {
    normalizedValue = rawValue.replace(/,/g, '')
  } else if (rawValue.includes(',')) {
    normalizedValue = rawValue.replace(',', '.')
  }

  const budgetAmount = Number(normalizedValue)

  return Number.isFinite(budgetAmount) ? budgetAmount : null
}

function getBudgetInfo(totalValue: number, notes?: string | null) {
  const budgetAmount = parseBudgetAmount(notes)
  const budgetVariance = budgetAmount === null ? null : totalValue - budgetAmount
  const isOverBudget = budgetAmount === null ? false : totalValue > budgetAmount

  return {
    budgetAmount,
    budgetVariance,
    isOverBudget,
    budgetStatus:
      budgetAmount === null
        ? 'NO_BUDGET'
        : isOverBudget
          ? 'OVER_BUDGET'
          : 'WITHIN_BUDGET',
  }
}

function normalizePatchAction(value?: string | null) {
  const action = String(value || '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()

  if (['APPROVE', 'APPROVE_OVER_BUDGET', 'OVER_BUDGET_APPROVE'].includes(action)) {
    return 'APPROVE_OVER_BUDGET'
  }

  if (['REJECT', 'REJECT_OVER_BUDGET', 'OVER_BUDGET_REJECT'].includes(action)) {
    return 'REJECT_OVER_BUDGET'
  }

  return action || null
}

async function createNotification({
  title,
  message,
  referenceId,
  recipientRole,
}: {
  title: string
  message: string
  referenceId: string
  recipientRole: string
}) {
  try {
    await createGlobalNotification({
      title,
      message,
      type: 'INFORMATION',
      priority: 'HIGH',
      recipientRole,
      sourceModule: 'PURCHASING',
      sourceRefId: referenceId,
      sourceRefType: 'PO',
      actionUrl: `/purchasing/purchase-orders?highlight=${referenceId}`,
    })
    return true
  } catch (error) {
    console.warn('Failed to create notification:', error)
    return false
  }
}

export async function GET(request: Request) {
  try {
    const [
      poResult,
      poDetailResult,
      prResult,
      quotationResult,
      supplierResult,
      productResult,
      userResult,
    ] = await Promise.all([
      supabase
        .from('tr_purchase_order')
        .select(
          'po_id, pr_id, supplier_id, quotation_id, approved_by, total_value, status, rejection_reason, created_at, po_release_date'
        )
        .order('created_at', { ascending: false }),

      supabase
        .from('tr_po_detail')
        .select('po_detail_id, po_id, product_id, qty_order, unit_price, subtotal'),

      supabase
        .from('tr_purchase_requisition')
        .select('pr_id, requested_by, request_date, status, notes, created_at'),

      supabase
        .from('tr_price_quotation')
        .select(
          'quotation_id, supplier_id, product_id, proposed_price, accepted_price, final_price, qty_requested, status, quotation_date, expiry_date, notes'
        ),

      supabase
        .from('ms_supplier')
        .select('supplier_id, supplier_name, contact, address, lead_time, top, status'),

      supabase
        .from('ms_product')
        .select('product_id, product_name, category, uom'),

      supabase
        .from('ms_user')
        .select('user_id, username, full_name, email, role'),
    ])

    const errors = [
      poResult.error,
      poDetailResult.error,
      prResult.error,
      quotationResult.error,
      supplierResult.error,
      productResult.error,
      userResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase orders',
          error: errors[0] instanceof Error ? errors[0].message : String(errors[0]),
        },
        { status: 500 }
      )
    }

    const suppliers: DBSupplier[] = supplierResult.data || []
    const products: DBProduct[] = productResult.data || []
    const prs: DBPurchaseRequisition[] = prResult.data || []

    const supplierMap = new Map<string, DBSupplier>(
      suppliers.map((s) => [s.supplier_id, s])
    )
    const productMap = new Map<string, DBProduct>(
      products.map((p) => [p.product_id, p])
    )
    const prMap = new Map<string, DBPurchaseRequisition>(
      prs.map((p) => [p.pr_id, p])
    )

    const detailsByPO = new Map<string, DBPoDetail[]>()
    ;(poDetailResult.data || []).forEach((d: DBPoDetail) => {
      const poId = String(d.po_id || '')
      if (!detailsByPO.has(poId)) detailsByPO.set(poId, [])
      detailsByPO.get(poId)!.push(d)
    })

    const purchaseOrders = ((poResult.data || []) as DBPurchaseOrder[]).map((item) => {
      const poId = String(item.po_id || '')
      const supplier = supplierMap.get(item.supplier_id || '')
      const pr = prMap.get(item.pr_id || '')
      const poItems = detailsByPO.get(item.po_id) || []
      const poSubtotal = poItems.reduce(
        (total: number, pi: DBPoDetail) => total + Number(pi.subtotal || 0),
        0
      )

      const totalValue = Number(item.total_value || poSubtotal || 0)
      const taxAmount = Math.max(totalValue - poSubtotal, 0)
      const status = normalizeStatus(item.status)

      return {
        id: poId,
        poNo: poId,
        poDate: item.created_at || null,
        expectedDeliveryDate: null,

        supplierId: supplier?.supplier_id || item.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        supplierContact: supplier?.contact || '-',
        supplierAddress: supplier?.address || '-',

        prNo: pr?.pr_id || '-',
        prDate: pr?.request_date || pr?.created_at || null,
        requester: pr?.requested_by || '-',
        notes: item.rejection_reason || pr?.notes || '-',
        totalValue: totalValue,
        taxAmount: taxAmount,
        subtotal: poSubtotal,
        status,

        items: poItems.map((poItem: DBPoDetail) => {
          const prod = productMap.get(poItem.product_id)
          return {
            id: poItem.po_detail_id || poItem.product_id,
            productId: poItem.product_id,
            productName: prod?.product_name || '-',
            category: prod?.category || '-',
            qty: poItem.qty_order || 0,
            unit: prod?.uom || '-',
            unitPrice: poItem.unit_price || 0,
            subtotal: poItem.subtotal || 0,
          }
        }),
      }
    })

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    
    const total = purchaseOrders.length
    const paginatedData = purchaseOrders.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      message: 'Purchase orders fetched successfully',
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
        message: 'Unexpected error while fetching purchase orders',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      poNumber,
      prNumber,
      quotationNumber,
      supplierCode,
      poDate,
      status,
      items,
    } = body

    if (!poNumber || !supplierCode || !items?.length) {
      return NextResponse.json(
        {
          message: 'PO number, supplier code, and items are required',
        },
        { status: 400 }
      )
    }

    const { data: existingPO } = await supabase
      .from('tr_purchase_order')
      .select('po_id')
      .eq('po_id', poNumber)
      .maybeSingle()

    if (existingPO) {
      return NextResponse.json(
        {
          message: 'PO number already exists',
        },
        { status: 409 }
      )
    }

    const { data: supplierData, error: supplierError } = await supabase
      .from('ms_supplier')
      .select('supplier_id')
      .eq('supplier_id', supplierCode)
      .maybeSingle()

    if (supplierError || !supplierData) {
      return NextResponse.json(
        {
          message: 'Supplier not found',
          error:
            supplierError?.message || `Supplier ${supplierCode} does not exist`,
        },
        { status: 404 }
      )
    }

    let prId = null

    if (prNumber) {
      const { data: prData } = await supabase
        .from('tr_purchase_requisition')
        .select('pr_id')
        .eq('pr_id', prNumber)
        .maybeSingle()

      prId = prData?.pr_id || null
    }

    let quotationId = quotationNumber || null

    if (!quotationId) {
      const firstItem = items[0]

      const { data: quotationData } = await supabase
        .from('tr_price_quotation')
        .select('quotation_id')
        .eq('supplier_id', supplierCode)
        .eq('product_id', firstItem.productSku || firstItem.productCode)
        .order('quotation_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      quotationId = quotationData?.quotation_id || null
    }

    const subtotal = items.reduce(
      (total: number, item: Record<string, unknown>) =>
        total + Number(item.qty || 0) * Number(item.unitPrice || 0),
      0
    )

    const taxAmount = subtotal * 0.11
    const totalValue = subtotal + taxAmount
    const normalizedStatus = normalizeStatus(status || 'DRAFT')

    const { data: poData, error: poError } = await supabase
      .from('tr_purchase_order')
      .insert({
        po_id: poNumber,
        pr_id: prId,
        supplier_id: supplierCode,
        quotation_id: quotationId,
        approved_by: null,
        total_value: totalValue,
        status: denormalizeStatus(normalizedStatus),
        rejection_reason: null,
        created_at: poDate || new Date().toISOString(),
        po_release_date:
          normalizedStatus === 'RELEASED' ||
          normalizedStatus === 'APPROVED' ||
          normalizedStatus === 'COMPLETED'
            ? new Date().toISOString()
            : null,
      })
      .select('po_id')
      .single()

    if (poError || !poData) {
      return NextResponse.json(
        {
          message: 'Failed to save purchase order',
          error: poError?.message,
        },
        { status: 500 }
      )
    }

    const poItemsPayload = []

    for (const item of items) {
      const productCode = item.productSku || item.productCode

      const { data: productData, error: productError } = await supabase
        .from('ms_product')
        .select('product_id, uom')
        .eq('product_id', productCode)
        .maybeSingle()

      if (productError || !productData) {
        return NextResponse.json(
          {
            message: `Product SKU ${productCode} not found`,
            error:
              productError?.message || `Product ${productCode} does not exist`,
          },
          { status: 404 }
        )
      }

      const qty = Number(item.qty || 0)
      const unitPrice = Number(item.unitPrice || 0)

      poItemsPayload.push({
        po_id: poData.po_id,
        product_id: productData.product_id,
        qty_order: qty,
        unit_price: unitPrice,
        subtotal: qty * unitPrice,
      })
    }

    const { error: poItemsError } = await supabase
      .from('tr_po_detail')
      .insert(poItemsPayload)

    if (poItemsError) {
      return NextResponse.json(
        {
          message: 'Purchase order saved, but failed to save PO items',
          error: poItemsError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Purchase order saved successfully',
      data: {
        id: poData.po_id,
        poNumber,
        subtotal,
        taxAmount,
        totalValue,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving purchase order',
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
      poNo,
      poId,
      id,
      status,
      action,
      approvalAction,
      managerAction,
      approvedBy,
      managerId,
      approvalNotes,
      rejectionReason,
      notes,
    } = body

    const targetPO = poId || poNo || id

    if (!targetPO) {
      return NextResponse.json(
        {
          message: 'PO number is required',
        },
        { status: 400 }
      )
    }

    const { data: poData, error: poError } = await supabase
      .from('tr_purchase_order')
      .select(
        'po_id, pr_id, supplier_id, quotation_id, approved_by, total_value, status, rejection_reason, created_at, po_release_date'
      )
      .eq('po_id', targetPO)
      .maybeSingle()

    if (poError || !poData) {
      return NextResponse.json(
        {
          message: 'Purchase order not found',
          error: poError?.message || `PO ${targetPO} does not exist`,
        },
        { status: 404 }
      )
    }

    let patchAction = normalizePatchAction(action || approvalAction || managerAction)
    const requestedStatus = status

    if (!patchAction && requestedStatus === 'REVISION_REQUIRED') {
      patchAction = 'REJECT_OVER_BUDGET'
    }

    if (!patchAction && !requestedStatus) {
      return NextResponse.json(
        {
          message: 'Action or status is required',
        },
        { status: 400 }
      )
    }

    const totalValue = Number(poData.total_value || 0)
    let prNotes = ''
    if (poData.pr_id) {
       const { data: prData } = await supabase.from('tr_purchase_requisition').select('notes').eq('pr_id', poData.pr_id).maybeSingle()
       if (prData) prNotes = prData.notes || ''
    }
    const budgetInfo = getBudgetInfo(totalValue, prNotes)

    const now = new Date().toISOString()
    const managerUserId = approvedBy || managerId || null

    let updatePayload: Record<string, unknown> = {}
    let responseMessage = 'Purchase order status updated successfully'
    let shouldNotifyPurchasing = false

    if (patchAction === 'APPROVE_OVER_BUDGET') {
      updatePayload = {
        status: 'RELEASED',
        po_release_date: now,
        rejection_reason:
          approvalNotes ||
          notes ||
          `Over-budget approval completed. PO total is ${totalValue}. Approved budget is ${
            budgetInfo.budgetAmount ?? 'not available'
          }.`,
      }

      if (managerUserId) {
        updatePayload.approved_by = managerUserId
      }

      responseMessage = 'Over-budget purchase order approved successfully'
    } else if (patchAction === 'REJECT_OVER_BUDGET') {
      updatePayload = {
        status: 'REVISION_REQUIRED',
        po_release_date: null,
        rejection_reason:
          rejectionReason ||
          notes ||
          `Over-budget purchase order rejected. PO total is ${totalValue}. Approved budget is ${
            budgetInfo.budgetAmount ?? 'not available'
          }. Please renegotiate or create a revised quotation.`,
      }

      if (managerUserId) {
        updatePayload.approved_by = managerUserId
      }

      responseMessage = 'Over-budget purchase order rejected successfully'
      shouldNotifyPurchasing = true
    } else {
      const nextStatus = denormalizeStatus(requestedStatus)

      updatePayload = {
        status: nextStatus,
      }

      if (nextStatus === 'RELEASED') {
        updatePayload.po_release_date = now
      }

      if (rejectionReason || notes) {
        updatePayload.rejection_reason = rejectionReason || notes
      }
    }

    const { data, error } = await supabase
      .from('tr_purchase_order')
      .update(updatePayload)
      .eq('po_id', targetPO)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to update purchase order status',
          error: error.message,
        },
        { status: 500 }
      )
    }

    if (shouldNotifyPurchasing) {
      await createNotification({
        title: 'PO Revision Required',
        message: `PO ${targetPO} was rejected due to over-budget value. Please renegotiate or run RFQ again.`,
        referenceId: String(targetPO),
        recipientRole: 'PURCHASING',
      })
    }

    return NextResponse.json({
      message: responseMessage,
      data: {
        ...data,
        budgetAmount: budgetInfo.budgetAmount,
        budgetVariance: budgetInfo.budgetVariance,
        isOverBudget: budgetInfo.isOverBudget,
        budgetStatus: budgetInfo.budgetStatus,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while updating purchase order status',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}