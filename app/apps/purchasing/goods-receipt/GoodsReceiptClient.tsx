'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart,
  ClipboardText,
  CheckCircle,
  Package,
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
  condition: string
}

type GoodsReceipt = {
  id: string
  grNo: string
  receiptDate: string | null
  receivedBy: string
  status: GoodsReceiptStatus
  notes: string

  poNo: string
  poDate: string | null
  expectedDeliveryDate: string | null
  poStatus: string
  totalValue: number

  supplierId: string
  supplierName: string
  supplierContact: string
  supplierAddress: string

  productCode: string
  productName: string
  category: string
  orderedQty: number
  receivedQty: number
  unit: string
  expiryDate: string | null
  batchNumber: string
  condition: string

  items: GoodsReceiptItem[]
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

function formatStatus(status: string) {
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    ACCEPTED: 'Accepted',
    PARTIAL: 'Partial',
    REJECTED: 'Rejected',
    RELEASED: 'Released',
    APPROVED: 'Approved',
    COMPLETED: 'Completed',
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
  }

  return statusClassMap[status] || 'bg-slate-100 text-slate-600'
}

function createGRNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = String(Date.now()).slice(-5)

  return `GR-${year}${month}-${random}`
}

export function GoodsReceiptClient() {
  const router = useRouter()

  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([])
  const [selectedGrId, setSelectedGrId] = useState('')
  const [receivedQty, setReceivedQty] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [condition, setCondition] = useState('GOOD')
  const [notes, setNotes] = useState('')
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
        throw new Error(result?.error || result?.message || 'Failed to fetch goods receipts')
      }

      const receiptData = result.data || []
      setGoodsReceipts(receiptData)

      if (receiptData.length > 0) {
        const firstReceipt = receiptData[0]
        const firstItem = firstReceipt.items?.[0]

        setSelectedGrId(firstReceipt.id)
        setReceivedQty(
          String(firstItem?.receivedQty || firstReceipt.receivedQty || firstItem?.orderedQty || '')
        )
        setExpiryDate(firstItem?.expiryDate || firstReceipt.expiryDate || '')
        setBatchNo(firstItem?.batchNumber || firstReceipt.batchNumber || '')
        setCondition(firstItem?.condition || firstReceipt.condition || 'GOOD')
        setNotes(firstReceipt.notes === '-' ? '' : firstReceipt.notes || '')
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

  const totalReceived = selectedItems.reduce((total, item, index) => {
    const value =
      index === 0
        ? Number(receivedQty || 0)
        : Number(item.receivedQty || item.orderedQty || 0)

    return total + value
  }, 0)

  const handleChangeReceipt = (id: string) => {
    const receipt = goodsReceipts.find((item) => item.id === id)
    const firstItem = receipt?.items?.[0]

    setSelectedGrId(id)
    setReceivedQty(
      String(firstItem?.receivedQty || receipt?.receivedQty || firstItem?.orderedQty || '')
    )
    setExpiryDate(firstItem?.expiryDate || receipt?.expiryDate || '')
    setBatchNo(firstItem?.batchNumber || receipt?.batchNumber || '')
    setCondition(firstItem?.condition || receipt?.condition || 'GOOD')
    setNotes(receipt?.notes === '-' ? '' : receipt?.notes || '')
    setIsConfirmed(false)
    setErrorMessage('')
  }

  const handleSave = async () => {
    if (!selectedReceipt) {
      setErrorMessage('Please select a purchase order first.')
      return
    }

    if (!isConfirmed) {
      alert('Please confirm the receipt before saving.')
      return
    }

    if (!selectedItems.length) {
      setErrorMessage('No item found for this purchase order.')
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')

      const grNumber = selectedReceipt.grNo?.startsWith('DRAFT-GR-')
        ? createGRNumber()
        : selectedReceipt.grNo || createGRNumber()

      const payloadItems = selectedItems.map((item, index) => ({
        productSku: item.productCode,
        productCode: item.productCode,
        receivedQty:
          index === 0
            ? Number(receivedQty || item.orderedQty || 0)
            : Number(item.receivedQty || item.orderedQty || 0),
        expiryDate: index === 0 ? expiryDate || null : item.expiryDate || null,
        batchNumber: index === 0 ? batchNo || null : item.batchNumber || null,
        condition: index === 0 ? condition || 'GOOD' : item.condition || 'GOOD',
      }))

      const response = await fetch('/api/purchasing/goods-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grNumber,
          poNumber: selectedReceipt.poNo,
          receiptDate: new Date().toISOString(),
          receivedByName: 'Warehouse Staff',
          status: 'ACCEPTED',
          notes,
          items: payloadItems,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Failed to save goods receipt')
      }

      await fetchGoodsReceipts()
      alert('Goods Receipt saved successfully. Continue to Three-Way Matching.')
      router.push('/apps/purchasing/three-way-matching')
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
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Goods Receipt' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Goods Receipt"
          description="Record goods received from suppliers based on released purchase orders."
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
              Select Purchase Order
            </h3>
          </div>

          {isLoading ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              Loading goods receipt data...
            </div>
          ) : goodsReceipts.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No released or approved purchase order is available for goods receipt.
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
                    Status
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
                    Expected Delivery
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatDate(selectedReceipt?.expectedDeliveryDate)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardText size={20} className="text-red-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Receipt Detail
            </h3>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Ordered Qty</th>
                    <th className="px-4 py-3 font-semibold">Received Qty</th>
                    <th className="px-4 py-3 font-semibold">Expiry Date</th>
                    <th className="px-4 py-3 font-semibold">Batch No.</th>
                    <th className="px-4 py-3 font-semibold">Condition</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {selectedItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No goods receipt item found.
                      </td>
                    </tr>
                  ) : (
                    selectedItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.productCode}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatNumber(item.orderedQty)} {item.unit}
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={
                              index === 0
                                ? receivedQty
                                : String(item.receivedQty || item.orderedQty || '')
                            }
                            onChange={(event) =>
                              index === 0 && setReceivedQty(event.target.value)
                            }
                            disabled={index !== 0}
                            className="h-10 w-28 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="date"
                            value={index === 0 ? expiryDate : item.expiryDate || ''}
                            onChange={(event) =>
                              index === 0 && setExpiryDate(event.target.value)
                            }
                            disabled={index !== 0}
                            className="h-10 w-40 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={index === 0 ? batchNo : item.batchNumber || ''}
                            onChange={(event) =>
                              index === 0 && setBatchNo(event.target.value)
                            }
                            disabled={index !== 0}
                            className="h-10 w-40 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <select
                            value={index === 0 ? condition : item.condition || 'GOOD'}
                            onChange={(event) =>
                              index === 0 && setCondition(event.target.value)
                            }
                            disabled={index !== 0}
                            className="h-10 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300 disabled:bg-slate-50"
                          >
                            <option value="GOOD">Good</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="PARTIAL">Partial</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add receiving notes here, such as truck condition, arrival time, or packaging condition."
              className="min-h-[110px] w-full rounded-xl border border-red-100 px-4 py-3 text-sm outline-none focus:border-red-300"
            />
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
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    I confirm that the received goods are correct and have been
                    inspected physically by the warehouse team.
                  </span>
                </label>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      Received By
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedReceipt?.receivedBy || 'Warehouse Staff'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmed(false)}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-6 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !selectedReceipt}
                  className="h-11 rounded-lg bg-red-700 px-6 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {isSaving ? 'Saving...' : 'Save GR'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Package size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Inventory Insight
              </h3>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              This receipt will increase warehouse stock by the received quantity.
              Current warehouse capacity is within the safe threshold.
            </p>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Safety Stock</span>
                <span className="font-bold text-slate-900">200 kg</span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[70%] rounded-full bg-red-600" />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>Current: 850 kg</span>
                <span>Target: 1.000 kg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}