'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart,
  ClipboardText,
  CheckCircle,
  Package,
  WarningCircle,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type GoodsReceiptStatus =
  | 'DRAFT'
  | 'ACCEPTED'
  | 'PARTIAL'
  | 'REJECTED'
  | string

type GoodsReceiptItem = {
  id: string
  productCode: string
  productName: string
  category: string
  orderedQty: number
  receivedQty: number
  unit: string
  expiryDate: string | null
  batchNumber: string
  condition?: string
  rejectQty?: number
  rejectReason?: string
}

type GoodsReceipt = {
  id: string
  grNo: string
  receiptDate: string | null
  receivedBy: number | null
  status: GoodsReceiptStatus

  poNo: string
  prNo?: string
  poDate: string | null
  expectedDeliveryDate: string | null
  poStatus: string
  totalValue: number

  supplierId: string
  supplierName: string
  supplierContact: string
  supplierAddress: string

  warehouseId?: string
  warehouseName?: string

  productCode: string
  productName: string
  category: string
  orderedQty: number
  receivedQty: number
  unit: string
  expiryDate: string | null
  batchNumber: string
  condition?: string
  rejectQty?: number
  rejectReason?: string

  items: GoodsReceiptItem[]
}

type EditableItem = {
  receivedQty: string
  expiryDate: string
  batchNumber: string
  rejectQty: string
  rejectReason: string
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

function formatCurrency(value: number) {
  return `Rp ${new Intl.NumberFormat('id-ID').format(value || 0)}`
}

function formatStatus(status: string) {
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    ACCEPTED: 'Accepted',
    PARTIAL: 'Partial',
    REJECTED: 'Rejected',
    RELEASED: 'Released',
    APPROVED: 'Approved',
    COMPLETED: 'Completed',
    PENDING_RECEIPT: 'Pending Receipt',
  }

  return statusMap[status] || status
}

function getStatusClass(status: string) {
  const statusClassMap: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    ACCEPTED: 'bg-green-100 text-green-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-red-700',
    RELEASED: 'bg-teal-100 text-teal-700',
    APPROVED: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-green-100 text-green-700',
    PENDING_RECEIPT: 'bg-amber-100 text-amber-700',
  }

  return statusClassMap[status] || 'bg-slate-100 text-slate-600'
}

function createGRNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const timestamp = String(Date.now()).slice(-6)
  const random = String(Math.floor(Math.random() * 999)).padStart(3, '0')

  return `GR-${year}${month}-${timestamp}${random}`
}

function buildEditableItems(items: GoodsReceiptItem[]) {
  const nextItems: Record<string, EditableItem> = {}

  items.forEach((item) => {
    const remainingQty =
      Number(item.orderedQty || 0) - Number(item.receivedQty || 0)

    nextItems[item.id] = {
      receivedQty:
        item.receivedQty > 0
          ? String(item.receivedQty)
          : String(Math.max(remainingQty, item.orderedQty || 0)),
      expiryDate: item.expiryDate || '',
      batchNumber: item.batchNumber || '',
      rejectQty: String(item.rejectQty || 0),
      rejectReason: item.rejectReason || '',
    }
  })

  return nextItems
}

