'use client'
import { AnyObject } from '@/lib/any';

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardText,
  Eye,
  MagnifyingGlass,
  Package,
  PaperPlaneTilt,
  WarningCircle,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type PRStatus =
  | 'PENDING_PO_CREATION'
  | 'PENDING_SOURCING'
  | 'PROCESSED'
  | 'CLOSED'
  | 'CANCELLED'
  | string

type PurchaseRequisitionItem = {
  id: string
  productCode: string
  productName: string
  category: string
  qty: number
  unit: string
  estimatedPrice: number
  subtotal: number
}

type PurchaseRequisition = {
  id: string
  prNo: string
  requestDate: string | null
  requiredDate: string | null
  requesterName: string
  department: string
  priority: string
  status: PRStatus
  purpose: string
  notes: string
  totalEstimatedValue: number
  items: PurchaseRequisitionItem[]
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
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

function getStatusLabel(status: PRStatus) {
  const statusMap: Record<string, string> = {
    PENDING_PO_CREATION: 'Pending Sourcing',
    PENDING_SOURCING: 'Pending Sourcing',
    PROCESSED: 'Processed',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  }

  return statusMap[status] || status
}

function isPendingSourcing(status: string) {
  return status === 'PENDING_PO_CREATION' || status === 'PENDING_SOURCING'
}

function getStatusClass(status: PRStatus) {
  const statusMap: Record<string, string> = {
    PENDING_PO_CREATION: 'bg-orange-100 text-orange-700',
    PENDING_SOURCING: 'bg-orange-100 text-orange-700',
    PROCESSED: 'bg-blue-100 text-blue-700',
    CLOSED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return statusMap[status] || 'bg-slate-100 text-slate-700'
}

type PurchaseRequisitionItemRaw = {
  id?: string
  qty?: number | string
  quantity?: number | string
  estimated_price?: number | string
  estimatedPrice?: number | string
  unit_price?: number | string
  productCode?: string
  product_code?: string
  productName?: string
  product_name?: string
  category?: string
  unit?: string
  subtotal?: number | string
  products?: {
    sku?: string
    product_code?: string
    name?: string
    product_name?: string
    category?: string
    unit?: string
  }
  product?: {
    sku?: string
    product_code?: string
    name?: string
    product_name?: string
    category?: string
    unit?: string
  }
}

type PurchaseRequisitionRaw = {
  id?: string
  prNo?: string
  prNumber?: string
  requisitionNumber?: string
  requisition_number?: string
  pr_number?: string
  requestDate?: string
  request_date?: string
  created_at?: string
  requiredDate?: string
  required_date?: string
  requesterName?: string
  requester_name?: string
  requestedBy?: string
  requested_by?: string
  department?: string
  requester_department?: string
  priority?: string
  status?: PRStatus
  purpose?: string
  description?: string
  notes?: string
  totalEstimatedValue?: number | string
  total_estimated_value?: number | string
  items?: PurchaseRequisitionItemRaw[]
  purchasing_purchase_requisition_items?: PurchaseRequisitionItemRaw[]
  purchase_requisition_items?: PurchaseRequisitionItemRaw[]
}

function normalizePR(raw: PurchaseRequisitionRaw): PurchaseRequisition {
  const rawItems =
    raw.items ||
    raw.purchasing_purchase_requisition_items ||
    raw.purchase_requisition_items ||
    []

  const items: PurchaseRequisitionItem[] = rawItems.map((item: AnyObject) => {
    const product = item.products || item.product || {}

    const qty = Number(item.qty || item.quantity || 0)
    const estimatedPrice = Number(
      item.estimated_price || item.estimatedPrice || item.unit_price || 0
    )

    return {
      id: String(item.id || crypto.randomUUID()),
      productCode:
        item.productCode ||
        item.product_code ||
        product.sku ||
        product.product_code ||
        '-',
      productName:
        item.productName ||
        item.product_name ||
        product.name ||
        product.product_name ||
        '-',
      category: item.category || product.category || '-',
      qty,
      unit: item.unit || product.unit || '-',
      estimatedPrice,
      subtotal: Number(item.subtotal || qty * estimatedPrice || 0),
    }
  })

  const totalEstimatedValue =
    Number(raw.totalEstimatedValue || raw.total_estimated_value || 0) ||
    items.reduce((total, item) => total + item.subtotal, 0)

  return {
    id: String(raw.id || crypto.randomUUID()),
    prNo:
      raw.prNo ||
      raw.prNumber ||
      raw.requisitionNumber ||
      raw.requisition_number ||
      raw.pr_number ||
      '-',
    requestDate: raw.requestDate || raw.request_date || raw.created_at || null,
    requiredDate: raw.requiredDate || raw.required_date || null,
    requesterName:
      raw.requesterName ||
      raw.requester_name ||
      raw.requestedBy ||
      raw.requested_by ||
      '-',
    department: raw.department || raw.requester_department || 'Inventory',
    priority: raw.priority || '-',
    status: raw.status || 'PENDING_SOURCING',
    purpose: raw.purpose || raw.description || '-',
    notes: raw.notes || '-',
    totalEstimatedValue,
    items,
  }
}

export function PurchaseRequisitionClient() {
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<
    PurchaseRequisition[]
  >([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchPurchaseRequisitions = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/purchase-requisitions')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch purchase requisitions')
      }

      const normalizedData = (result.data || []).map((item: AnyObject) =>
        normalizePR(item)
      )

      setPurchaseRequisitions(normalizedData)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to fetch purchase requisitions'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchaseRequisitions()
  }, [])

  const filteredPR = useMemo(() => {
    return purchaseRequisitions.filter((item: AnyObject) => {
      const matchesSearch =
        item.prNo.toLowerCase().includes(search.toLowerCase()) ||
        item.requesterName.toLowerCase().includes(search.toLowerCase()) ||
        item.department.toLowerCase().includes(search.toLowerCase()) ||
        item.items.some((prItem: AnyObject) =>
          prItem.productName.toLowerCase().includes(search.toLowerCase())
        )

      const matchesStatus =
        statusFilter === 'All Status' ||
        item.status === statusFilter ||
        (statusFilter === 'PENDING_SOURCING' && isPendingSourcing(item.status))

      return matchesSearch && matchesStatus
    })
  }, [purchaseRequisitions, search, statusFilter])

  const pendingSourcingCount = purchaseRequisitions.filter(
    (item: AnyObject) => isPendingSourcing(item.status)
  ).length

  const processedCount = purchaseRequisitions.filter(
    (item: AnyObject) => item.status === 'PROCESSED'
  ).length

  const closedCount = purchaseRequisitions.filter(
    (item: AnyObject) => item.status === 'CLOSED'
  ).length

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Purchase Requisition' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Purchase Requisition"
          description="View purchase requisitions submitted from the Inventory module before continuing to RFQ, sourcing, and price negotiation."
        />

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          PR tidak langsung dibuat menjadi PO. PR diproses terlebih dahulu ke
          RFQ/Sourcing, lalu masuk Price Negotiation. PO otomatis terbentuk
          setelah hasil negosiasi disetujui.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Pending Sourcing
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {pendingSourcingCount}
                </h3>
              </div>
              <div className="rounded-xl bg-orange-50 p-3">
                <WarningCircle size={26} className="text-orange-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Processed
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {processedCount}
                </h3>
              </div>
              <div className="rounded-xl bg-blue-50 p-3">
                <ClipboardText size={26} className="text-blue-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Closed
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {closedCount}
                </h3>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <Package size={26} className="text-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search PR number, requester, department, or product"
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-red-300"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              >
                <option>All Status</option>
                <option value="PENDING_SOURCING">Pending Sourcing</option>
                <option value="PROCESSED">Processed</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">PR No</th>
                    <th className="px-4 py-3 font-semibold">Request Date</th>
                    <th className="px-4 py-3 font-semibold">Requester</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Total Estimate</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        Loading purchase requisitions...
                      </td>
                    </tr>
                  ) : (
                    filteredPR.map((item: AnyObject) => (
                      <tr key={item.id} className="bg-white hover:bg-slate-50">
                        <td className="px-4 py-4 font-bold text-red-600">
                          {item.prNo}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {formatDate(item.requestDate)}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {item.requesterName}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {item.department}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {item.items.length} item
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {formatCurrency(item.totalEstimatedValue)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPR(item)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              title="View detail"
                            >
                              <Eye size={18} weight="bold" />
                            </button>

                            {isPendingSourcing(item.status) && (
                              <Link
                                href={`/apps/purchasing/rfq-sourcing?prNo=${encodeURIComponent(
                                  item.prNo
                                )}`}
                                className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                                title="Process to RFQ/Sourcing"
                              >
                                <PaperPlaneTilt size={18} weight="bold" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {!isLoading && filteredPR.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No purchase requisition data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedPR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    Purchase Requisition Detail
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    {selectedPR.prNo}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Submitted from Inventory module and ready to continue into
                    RFQ/Sourcing before negotiation and PO generation.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPR(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Request Information
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Request Date</span>
                      <span className="font-semibold text-slate-900">
                        {formatDate(selectedPR.requestDate)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Required Date</span>
                      <span className="font-semibold text-slate-900">
                        {formatDate(selectedPR.requiredDate)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Requester</span>
                      <span className="font-semibold text-slate-900">
                        {selectedPR.requesterName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Department</span>
                      <span className="font-semibold text-slate-900">
                        {selectedPR.department}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status Information
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Priority</span>
                      <span className="font-semibold text-slate-900">
                        {selectedPR.priority}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Status</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          selectedPR.status
                        )}`}
                      >
                        {getStatusLabel(selectedPR.status)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Total Estimate</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(selectedPR.totalEstimatedValue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Purpose
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {selectedPR.purpose}
                </p>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Est. Price</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Subtotal
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {selectedPR.items.map((item: AnyObject) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.productCode}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {item.category}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {formatNumber(item.qty)} {item.unit}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {formatCurrency(item.estimatedPrice)}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}

                    {selectedPR.items.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-sm text-slate-500"
                        >
                          No item detail available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPR(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>

                {isPendingSourcing(selectedPR.status) && (
                  <Link
                    href={`/apps/purchasing/rfq-sourcing?prNo=${encodeURIComponent(
                      selectedPR.prNo
                    )}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Process to RFQ/Sourcing
                    <PaperPlaneTilt size={16} weight="bold" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}