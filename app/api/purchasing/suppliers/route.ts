import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface SupplierRow {
  supplier_id: string
  supplier_name: string
  contact: string | null
  address: string | null
  lead_time: number | null
  top: string | null
  status: string | null
}

interface ProductRow {
  product_id: string
  product_name: string | null
  category: string | null
  uom: string | null
}

interface SupplierPriceRow {
  supplier_id: string
  product_id: string
  unit_price_estimate?: number | null
  estimated_price?: number | null
  price?: number | null
  unit_price?: number | null
  uom?: string | null
}

interface PriceProfile {
  supplierId: string
  productCode: string
  product: string
  category: string
  unit: string
  estimatedPrice: number
}

interface SupplierListItem {
  id: string
  supplierId: string
  supplierName: string
  contact: string
  address: string
  productCode: string
  product: string
  category: string
  unit: string
  estimatedPrice: number
  leadTime: number
  termOfPayment: string
  status: string
  priceProfiles: PriceProfile[]
}

function getString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback

  const parsed = String(value).trim()

  return parsed || fallback
}

function getNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)

  return Number.isNaN(parsed) ? fallback : parsed
}

function normalizeStatus(value: unknown) {
  const status = getString(value, 'ACTIVE').toUpperCase()

  if (status === 'INACTIVE') return 'INACTIVE'
  if (status === 'SUSPENDED') return 'SUSPENDED'

  return 'ACTIVE'
}

function normalizePaymentTerm(value: unknown) {
  const term = getString(value, 'Net 30')
  const normalized = term.replace('_', ' ').toLowerCase()

  if (normalized === 'net 14') return 'Net 14'
  if (normalized === 'net 30') return 'Net 30'
  if (normalized === 'net 45') return 'Net 45'
  if (normalized === 'cash') return 'Cash'
  if (normalized === 'cod') return 'COD'

  return term
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }

  return String(error || 'Unknown error')
}

function matchesSearch(value: string, search: string) {
  if (!search) return true

  return value.toLowerCase().includes(search.toLowerCase())
}

function getEstimatedPrice(price: SupplierPriceRow | null | undefined) {
  if (!price) return 0

  return getNumber(
    price.unit_price_estimate ??
      price.estimated_price ??
      price.price ??
      price.unit_price,
    0
  )
}

