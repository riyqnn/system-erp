import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

type QuotationDBStatus = 'PROPOSED' | 'SENT' | 'AGREED' | 'REJECTED' | 'CANCELLED'

function normalizeQuotationStatus(value?: string | null): QuotationDBStatus {
  const status = String(value || '').toUpperCase()

  if (['AGREED', 'ACCEPTED', 'APPROVED'].includes(status)) return 'AGREED'
  if (['REJECTED', 'DECLINED'].includes(status)) return 'REJECTED'
  if (['CANCELLED', 'CANCELED'].includes(status)) return 'CANCELLED'
  if (
    ['SENT', 'NEGOTIATION', 'COUNTERED', 'RESPONDED', 'SUBMITTED'].includes(
      status
    )
  ) {
    return 'SENT'
  }

  return 'PROPOSED'
}

function getDisplayStatus(value?: string | null) {
  const status = normalizeQuotationStatus(value)

  if (status === 'PROPOSED') return 'PROPOSED'
  if (status === 'SENT') return 'NEGOTIATION'
  if (status === 'AGREED') return 'AGREED'
  if (status === 'REJECTED') return 'REJECTED'
  if (status === 'CANCELLED') return 'CANCELLED'

  return status
}

function generateNegotiationNo(quotationId: string) {
  if (!quotationId) return '-'

  return String(quotationId).startsWith('NEG-')
    ? quotationId
    : `NEG-${quotationId}`
}

function generateRFQNo(quotationId: string) {
  if (!quotationId) return '-'

  return String(quotationId).startsWith('RFQ-')
    ? quotationId
    : `RFQ-${quotationId}`
}

function getReferencePrice(priceData: any, quotation: any) {
  return Number(
    priceData?.unit_price_estimate ||
      priceData?.estimated_price ||
      priceData?.price ||
      priceData?.unit_price ||
      priceData?.supplier_price ||
      quotation?.proposed_price ||
      0
  )
}

function getQuotationIdCandidates(negotiationNumber: string) {
  const value = String(negotiationNumber || '').trim()

  if (!value) return []

  const withoutNegPrefix = value.replace(/^NEG-/, '')

  return Array.from(new Set([value, withoutNegPrefix, `NEG-${withoutNegPrefix}`]))
}

function generatePONumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const timestamp = String(Date.now()).slice(-6)
  const random = String(Math.floor(Math.random() * 999)).padStart(3, '0')

  return `PO-${year}${month}-${timestamp}${random}`
}

function parseBudgetFromPRNotes(notes?: string | null) {
  const value = String(notes || '')
  const budgetMatch = value.match(/\[BUDGET_AMOUNT:(\d+)\]/)

  return budgetMatch ? Number(budgetMatch[1] || 0) : 0
}

function parsePRIdFromQuotationNotes(notes?: string | null) {
  const value = String(notes || '')

  const tokenMatch =
    value.match(/\[PR_NO:([^\]]+)\]/) ||
    value.match(/\[PR_ID:([^\]]+)\]/) ||
    value.match(/\[PR_NUMBER:([^\]]+)\]/)

  if (tokenMatch?.[1]) return tokenMatch[1].trim()

  const loosePRMatch = value.match(/\bPR[-_/A-Z0-9]*\d[A-Z0-9\-_/]*/i)

  return loosePRMatch ? loosePRMatch[0].trim() : null
}

function appendSystemNote(existingNotes?: string | null, systemNote?: string | null) {
  const cleanExisting = String(existingNotes || '').trim()

  if (!systemNote) return cleanExisting || null
  if (!cleanExisting) return systemNote
  if (cleanExisting.includes(systemNote)) return cleanExisting

  return `${cleanExisting}\n${systemNote}`
}

async function createNotification({
  title,
  message,
  recipientRole,
  sourceRefId,
  sourceRefType,
  actionUrl,
  priority = 'MEDIUM',
}: {
  title: string
  message: string
  recipientRole: string
  sourceRefId: string
  sourceRefType: string
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
    source_ref_type: sourceRefType,
    action_url: actionUrl,
  })

  if (error) {
    console.warn('Failed to create notification:', error.message)
  }
}

