import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface PODetail {
  po_detail_id: string
  po_id: string
  product_id: string
  qty_order: number
  unit_price: number
  subtotal: number
}

interface SupplierRow {
  supplier_id: string
  supplier_name: string
  contact: string
  address: string
}

interface ProductRow {
  product_id: string
  product_name: string
  category: string
  uom: string
}

interface PurchaseOrderRow {
  po_id: string
  pr_id: string | null
  supplier_id: string | null
  total_value: number
  status: string
  rejection_reason: string | null
  created_at: string
  po_release_date: string | null
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatCurrency(value: number) {
  return `Rp ${new Intl.NumberFormat('id-ID').format(value || 0)}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

function getStatusStyle(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
    PENDING_APPROVAL: 'bg-orange-50 text-orange-700 border-orange-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    RELEASED: 'bg-blue-50 text-blue-700 border-blue-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REVISION_REQUIRED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  }
  return map[status] || 'bg-slate-100 text-slate-600 border-slate-200'
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED: 'Approved',
    RELEASED: 'Released',
    COMPLETED: 'Completed',
    REVISION_REQUIRED: 'Revision Required',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  }
  return map[status] || status
}

function normalizeStatus(value?: string | null) {
  const status = String(value || '').toUpperCase()
  if (status === 'DRAFT') return 'DRAFT'
  if (['PENDING', 'PENDING_APPROVAL', 'WAITING_APPROVAL'].includes(status)) return 'PENDING_APPROVAL'
  if (status === 'APPROVED') return 'APPROVED'
  if (['RELEASED', 'ISSUED', 'SENT'].includes(status)) return 'RELEASED'
  if (['COMPLETED', 'DONE'].includes(status)) return 'COMPLETED'
  if (status === 'REVISION_REQUIRED') return 'REVISION_REQUIRED'
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'REJECTED'
  return status
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ poId: string }>
}) {
  const { poId } = await params

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="max-w-3xl mx-auto mt-10 px-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Database configuration error. Please check environment variables.
        </div>
      </div>
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Fetch PO + details + supplier + products in parallel
  const [poResult, detailResult, supplierResult, productResult] = await Promise.all([
    supabase.from('tr_purchase_order').select('*').eq('po_id', poId).maybeSingle(),
    supabase.from('tr_po_detail').select('*').eq('po_id', poId),
    supabase.from('ms_supplier').select('supplier_id, supplier_name, contact, address'),
    supabase.from('ms_product').select('product_id, product_name, category, uom'),
  ])

  if (poResult.error || !poResult.data) {
    return notFound()
  }

  const po = poResult.data as PurchaseOrderRow
  const poDetails: PODetail[] = detailResult.data || []
  const suppliers: SupplierRow[] = supplierResult.data || []
  const products: ProductRow[] = productResult.data || []

  const supplier = suppliers.find((s) => s.supplier_id === po.supplier_id)
  const productMap = new Map<string, ProductRow>(products.map((p) => [p.product_id, p]))

  const status = normalizeStatus(po.status)
  const poSubtotal = poDetails.reduce((total, d) => total + Number(d.subtotal || 0), 0)
  const totalValue = Number(po.total_value || poSubtotal || 0)
  const taxAmount = Math.max(totalValue - poSubtotal, 0)

  const items = poDetails.map((detail) => {
    const product = productMap.get(detail.product_id)
    return {
      id: detail.po_detail_id,
      productId: detail.product_id,
      productName: product?.product_name || '-',
      category: product?.category || '-',
      qty: detail.qty_order || 0,
      unit: product?.uom || '-',
      unitPrice: detail.unit_price || 0,
      subtotal: detail.subtotal || 0,
    }
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500">
            Inventory Module • Purchase Order Reference
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Purchase Order Detail
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View purchase order information linked from notification.
          </p>
        </div>
        <Link
          href="/inventory/dashboard"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          ← Back to Inventory
        </Link>
      </div>

      {/* PO Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">{poId}</h2>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}
              >
                {formatStatus(status)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase text-slate-400">Total Value</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          {/* PO Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Purchase Order Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">PO Number</span>
                <span className="font-semibold text-slate-900">{poId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">PO Date</span>
                <span className="font-semibold text-slate-900">{formatDate(po.created_at)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Release Date</span>
                <span className="font-semibold text-slate-900">{formatDate(po.po_release_date)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">PR Reference</span>
                <span className="font-semibold text-slate-900">{po.pr_id || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-900">{formatCurrency(poSubtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Tax / Other</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(taxAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Supplier Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Supplier Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Supplier ID</span>
                <span className="font-semibold text-slate-900">{supplier?.supplier_id || po.supplier_id || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Supplier Name</span>
                <span className="font-semibold text-slate-900">{supplier?.supplier_name || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Contact</span>
                <span className="font-semibold text-slate-900">{supplier?.contact || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Address</span>
                <span className="font-semibold text-slate-900 text-right max-w-[200px]">
                  {supplier?.address || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rejection Reason */}
        {po.rejection_reason && (
          <div className="mx-6 mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-semibold">Rejection Reason:</span> {po.rejection_reason}
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Order Items</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {items.length} item{items.length !== 1 ? 's' : ''} in this purchase order
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Product</th>
                <th className="px-6 py-3 font-semibold">Category</th>
                <th className="px-6 py-3 font-semibold text-right">Qty</th>
                <th className="px-6 py-3 font-semibold">Unit</th>
                <th className="px-6 py-3 font-semibold text-right">Unit Price</th>
                <th className="px-6 py-3 font-semibold text-right">Subtotal</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No items found for this purchase order.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.productId}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.category}</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 tabular-nums">
                      {formatNumber(item.qty)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.unit}</td>
                    <td className="px-6 py-4 text-right text-slate-700 tabular-nums">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {items.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={5} className="px-6 py-3 text-right text-sm font-semibold text-slate-700">
                    Grand Total
                  </td>
                  <td className="px-6 py-3 text-right text-base font-bold text-slate-900 tabular-nums">
                    {formatCurrency(totalValue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Quick Actions — semua link tetap di scope /inventory agar RBAC tidak block */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/inventory/goods-receipt"
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          Go to Goods Receipt
        </Link>
        <Link
          href="/inventory/purchase-requisition"
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Purchase Requisition
        </Link>
        <Link
          href="/inventory/dashboard"
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Inventory Dashboard
        </Link>
      </div>
    </div>
  )
}