export async function GET(request: Request) {
  try {
    const [supplierPriceResult, supplierResult, productResult] =
      await Promise.all([
        supabase.from('ms_supplier_price').select('*'),

        supabase
          .from('ms_supplier')
          .select(
            'supplier_id, supplier_name, contact, address, lead_time, top, status'
          )
          .order('supplier_id', { ascending: true }),

        supabase
          .from('ms_product')
          .select('product_id, product_name, category, uom'),
      ])

    const errors = [
      supplierPriceResult.error,
      supplierResult.error,
      productResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      const firstError = errors[0]

      return NextResponse.json(
        {
          message: 'Failed to fetch suppliers',
          error: firstError?.message || 'Unknown database error',
        },
        { status: 500 }
      )
    }

    const supplierPrices = (supplierPriceResult.data || []) as SupplierPriceRow[]
    const supplierRows = (supplierResult.data || []) as SupplierRow[]
    const products = (productResult.data || []) as ProductRow[]

    const productMap = new Map<string, ProductRow>()
    products.forEach((product) => {
      productMap.set(String(product.product_id || ''), product)
    })

    const priceMap = new Map<string, SupplierPriceRow[]>()
    supplierPrices.forEach((supplierPrice) => {
      const supplierId = String(supplierPrice.supplier_id || '')
      const currentPrices = priceMap.get(supplierId) || []
      currentPrices.push(supplierPrice)
      priceMap.set(supplierId, currentPrices)
    })

    const url = new URL(request.url)

    const search = getString(
      url.searchParams.get('search') ||
        url.searchParams.get('q') ||
        url.searchParams.get('keyword')
    )

    const categoryFilter = getString(url.searchParams.get('category'))
    const statusFilter = getString(url.searchParams.get('status'))

    const page = Math.max(
      parseInt(url.searchParams.get('page') || '1', 10) || 1,
      1
    )

    const limitParam = url.searchParams.get('limit')
    const limit =
      limitParam === 'all'
        ? 1000
        : Math.max(parseInt(limitParam || '1000', 10) || 1000, 1)

    const suppliers: SupplierListItem[] = supplierRows.map((item) => {
      const prices = priceMap.get(String(item.supplier_id || '')) || []
      const supplierPrice = prices[0] || null
      const product = supplierPrice
        ? productMap.get(String(supplierPrice.product_id || ''))
        : null

      const estimatedPrice = getEstimatedPrice(supplierPrice)

      return {
        id: item.supplier_id,
        supplierId: item.supplier_id || '-',
        supplierName: item.supplier_name || '-',
        contact: item.contact || '-',
        address: item.address || '-',
        productCode: product?.product_id || supplierPrice?.product_id || '-',
        product: product?.product_name || '-',
        category: product?.category || '-',
        unit: product?.uom || supplierPrice?.uom || '-',
        estimatedPrice,
        leadTime: getNumber(item.lead_time, 0),
        termOfPayment: item.top || '-',
        status: item.status || 'Active',

        priceProfiles: prices.map((price) => {
          const priceProduct = productMap.get(String(price.product_id || ''))

          return {
            supplierId: price.supplier_id,
            productCode: priceProduct?.product_id || price.product_id || '-',
            product: priceProduct?.product_name || '-',
            category: priceProduct?.category || '-',
            unit: priceProduct?.uom || price.uom || '-',
            estimatedPrice: getEstimatedPrice(price),
          }
        }),
      }
    })

    const filteredSuppliers = suppliers.filter((supplier) => {
      const supplierText = [
        supplier.supplierId,
        supplier.supplierName,
        supplier.contact,
        supplier.address,
        supplier.product,
        supplier.category,
      ]
        .join(' ')
        .toLowerCase()

      const matchSearch = matchesSearch(supplierText, search)

      const matchCategory =
        !categoryFilter ||
        categoryFilter === 'All Categories' ||
        categoryFilter.toLowerCase() === 'all' ||
        String(supplier.category || '').toLowerCase() ===
          categoryFilter.toLowerCase()

      const matchStatus =
        !statusFilter ||
        statusFilter === 'All Status' ||
        statusFilter.toLowerCase() === 'all' ||
        String(supplier.status || '').toLowerCase() ===
          statusFilter.toLowerCase()

      return matchSearch && matchCategory && matchStatus
    })

    const total = filteredSuppliers.length
    const totalPages = Math.max(Math.ceil(total / limit), 1)
    const safePage = Math.min(page, totalPages)

    const paginatedData =
      limitParam === 'all'
        ? filteredSuppliers
        : filteredSuppliers.slice((safePage - 1) * limit, safePage * limit)

    return NextResponse.json({
      message: 'Suppliers fetched successfully',
      data: paginatedData,
      meta: {
        total,
        page: safePage,
        limit,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching suppliers',
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const supplierCode = getString(
      body.supplierCode || body.supplierId || body.supplier_id || body.id
    )

    const supplierName = getString(
      body.supplierName || body.supplier_name || body.name
    )

    const contact = getString(body.contact || body.pic || body.phone, '')
    const address = getString(body.address, '')

    const productSku = getString(
      body.productSku || body.productCode || body.product_id || body.productId
    )

    const estimatedPrice = getNumber(
      body.estimatedPrice ||
        body.unitPriceEstimate ||
        body.unit_price_estimate ||
        body.price,
      0
    )

    const leadTimeDays = getNumber(
      body.leadTimeDays || body.leadTime || body.lead_time,
      0
    )

    const paymentTerm = normalizePaymentTerm(
      body.paymentTerm || body.termOfPayment || body.top
    )

    const status = normalizeStatus(body.status)

    if (!supplierCode || !supplierName || !productSku) {
      return NextResponse.json(
        {
          message: 'Supplier code, supplier name, and product SKU are required',
        },
        { status: 400 }
      )
    }

    const { data: productData, error: productError } = await supabase
      .from('ms_product')
      .select('product_id, product_name, category, uom')
      .eq('product_id', productSku)
      .maybeSingle<ProductRow>()

    if (productError) {
      return NextResponse.json(
        {
          message: 'Failed to validate product SKU',
          error: productError.message,
        },
        { status: 500 }
      )
    }

    if (!productData) {
      return NextResponse.json(
        {
          message: 'Product SKU not found',
          error: `Product ${productSku} does not exist`,
        },
        { status: 404 }
      )
    }

    const { error: supplierError } = await supabase.from('ms_supplier').upsert(
      {
        supplier_id: supplierCode,
        supplier_name: supplierName,
        contact: contact || null,
        address: address || null,
        lead_time: leadTimeDays,
        top: paymentTerm,
        status,
      },
      {
        onConflict: 'supplier_id',
      }
    )

    if (supplierError) {
      return NextResponse.json(
        {
          message: 'Failed to save supplier',
          error: supplierError.message,
        },
        { status: 500 }
      )
    }

    const { data: existingPrice, error: existingPriceError } = await supabase
      .from('ms_supplier_price')
      .select('*')
      .eq('supplier_id', supplierCode)
      .eq('product_id', productData.product_id)
      .maybeSingle<SupplierPriceRow>()

    if (existingPriceError) {
      return NextResponse.json(
        {
          message: 'Failed to check existing supplier price profile',
          error: existingPriceError.message,
        },
        { status: 500 }
      )
    }

    let supplierPriceData: SupplierPriceRow | null = null

    if (existingPrice) {
      const { data, error } = await supabase
        .from('ms_supplier_price')
        .update({
          unit_price_estimate: estimatedPrice,
          uom: productData.uom || null,
        })
        .eq('supplier_id', supplierCode)
        .eq('product_id', productData.product_id)
        .select()
        .single<SupplierPriceRow>()

      if (error) {
        return NextResponse.json(
          {
            message: 'Failed to update supplier price profile',
            error: error.message,
          },
          { status: 500 }
        )
      }

      supplierPriceData = data
    } else {
      const { data, error } = await supabase
        .from('ms_supplier_price')
        .insert({
          supplier_id: supplierCode,
          product_id: productData.product_id,
          unit_price_estimate: estimatedPrice,
          uom: productData.uom || null,
        })
        .select()
        .single<SupplierPriceRow>()

      if (error) {
        return NextResponse.json(
          {
            message: 'Failed to save supplier price profile',
            error: error.message,
          },
          { status: 500 }
        )
      }

      supplierPriceData = data
    }

    return NextResponse.json({
      message: 'Supplier saved successfully',
      data: {
        id: supplierCode,
        supplierId: supplierCode,
        supplierName,
        contact: contact || '-',
        address: address || '-',
        productCode: productData.product_id,
        product: productData.product_name || '-',
        category: productData.category || '-',
        unit: productData.uom || '-',
        estimatedPrice,
        leadTime: leadTimeDays,
        termOfPayment: paymentTerm,
        status,
        supplierPrice: supplierPriceData,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving supplier',
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)

    let supplierId = getString(
      url.searchParams.get('supplierId') ||
        url.searchParams.get('supplier_id') ||
        url.searchParams.get('id')
    )

    if (!supplierId) {
      const body = await request.json().catch(() => null)

      supplierId = getString(body?.supplierId || body?.supplier_id || body?.id)
    }

    if (!supplierId) {
      return NextResponse.json(
        {
          message: 'Supplier ID is required',
        },
        { status: 400 }
      )
    }

    const { error: supplierPriceError } = await supabase
      .from('ms_supplier_price')
      .delete()
      .eq('supplier_id', supplierId)

    if (supplierPriceError) {
      return NextResponse.json(
        {
          message: 'Failed to delete supplier price profile',
          error: supplierPriceError.message,
        },
        { status: 500 }
      )
    }

    const { error: supplierError } = await supabase
      .from('ms_supplier')
      .delete()
      .eq('supplier_id', supplierId)

    if (supplierError) {
      return NextResponse.json(
        {
          message: 'Failed to delete supplier',
          error: supplierError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Supplier deleted successfully',
      data: {
        supplierId,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while deleting supplier',
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}