import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

function normalizeStatus(value?: string | null) {
  const status = String(value || '').toUpperCase()

  if (['PENDING', 'DRAFT', 'REQUESTED'].includes(status)) {
    return 'PENDING_PO_CREATION'
  }

  if (['APPROVED', 'PROCESSED', 'PO_CREATED'].includes(status)) {
    return 'PROCESSED'
  }

  if (status === 'CLOSED') {
    return 'CLOSED'
  }

  if (status === 'CANCELLED' || status === 'REJECTED') {
    return 'CANCELLED'
  }

  return status || 'PENDING_PO_CREATION'
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

          // Fields used by the newer PR page normalizer
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
        department: requester?.role || 'Inventory',

        status: normalizeStatus(pr.status),
        priority: 'Normal',
        purpose: pr.notes || 'Purchase requisition submitted from Inventory module.',
        notes: pr.notes || '-',
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