async function getPRBudget(prId: string | null) {
  if (!prId) {
    return {
      prId: null,
      budgetAmount: 0,
      prFound: false,
    }
  }

  const { data, error } = await supabase
    .from('tr_purchase_requisition')
    .select('pr_id, notes, status')
    .eq('pr_id', prId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch PR budget: ${error.message}`)
  }

  if (!data) {
    return {
      prId,
      budgetAmount: 0,
      prFound: false,
    }
  }

  return {
    prId: data.pr_id,
    budgetAmount: parseBudgetFromPRNotes(data.notes),
    prFound: true,
  }
}

async function createPurchaseOrderFromNegotiation(quotationId: string, quotation: any) {
  const supplierId = quotation.supplier_id
  const productId = quotation.product_id
  const qty = Number(quotation.qty_requested || 0)
  const unitPrice = Number(
    quotation.final_price ||
      quotation.accepted_price ||
      quotation.proposed_price ||
      0
  )

  if (!supplierId || !productId || qty <= 0 || unitPrice <= 0) {
    throw new Error(
      'Cannot generate PO because supplier, product, quantity, or final price is incomplete.'
    )
  }

  const subtotal = qty * unitPrice
  const taxAmount = subtotal * 0.11
  const totalValue = subtotal + taxAmount

  const prIdFromNotes = parsePRIdFromQuotationNotes(quotation.notes)
  const prBudget = await getPRBudget(prIdFromNotes)

  let poStatus: 'RELEASED' | 'PENDING_APPROVAL' = 'RELEASED'
  let poReleaseDate: string | null = new Date().toISOString()
  let rejectionReason: string | null = null

  if (prBudget.budgetAmount > 0 && totalValue > prBudget.budgetAmount) {
    poStatus = 'PENDING_APPROVAL'
    poReleaseDate = null
    rejectionReason = `Over-budget approval required. Approved budget: ${Math.round(
      prBudget.budgetAmount
    )}. PO total: ${Math.round(totalValue)}.`
  }

  if (!prBudget.prFound || prBudget.budgetAmount <= 0) {
    rejectionReason =
      'Budget reference was not detected from the linked PR. PO was released using standard negotiation approval.'
  }

  const { data: existingPO, error: existingPOError } = await supabase
    .from('tr_purchase_order')
    .select('po_id, status')
    .eq('quotation_id', quotationId)
    .maybeSingle()

  if (existingPOError) {
    throw new Error(existingPOError.message)
  }

  if (existingPO) {
    const { data: updatedPO, error: updatePOError } = await supabase
      .from('tr_purchase_order')
      .update({
        pr_id: prBudget.prId,
        supplier_id: supplierId,
        total_value: Math.round(totalValue),
        status: poStatus,
        rejection_reason: rejectionReason,
        po_release_date: poReleaseDate,
      })
      .eq('po_id', existingPO.po_id)
      .select('po_id, status')
      .single()

    if (updatePOError || !updatedPO) {
      throw new Error(updatePOError?.message || 'Failed to update purchase order.')
    }

    const { error: deleteDetailError } = await supabase
      .from('tr_po_detail')
      .delete()
      .eq('po_id', existingPO.po_id)

    if (deleteDetailError) {
      throw new Error(deleteDetailError.message)
    }

    const { error: insertDetailError } = await supabase
      .from('tr_po_detail')
      .insert({
        po_id: existingPO.po_id,
        product_id: productId,
        qty_order: qty,
        unit_price: Math.round(unitPrice),
        subtotal: Math.round(subtotal),
      })

    if (insertDetailError) {
      throw new Error(insertDetailError.message)
    }

    if (poStatus === 'PENDING_APPROVAL') {
      await createNotification({
        title: 'Revised Over-Budget Purchase Order Approval Required',
        message: `PO ${updatedPO.po_id} has been revised but still exceeds the approved PR budget and requires Manager Purchasing approval.`,
        recipientRole: 'MANAGER_PURCHASING',
        sourceRefId: updatedPO.po_id,
        sourceRefType: 'PO',
        actionUrl: '/apps/purchasing/purchase-orders',
        priority: 'HIGH',
      })
    } else {
      await createNotification({
        title: 'Revised Purchase Order Released',
        message: `PO ${updatedPO.po_id} has been revised and released to supplier.`,
        recipientRole: 'INVENTORY',
        sourceRefId: updatedPO.po_id,
        sourceRefType: 'PO',
        actionUrl: '/apps/purchasing/goods-receipt',
        priority: 'HIGH',
      })
    }

    return {
      poCreated: false,
      poUpdated: true,
      poId: updatedPO.po_id,
      poStatus: updatedPO.status,
      prId: prBudget.prId,
      budgetAmount: prBudget.budgetAmount,
      totalValue: Math.round(totalValue),
      isOverBudget: poStatus === 'PENDING_APPROVAL',
      message:
        poStatus === 'PENDING_APPROVAL'
          ? 'Purchase Order revised and waiting for over-budget approval.'
          : 'Purchase Order revised and released successfully.',
    }
  }

  const poNumber = generatePONumber()

  const { data: poData, error: poError } = await supabase
    .from('tr_purchase_order')
    .insert({
      po_id: poNumber,
      pr_id: prBudget.prId,
      supplier_id: supplierId,
      quotation_id: quotationId,
      approved_by: null,
      total_value: Math.round(totalValue),
      status: poStatus,
      rejection_reason: rejectionReason,
      created_at: new Date().toISOString(),
      po_release_date: poReleaseDate,
    })
    .select('po_id, status')
    .single()

  if (poError || !poData) {
    throw new Error(poError?.message || 'Failed to create purchase order.')
  }

  const { error: poDetailError } = await supabase.from('tr_po_detail').insert({
    po_id: poData.po_id,
    product_id: productId,
    qty_order: qty,
    unit_price: Math.round(unitPrice),
    subtotal: Math.round(subtotal),
  })

  if (poDetailError) {
    throw new Error(poDetailError.message)
  }

  if (poStatus === 'PENDING_APPROVAL') {
    await createNotification({
      title: 'Over-Budget Purchase Order Approval Required',
      message: `PO ${poData.po_id} exceeds the approved PR budget and requires Manager Purchasing approval.`,
      recipientRole: 'MANAGER_PURCHASING',
      sourceRefId: poData.po_id,
      sourceRefType: 'PO',
      actionUrl: '/apps/purchasing/purchase-orders',
      priority: 'HIGH',
    })
  } else {
    await createNotification({
      title: 'Purchase Order Released',
      message: `PO ${poData.po_id} has been released to supplier and is ready for goods receipt monitoring.`,
      recipientRole: 'INVENTORY',
      sourceRefId: poData.po_id,
      sourceRefType: 'PO',
      actionUrl: '/apps/purchasing/goods-receipt',
      priority: 'HIGH',
    })
  }

  return {
    poCreated: true,
    poUpdated: false,
    poId: poData.po_id,
    poStatus: poData.status,
    prId: prBudget.prId,
    budgetAmount: prBudget.budgetAmount,
    totalValue: Math.round(totalValue),
    isOverBudget: poStatus === 'PENDING_APPROVAL',
    message:
      poStatus === 'PENDING_APPROVAL'
        ? 'Purchase Order generated and waiting for over-budget approval.'
        : 'Purchase Order generated and released successfully.',
  }
}

export async function GET() {
  try {
    const [quotationResult, supplierResult, productResult, supplierPriceResult] =
      await Promise.all([
        supabase
          .from('tr_price_quotation')
          .select(
            'quotation_id, supplier_id, product_id, proposed_price, accepted_price, final_price, qty_requested, status, quotation_date, expiry_date, notes'
          )
          .order('quotation_date', { ascending: false }),

        supabase
          .from('ms_supplier')
          .select('supplier_id, supplier_name, contact, address, lead_time, top, status'),

        supabase
          .from('ms_product')
          .select('product_id, product_name, category, uom'),

        supabase.from('ms_supplier_price').select('*'),
      ])

    const errors = [
      quotationResult.error,
      supplierResult.error,
      productResult.error,
      supplierPriceResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch price negotiations',
          error: errors[0]?.message,
        },
        { status: 500 }
      )
    }

    const quotations = quotationResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []
    const supplierPrices = supplierPriceResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

    const supplierPriceMap = new Map<string, any>()

    supplierPrices.forEach((price: any) => {
      supplierPriceMap.set(`${price.supplier_id}-${price.product_id}`, price)
    })

    const negotiations = quotations.map((item: any) => {
      const supplier = supplierMap.get(item.supplier_id)
      const product = productMap.get(item.product_id)
      const supplierPrice = supplierPriceMap.get(
        `${item.supplier_id}-${item.product_id}`
      )

      const referencePrice = getReferencePrice(supplierPrice, item)
      const proposedPrice = Number(item.proposed_price || 0)
      const supplierResponsePrice = Number(item.accepted_price || 0)
      const finalPrice = Number(item.final_price || 0)

      return {
        id: String(item.quotation_id),
        negotiationNo: generateNegotiationNo(String(item.quotation_id)),

        rfqNo: generateRFQNo(String(item.quotation_id)),
        rfqStatus: getDisplayStatus(item.status),
        quotationDeadline: item.expiry_date || null,
        specificationNotes: item.notes || '-',

        supplierId: supplier?.supplier_id || item.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        supplierContact: supplier?.contact || '-',
        supplierAddress: supplier?.address || '-',

        productCode: product?.product_id || item.product_id || '-',
        productName: product?.product_name || '-',
        category: product?.category || '-',

        referencePrice,
        proposedPrice,
        supplierResponsePrice,
        finalPrice,
        qty: Number(item.qty_requested || 0),
        unit: product?.uom || '-',
        confirmationDeadline: item.expiry_date || null,

        status: getDisplayStatus(item.status),
        dbStatus: normalizeQuotationStatus(item.status),
        notes: item.notes || '-',
        createdAt: item.quotation_date || null,
      }
    })

    return NextResponse.json({
      message: 'Price negotiations fetched successfully',
      data: negotiations,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching price negotiations',
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
      negotiationNumber,
      prNo,
      prNumber,
      prId,
      supplierCode,
      productSku,
      referencePrice,
      proposedPrice,
      supplierResponsePrice,
      finalPrice,
      qty,
      confirmationDeadline,
      status,
      notes,
    } = body

    if (!supplierCode || !productSku) {
      return NextResponse.json(
        {
          message: 'Supplier code and product SKU are required.',
        },
        { status: 400 }
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
          message: 'Supplier not found.',
          error:
            supplierError?.message || `Supplier ${supplierCode} does not exist.`,
        },
        { status: 404 }
      )
    }

    const { data: productData, error: productError } = await supabase
      .from('ms_product')
      .select('product_id')
      .eq('product_id', productSku)
      .maybeSingle()

    if (productError || !productData) {
      return NextResponse.json(
        {
          message: 'Product SKU not found.',
          error:
            productError?.message || `Product ${productSku} does not exist.`,
        },
        { status: 404 }
      )
    }

    const quotationId =
      negotiationNumber ||
      `NEG-${new Date().getFullYear()}${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}-${String(Date.now()).slice(-5)}`

    const linkedPR = prId || prNo || prNumber || null

    const systemPRNote = linkedPR ? `[PR_NO:${linkedPR}]` : null
    const finalNotes = appendSystemNote(notes || null, systemPRNote)

    const { data: quotationData, error: quotationError } = await supabase
      .from('tr_price_quotation')
      .insert({
        quotation_id: quotationId,
        supplier_id: supplierData.supplier_id,
        product_id: productData.product_id,
        proposed_price: Number(proposedPrice || referencePrice || 0),
        accepted_price:
          supplierResponsePrice === undefined || supplierResponsePrice === ''
            ? null
            : Number(supplierResponsePrice),
        final_price:
          finalPrice === undefined || finalPrice === ''
            ? null
            : Number(finalPrice),
        qty_requested: Number(qty || 0),
        status: status ? normalizeQuotationStatus(status) : 'SENT',
        quotation_date: new Date().toISOString(),
        expiry_date: confirmationDeadline || null,
        notes: finalNotes,
      })
      .select()
      .single()

    if (quotationError) {
      return NextResponse.json(
        {
          message: 'Failed to save price negotiation.',
          error: quotationError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Price negotiation saved successfully.',
      data: quotationData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving price negotiation.',
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
      negotiationNumber,
      prNo,
      prNumber,
      prId,
      supplierResponsePrice,
      finalPrice,
      qty,
      confirmationDeadline,
      status,
      notes,
    } = body

    if (!negotiationNumber) {
      return NextResponse.json(
        {
          message: 'Negotiation number is required.',
        },
        { status: 400 }
      )
    }

    const quotationIdCandidates = getQuotationIdCandidates(negotiationNumber)

    const { data: existingQuotation, error: existingQuotationError } = await supabase
      .from('tr_price_quotation')
      .select(
        'quotation_id, supplier_id, product_id, proposed_price, accepted_price, final_price, qty_requested, status, quotation_date, expiry_date, notes'
      )
      .in('quotation_id', quotationIdCandidates)
      .limit(1)
      .maybeSingle()

    if (existingQuotationError) {
      return NextResponse.json(
        {
          message: 'Failed to find price negotiation.',
          error: existingQuotationError.message,
        },
        { status: 500 }
      )
    }

    if (!existingQuotation) {
      return NextResponse.json(
        {
          message: 'Price negotiation not found.',
          error: `No quotation found for ${negotiationNumber}.`,
        },
        { status: 404 }
      )
    }

    const quotationId = String(existingQuotation.quotation_id)
    const updatePayload: Record<string, any> = {}

    if (supplierResponsePrice !== undefined) {
      updatePayload.accepted_price =
        supplierResponsePrice === '' ? null : Number(supplierResponsePrice)
    }

    if (finalPrice !== undefined) {
      updatePayload.final_price = finalPrice === '' ? null : Number(finalPrice)
    }

    if (qty !== undefined) {
      updatePayload.qty_requested = Number(qty || 0)
    }

    if (confirmationDeadline !== undefined) {
      updatePayload.expiry_date = confirmationDeadline || null
    }

    if (status) {
      updatePayload.status = normalizeQuotationStatus(status)
    }

    if (notes !== undefined || prNo || prNumber || prId) {
      const linkedPR = prId || prNo || prNumber || null
      const systemPRNote = linkedPR ? `[PR_NO:${linkedPR}]` : null

      updatePayload.notes = appendSystemNote(
        notes !== undefined ? notes : existingQuotation.notes,
        systemPRNote
      )
    }

    const { data, error } = await supabase
      .from('tr_price_quotation')
      .update(updatePayload)
      .eq('quotation_id', quotationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to update price negotiation.',
          error: error.message,
        },
        { status: 500 }
      )
    }

    let generatedPO: any = null
    const normalizedStatus = normalizeQuotationStatus(data?.status)

    if (normalizedStatus === 'AGREED') {
      try {
        generatedPO = await createPurchaseOrderFromNegotiation(quotationId, data)
      } catch (poError) {
        return NextResponse.json(
          {
            message:
              'Price negotiation updated, but failed to generate purchase order.',
            data,
            error:
              poError instanceof Error
                ? poError.message
                : 'Unknown purchase order error.',
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message:
        generatedPO?.poCreated
          ? generatedPO.isOverBudget
            ? 'Price negotiation agreed and purchase order generated for over-budget approval.'
            : 'Price negotiation agreed and purchase order released successfully.'
          : generatedPO?.poUpdated
            ? generatedPO.isOverBudget
              ? 'Price negotiation revised and purchase order resubmitted for over-budget approval.'
              : 'Price negotiation revised and purchase order released successfully.'
            : 'Price negotiation updated successfully.',
      data,
      generatedPO,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while updating price negotiation.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}