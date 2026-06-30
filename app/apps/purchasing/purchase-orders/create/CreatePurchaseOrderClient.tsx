'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardText,
  CurrencyDollar,
  ShoppingCart,
  NotePencil,
  Trash,
  ChartBar,
  WarningCircle,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type PurchaseOrderItem = {
  id: string
  productId?: string
  product: string
  qty: string
  unit: string
  unitPrice: number
  subtotal: number
}

type PurchaseOrderFormData = {
  poNo: string
  poDate: string
  supplierId: string
  supplierName: string
  supplierDisplay: string
  prId: string
  prReference: string
  status: string
  budgetAmount: number | null
  budgetVariance: number | null
  budgetStatus: string
  totalValue: number
  notes: string
  negotiatedPrice: number
  referencePrice: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(
  source: Record<string, unknown>,
  keys: string[],
  fallback = ''
) {
  for (const key of keys) {
    const value = source[key]

    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value)
    }
  }

  return fallback
}

function getNumber(
  source: Record<string, unknown>,
  keys: string[],
  fallback = 0
) {
  for (const key of keys) {
    const value = source[key]

    if (value !== null && value !== undefined && value !== '') {
      const parsed = Number(value)

      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

function getNestedRecord(
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> | null {
  for (const key of keys) {
    const value = source[key]

    if (isRecord(value)) {
      return value
    }
  }

  return null
}

function getNestedArray(
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown>[] {
  for (const key of keys) {
    const value = source[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }
  }

  return []
}

function toInputDate(value: string) {
  if (!value) return new Date().toISOString().slice(0, 10)

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function formatStatusLabel(status: string) {
  if (!status) return '-'

  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function getStatusClass(status: string) {
  const normalized = status.toUpperCase()

  if (normalized === 'RELEASED' || normalized === 'APPROVED') {
    return 'bg-green-100 text-green-700'
  }

  if (normalized === 'PENDING_APPROVAL') {
    return 'bg-blue-100 text-blue-700'
  }

  if (normalized === 'REVISION_REQUIRED') {
    return 'bg-yellow-100 text-yellow-700'
  }

  if (normalized === 'DRAFT') {
    return 'bg-orange-100 text-orange-700'
  }

  if (normalized === 'COMPLETED') {
    return 'bg-emerald-100 text-emerald-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function normalizePurchaseOrder(rawData: Record<string, unknown>) {
  const supplier = getNestedRecord(rawData, [
    'supplier',
    'suppliers',
    'mt_supplier',
    'master_supplier',
  ])

  const pr = getNestedRecord(rawData, [
    'purchase_requisition',
    'tr_purchase_requisition',
    'pr',
  ])

  const detailRows = getNestedArray(rawData, [
    'details',
    'items',
    'po_details',
    'poDetail',
    'tr_po_detail',
    'tr_po_details',
    'purchase_order_details',
  ])

  const poNo = getString(rawData, ['po_id', 'poNo', 'po_no', 'id'])
  const prId =
    getString(rawData, ['pr_id', 'prNo', 'pr_no']) ||
    (pr ? getString(pr, ['pr_id', 'prNo', 'pr_no']) : '')

  const supplierId =
    getString(rawData, ['supplier_id', 'supplierId']) ||
    (supplier ? getString(supplier, ['supplier_id', 'supplierId', 'id']) : '')

  const supplierName =
    getString(rawData, ['supplier_name', 'supplierName', 'supplier']) ||
    (supplier
      ? getString(supplier, [
          'supplier_name',
          'supplierName',
          'name',
          'company_name',
        ])
      : '')

  const totalValue = getNumber(rawData, [
    'total_value',
    'totalValue',
    'total',
    'po_total',
  ])

  const fallbackProduct = getString(rawData, [
    'item',
    'product',
    'product_name',
    'productName',
    'material_name',
  ])

  const fallbackQty = getNumber(rawData, [
    'qty_order',
    'qty',
    'quantity',
    'qty_requested',
  ])

  const fallbackUnitPrice = getNumber(rawData, [
    'unit_price',
    'unitPrice',
    'final_price',
    'accepted_price',
    'proposed_price',
  ])

  const items: PurchaseOrderItem[] =
    detailRows.length > 0
      ? detailRows.map((detail, index) => {
          const product = getNestedRecord(detail, [
            'product',
            'products',
            'mt_product',
            'master_product',
          ])

          const productId =
            getString(detail, ['product_id', 'productId']) ||
            (product
              ? getString(product, ['product_id', 'productId', 'id'])
              : '')

          const productName =
            getString(detail, [
              'product_name',
              'productName',
              'product',
              'item',
              'material_name',
            ]) ||
            (product
              ? getString(product, [
                  'product_name',
                  'productName',
                  'name',
                  'material_name',
                ])
              : '') ||
            `Item ${index + 1}`

          const qty = getNumber(detail, [
            'qty_order',
            'qtyOrder',
            'quantity',
            'qty',
            'qty_requested',
          ])

          const subtotal = getNumber(detail, [
            'subtotal',
            'sub_total',
            'line_total',
            'total',
          ])

          const unitPrice =
            getNumber(detail, [
              'unit_price',
              'unitPrice',
              'final_price',
              'accepted_price',
              'proposed_price',
              'price',
            ]) || (qty > 0 && subtotal > 0 ? subtotal / qty : 0)

          const unit =
            getString(detail, ['unit', 'uom', 'satuan']) ||
            (product ? getString(product, ['unit', 'uom', 'satuan']) : '') ||
            'unit'

          return {
            id: `${productId || productName}-${index}`,
            productId,
            product: productName,
            qty: String(qty || 0),
            unit,
            unitPrice,
            subtotal: subtotal || qty * unitPrice,
          }
        })
      : [
          {
            id: 'fallback-item-1',
            product: fallbackProduct || 'No item detail available',
            qty: String(fallbackQty || 1),
            unit: getString(rawData, ['unit', 'uom', 'satuan'], 'unit'),
            unitPrice:
              fallbackUnitPrice ||
              (fallbackQty > 0 && totalValue > 0
                ? totalValue / fallbackQty
                : totalValue),
            subtotal:
              totalValue ||
              (fallbackQty || 1) *
                (fallbackUnitPrice ||
                  (fallbackQty > 0 && totalValue > 0
                    ? totalValue / fallbackQty
                    : 0)),
          },
        ]

  const productNames = items
    .map((item) => item.product)
    .filter(Boolean)
    .join(', ')

  const negotiatedPrice = items[0]?.unitPrice || 0

  const referencePrice = getNumber(rawData, [
    'reference_price',
    'referencePrice',
    'proposed_price',
    'proposedPrice',
  ])

  const formData: PurchaseOrderFormData = {
    poNo,
    poDate: toInputDate(
      getString(rawData, ['created_at', 'po_date', 'poDate', 'po_release_date'])
    ),
    supplierId,
    supplierName,
    supplierDisplay:
      supplierId && supplierName
        ? `${supplierId} — ${supplierName}`
        : supplierName || supplierId || '-',
    prId,
    prReference:
      prId && productNames ? `${prId} — ${productNames}` : prId || '-',
    status: getString(rawData, ['status'], '-'),
    budgetAmount: rawData.budgetAmount
      ? Number(rawData.budgetAmount)
      : rawData.budget_amount
        ? Number(rawData.budget_amount)
        : null,
    budgetVariance: rawData.budgetVariance
      ? Number(rawData.budgetVariance)
      : rawData.budget_variance
        ? Number(rawData.budget_variance)
        : null,
    budgetStatus: getString(rawData, ['budgetStatus', 'budget_status']),
    totalValue,
    notes: getString(rawData, ['notes', 'rejection_reason', 'description']),
    negotiatedPrice,
    referencePrice: referencePrice || negotiatedPrice,
  }

  return {
    formData,
    items,
  }
}

export function CreatePurchaseOrderClient() {
  const router = useRouter()

  const [poData, setPoData] = useState<PurchaseOrderFormData | null>(null)
  const [items, setItems] = useState<PurchaseOrderItem[]>([])
  const [notes, setNotes] = useState('')
  const [selectedPoNo, setSelectedPoNo] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadPurchaseOrder = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const searchParams = new URLSearchParams(window.location.search)

        const poNoFromUrl =
          searchParams.get('poNo') ||
          searchParams.get('po_id') ||
          searchParams.get('po')

        const negotiationNoFromUrl =
          searchParams.get('negotiationNo') ||
          searchParams.get('negotiation_no') ||
          searchParams.get('negotiationId') ||
          searchParams.get('negotiation_id') ||
          searchParams.get('quotationId') ||
          searchParams.get('quotation_id')

        setSelectedPoNo(poNoFromUrl || negotiationNoFromUrl || '')

        if (!poNoFromUrl && !negotiationNoFromUrl) {
          setErrorMessage(
            'No purchase order or negotiation reference was selected.'
          )
          return
        }

        const response = await fetch('/api/purchasing/purchase-orders')
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch purchase order data')
        }

        const rows: Record<string, unknown>[] = Array.isArray(result)
          ? result.filter(isRecord)
          : Array.isArray(result.data)
            ? result.data.filter(isRecord)
            : Array.isArray(result.purchaseOrders)
              ? result.purchaseOrders.filter(isRecord)
              : []

        const selectedPO = rows.find((row) => {
          const currentPoNo = getString(row, ['po_id', 'poNo', 'po_no', 'id'])

          const currentNegotiationNo = getString(row, [
            'quotation_id',
            'quotationId',
            'negotiation_id',
            'negotiationId',
            'negotiation_no',
            'negotiationNo',
          ])

          if (poNoFromUrl && currentPoNo === poNoFromUrl) {
            return true
          }

          if (
            negotiationNoFromUrl &&
            currentNegotiationNo === negotiationNoFromUrl
          ) {
            return true
          }

          return false
        })

        if (!selectedPO) {
          throw new Error(
            negotiationNoFromUrl
              ? `Purchase order for negotiation ${negotiationNoFromUrl} was not found. Please make sure the negotiation has been submitted and agreed.`
              : `Purchase order ${poNoFromUrl} was not found.`
          )
        }

        const normalized = normalizePurchaseOrder(selectedPO)

        setSelectedPoNo(normalized.formData.poNo)
        setPoData(normalized.formData)
        setItems(normalized.items)
        setNotes(normalized.formData.notes || '')
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to load purchase order data'
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadPurchaseOrder()
  }, [])

  const handleCloseForm = () => {
    const isConfirmed = window.confirm(
      'Are you sure you want to leave this form? Unsaved changes will be lost.'
    )

    if (isConfirmed) {
      router.push('/apps/purchasing/purchase-orders')
    }
  }

  const handleSaveDraft = () => {
    router.push('/apps/purchasing/purchase-orders')
  }

  const handleSubmitForApproval = () => {
    router.push('/apps/purchasing/purchase-orders')
  }

  const subtotal = useMemo(() => {
    const calculatedSubtotal = items.reduce((total, item) => {
      return total + Number(item.qty || 0) * item.unitPrice
    }, 0)

    if (calculatedSubtotal > 0) {
      return calculatedSubtotal
    }

    return poData?.totalValue || 0
  }, [items, poData])

  const tax = 0
  const total = subtotal + tax

  const updateQty = (id: string, qty: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              qty,
              subtotal: Number(qty || 0) * item.unitPrice,
            }
          : item
      )
    )
  }

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id))
  }

  const getPriceComparisonText = () => {
    if (!poData?.referencePrice || !poData?.negotiatedPrice) {
      return 'Reference price comparison is not available.'
    }

    if (poData.negotiatedPrice < poData.referencePrice) {
      const difference =
        ((poData.referencePrice - poData.negotiatedPrice) /
          poData.referencePrice) *
        100

      return `Below reference price by ${difference.toFixed(2)}%`
    }

    if (poData.negotiatedPrice > poData.referencePrice) {
      const difference =
        ((poData.negotiatedPrice - poData.referencePrice) /
          poData.referencePrice) *
        100

      return `Above reference price by ${difference.toFixed(2)}%`
    }

    return 'Negotiated price is equal to the reference price.'
  }

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Purchase Orders', href: '/apps/purchasing/purchase-orders' },
        { label: selectedPoNo ? 'Revise PO' : 'Create PO' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <ModuleHeader
            title={selectedPoNo ? 'Revise Purchase Order' : 'Create Purchase Order'}
            description="Review purchase order data based on approved requisition and supplier quotation."
          />

          <button
            type="button"
            onClick={handleCloseForm}
            className="text-2xl font-semibold text-slate-400 hover:text-red-600"
            title="Close form"
          >
            ×
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading purchase order data...
          </div>
        ) : poData ? (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardText size={20} className="text-red-600" />
                <h3 className="font-semibold text-slate-900">PO Information</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    PO No
                  </label>
                  <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200">
                    <input
                      type="text"
                      value={poData.poNo}
                      readOnly
                      className="w-full bg-slate-50 px-3 text-sm outline-none"
                    />
                    <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-[10px] font-bold text-slate-500">
                      AUTO
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={poData.supplierDisplay}
                    readOnly
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    PO Date
                  </label>
                  <input
                    type="date"
                    value={poData.poDate}
                    readOnly
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    Status
                  </label>
                  <div className="flex h-10 items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                        poData.status
                      )}`}
                    >
                      {formatStatusLabel(poData.status)}
                    </span>

                    {poData.budgetStatus && (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        {poData.budgetStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    PR Reference
                  </label>
                  <input
                    type="text"
                    value={poData.prReference}
                    readOnly
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    Budget Information
                  </label>
                  <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    {poData.budgetAmount
                      ? `${formatCurrency(poData.budgetAmount)}${
                          poData.budgetVariance
                            ? ` | Variance: ${formatCurrency(
                                poData.budgetVariance
                              )}`
                            : ''
                        }`
                      : 'No budget information available'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <CurrencyDollar size={20} className="text-green-700" />
                  <h3 className="font-semibold text-slate-900">
                    Negotiated Price Source
                  </h3>
                </div>

                <p className="text-sm text-slate-600">
                  Final negotiated price has been approved and used as the PO
                  basis.
                </p>

                <div className="mt-4 rounded-xl bg-white p-4">
                  <p className="text-xs text-slate-500">Approved Price</p>
                  <p className="mt-1 text-2xl font-bold text-green-700">
                    {formatCurrency(poData.negotiatedPrice)}
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    {getPriceComparisonText()}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <ChartBar size={20} className="text-purple-700" />
                  <h3 className="font-semibold text-slate-900">
                    Reference Price Source
                  </h3>
                </div>

                <p className="text-sm text-slate-600">
                  Reference price from supplier quotation or negotiation record.
                </p>

                <div className="mt-4 rounded-xl bg-white p-4">
                  <p className="text-xs text-slate-500">Reference Price</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(poData.referencePrice)}
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    Price difference is based on negotiation result.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={20} className="text-red-600" />
                  <h3 className="font-semibold text-slate-900">
                    Purchase Order Items
                  </h3>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">No</th>
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 font-semibold">Qty Order</th>
                        <th className="px-4 py-3 font-semibold">Unit</th>
                        <th className="px-4 py-3 font-semibold">Unit Price</th>
                        <th className="px-4 py-3 font-semibold">Subtotal</th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Delete
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 text-slate-600">
                            {index + 1}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {item.product}
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={item.qty}
                              onChange={(event) =>
                                updateQty(item.id, event.target.value)
                              }
                              className="h-10 w-24 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                            />
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {item.unit}
                          </td>
                          <td className="px-4 py-4 font-semibold text-green-700">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {formatCurrency(
                              Number(item.qty || 0) * item.unitPrice
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="ml-auto w-full max-w-sm space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">
                        Tax / Additional Charge
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(tax)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="font-bold text-slate-900">Total PO</span>
                      <span className="text-xl font-bold text-red-600">
                        {formatCurrency(total)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700">
                      System uses purchase order detail from database and
                      recalculates the current total from item quantity.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {poData.status.toUpperCase() === 'REVISION_REQUIRED' && (
              <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                <WarningCircle size={20} weight="bold" />
                <div>
                  <p className="font-semibold">Revision Required</p>
                  <p className="mt-1">
                    This purchase order was rejected by Manager Purchasing.
                    Review the item quantity or price before resubmitting.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <NotePencil size={20} className="text-red-600" />
                <h3 className="font-semibold text-slate-900">PO Notes</h3>
              </div>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add special notes for supplier or internal records."
                className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-300"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                className="rounded-lg border border-red-200 bg-white px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Save Draft
              </button>

              <button
                type="button"
                onClick={handleSubmitForApproval}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {poData.status.toUpperCase() === 'REVISION_REQUIRED'
                  ? 'Resubmit for Approval'
                  : 'Submit for Approval'}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No purchase order data available.
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}