export function GoodsReceiptClient() {
  const router = useRouter()

  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([])
  const [selectedGrId, setSelectedGrId] = useState('')
  const [editableItems, setEditableItems] = useState<Record<string, EditableItem>>(
    {}
  )
  const [receiptDate, setReceiptDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchGoodsReceipts = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/goods-receipts')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || 'Failed to fetch goods receipts'
        )
      }

      const receiptData: GoodsReceipt[] = result.data || []
      setGoodsReceipts(receiptData)

      if (receiptData.length > 0) {
        const firstReceipt = receiptData[0]

        setSelectedGrId(firstReceipt.id)
        setEditableItems(buildEditableItems(firstReceipt.items || []))
        setReceiptDate(new Date().toISOString().slice(0, 10))
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to fetch goods receipts'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGoodsReceipts()
  }, [])

  const selectedReceipt = useMemo(() => {
    return goodsReceipts.find((receipt) => receipt.id === selectedGrId) || null
  }, [goodsReceipts, selectedGrId])

  const selectedItems = selectedReceipt?.items || []

  const isExistingReceipt =
    selectedReceipt?.status &&
    !['DRAFT', 'PENDING_RECEIPT'].includes(
      String(selectedReceipt.status || '').toUpperCase()
    )

  const totalOrdered = selectedItems.reduce(
    (total, item) => total + Number(item.orderedQty || 0),
    0
  )

  const totalReceived = selectedItems.reduce((total, item) => {
    const editable = editableItems[item.id]
    return total + Number(editable?.receivedQty || 0)
  }, 0)



  const predictedStatus = useMemo(() => {
    if (!selectedItems.length) return 'DRAFT'
    if (totalReceived <= 0) return 'REJECTED'
    if (totalReceived < totalOrdered) return 'PARTIAL'
    return 'ACCEPTED'
  }, [selectedItems.length, totalReceived, totalOrdered])

  const handleChangeReceipt = (id: string) => {
    const receipt = goodsReceipts.find((item) => item.id === id)

    setSelectedGrId(id)
    setEditableItems(buildEditableItems(receipt?.items || []))
    setReceiptDate(new Date().toISOString().slice(0, 10))
    setIsConfirmed(false)
    setErrorMessage('')
  }

  const updateEditableItem = (
    itemId: string,
    field: keyof EditableItem,
    value: string
  ) => {
    setEditableItems((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {
          receivedQty: '0',
          expiryDate: '',
          batchNumber: '',
          rejectQty: '0',
          rejectReason: '',
        }),
        [field]: value,
      },
    }))
  }

  const validateBeforeSave = () => {
    if (!selectedReceipt) {
      return 'Please select a purchase order first.'
    }

    if (isExistingReceipt) {
      return 'Goods Receipt for this purchase order has already been recorded.'
    }

    if (!selectedItems.length) {
      return 'No item found for this purchase order.'
    }

    if (!isConfirmed) {
      return 'Please confirm the receipt before saving.'
    }

    for (const item of selectedItems) {
      const editable = editableItems[item.id]
      const receivedQty = Number(editable?.receivedQty || 0)
      const rejectQty = Number(editable?.rejectQty || 0)

      if (Number.isNaN(receivedQty) || receivedQty < 0) {
        return `Received quantity for ${item.productName} must be a valid number.`
      }

      if (Number.isNaN(rejectQty) || rejectQty < 0) {
        return `Reject quantity for ${item.productName} must be a valid number.`
      }

      if (receivedQty > Number(item.orderedQty || 0)) {
        return `Received quantity for ${item.productName} cannot exceed ordered quantity.`
      }

      if (rejectQty > 0 && !editable?.rejectReason?.trim()) {
        return `Reject reason is required for ${item.productName}.`
      }
    }

    return ''
  }

  const handleSave = async () => {
    const validationError = validateBeforeSave()

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    if (!selectedReceipt) return

    try {
      setIsSaving(true)
      setErrorMessage('')

      const grNumber = selectedReceipt.grNo?.startsWith('DRAFT-GR-')
        ? createGRNumber()
        : selectedReceipt.grNo || createGRNumber()

      const payloadItems = selectedItems.map((item) => {
        const editable = editableItems[item.id]

        return {
          productSku: item.productCode,
          productCode: item.productCode,
          receivedQty: Number(editable?.receivedQty || 0),
          quantity: Number(editable?.receivedQty || 0),
          expiryDate: editable?.expiryDate || null,
          batchNumber: editable?.batchNumber || null,
          rejectQty: Number(editable?.rejectQty || 0),
          rejectReason: editable?.rejectReason || null,
        }
      })

      const response = await fetch('/api/purchasing/goods-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grNumber,
          poNumber: selectedReceipt.poNo,
          receiptDate: receiptDate
            ? new Date(receiptDate).toISOString()
            : new Date().toISOString(),
          items: payloadItems,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || 'Failed to save goods receipt'
        )
      }

      await fetchGoodsReceipts()
      alert(
        'Goods Receipt saved successfully. Stock has been updated and the document is ready for Three-Way Matching.'
      )
      router.push('/purchasing/three-way-matching')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save goods receipt'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/purchasing' },
        { label: 'Goods Receipt' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Goods Receipt"
          description="Receive released purchase orders, record actual quantities, and update inventory stock automatically."
        />

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart size={20} className="text-red-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Select Released Purchase Order
            </h3>
          </div>

          {isLoading ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              Loading goods receipt data...
            </div>
          ) : goodsReceipts.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No released purchase order is available for goods receipt.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.8fr]">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  PO Number & Supplier
                </label>
                <select
                  value={selectedGrId}
                  onChange={(event) => handleChangeReceipt(event.target.value)}
                  className="h-11 w-full rounded-lg border border-red-100 px-3 text-sm font-medium outline-none focus:border-red-300"
                >
                  {goodsReceipts.map((receipt) => (
                    <option key={receipt.id} value={receipt.id}>
                      {receipt.poNo} — {receipt.supplierName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Supplier
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {selectedReceipt?.supplierName || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    PO Date
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatDate(selectedReceipt?.poDate)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    PO Status
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      selectedReceipt?.poStatus || ''
                    )}`}
                  >
                    {formatStatus(selectedReceipt?.poStatus || '-')}
                  </span>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    GR Status
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      selectedReceipt?.status || 'DRAFT'
                    )}`}
                  >
                    {formatStatus(selectedReceipt?.status || 'DRAFT')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <ClipboardText size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Receipt Detail
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-500">
                Receipt Date
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(event) => setReceiptDate(event.target.value)}
                disabled={Boolean(isExistingReceipt)}
                className="h-10 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
              />
            </div>
          </div>

          {isExistingReceipt && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Goods Receipt has already been recorded for this purchase order.
              This document is ready for Three-Way Matching.
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Ordered Qty</th>
                    <th className="px-4 py-3 font-semibold">Received Qty</th>
                    <th className="px-4 py-3 font-semibold">Reject Qty</th>
                    <th className="px-4 py-3 font-semibold">Batch No.</th>
                    <th className="px-4 py-3 font-semibold">Expiry Date</th>
                    <th className="px-4 py-3 font-semibold">Reject Reason</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {selectedItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No goods receipt item found.
                      </td>
                    </tr>
                  ) : (
                    selectedItems.map((item) => {
                      const editable = editableItems[item.id]

                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-900">
                              {item.productName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.productCode} · {item.category}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-slate-700">
                            {formatNumber(item.orderedQty)} {item.unit}
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              max={item.orderedQty}
                              value={editable?.receivedQty || ''}
                              onChange={(event) =>
                                updateEditableItem(
                                  item.id,
                                  'receivedQty',
                                  event.target.value
                                )
                              }
                              disabled={Boolean(isExistingReceipt)}
                              className="h-10 w-28 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              value={editable?.rejectQty || '0'}
                              onChange={(event) =>
                                updateEditableItem(
                                  item.id,
                                  'rejectQty',
                                  event.target.value
                                )
                              }
                              disabled={Boolean(isExistingReceipt)}
                              className="h-10 w-28 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editable?.batchNumber || ''}
                              onChange={(event) =>
                                updateEditableItem(
                                  item.id,
                                  'batchNumber',
                                  event.target.value
                                )
                              }
                              disabled={Boolean(isExistingReceipt)}
                              placeholder="Batch"
                              className="h-10 w-36 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="date"
                              value={editable?.expiryDate || ''}
                              onChange={(event) =>
                                updateEditableItem(
                                  item.id,
                                  'expiryDate',
                                  event.target.value
                                )
                              }
                              disabled={Boolean(isExistingReceipt)}
                              className="h-10 w-40 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editable?.rejectReason || ''}
                              onChange={(event) =>
                                updateEditableItem(
                                  item.id,
                                  'rejectReason',
                                  event.target.value
                                )
                              }
                              disabled={Boolean(isExistingReceipt)}
                              placeholder="Required if reject qty > 0"
                              className="h-10 w-56 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
                            />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Receipt Confirmation
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto]">
              <div>
                <label className="flex items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(event) => setIsConfirmed(event.target.checked)}
                    disabled={Boolean(isExistingReceipt)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    I confirm that the received goods have been physically
                    checked by Inventory and the quantity will update stock
                    balance after saving.
                  </span>
                </label>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Total Ordered
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {formatNumber(totalOrdered)} {selectedItems[0]?.unit || ''}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Total Received
                    </p>
                    <p className="mt-1 text-lg font-bold text-red-600">
                      {formatNumber(totalReceived)} {selectedItems[0]?.unit || ''}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Predicted GR Status
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                        predictedStatus
                      )}`}
                    >
                      {formatStatus(predictedStatus)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmed(false)
                    setErrorMessage('')
                  }}
                  disabled={Boolean(isExistingReceipt)}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-6 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !selectedReceipt || Boolean(isExistingReceipt)}
                  className="h-11 rounded-lg bg-red-700 px-6 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {isSaving
                    ? 'Saving...'
                    : isExistingReceipt
                      ? 'GR Recorded'
                      : 'Save GR'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Package size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Inventory Integration
              </h3>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              After Goods Receipt is saved, the system will automatically update
              stock balance, record stock movement as inbound goods, and send
              notifications for the next verification process.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  PO Value
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatCurrency(selectedReceipt?.totalValue || 0)}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Warehouse
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {selectedReceipt?.warehouseName &&
                  selectedReceipt.warehouseName !== '-'
                    ? selectedReceipt.warehouseName
                    : 'Default warehouse from master data'}
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 p-3">
                <div className="flex gap-2">
                  <WarningCircle size={18} className="mt-0.5 text-amber-600" />
                  <p className="text-xs leading-relaxed text-amber-700">
                    Reject quantity will not be added to inventory stock. Only
                    accepted received quantity will increase stock balance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}