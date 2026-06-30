'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ShoppingCart,
  Clock,
  PaperPlaneTilt,
  MagnifyingGlass,
  Eye,
  PencilSimple,
  X,
  CheckCircle,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { TrackingReportModal } from '@/app/apps/purchasing/_components/TrackingReportModal'

type POStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'RELEASED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | string

type PurchaseOrderItem = {
  id: string
  productCode: string
  productName: string
  category: string
  qty: number
  unit: string
  unitPrice: number
  subtotal: number
}

type BudgetStatus = 'NO_BUDGET' | 'WITHIN_BUDGET' | 'OVER_BUDGET' | string

type PurchaseOrder = {
  id: string
  poNo: string
  poDate: string
  expectedDeliveryDate: string | null
  supplierId: string
  supplierName: string
  supplierContact: string
  supplierAddress: string
  prNo: string
  requestedBy: string
  department: string
  subtotal: number
  taxAmount: number
  totalValue: number
  budgetAmount?: number | null
  budgetVariance?: number | null
  isOverBudget?: boolean
  budgetStatus?: BudgetStatus
  status: POStatus
  approvalLevel: string
  approver: string
  approvedAt: string | null
  approvalNotes: string
  rejectionReason: string
  releasedAt: string | null
  createdBy: string
  productCode: string
  productName: string
  category: string
  qty: number
  unit: string
  unitPrice: number
  items: PurchaseOrderItem[]
}

type UserRole = 'PURCHASING' | 'MANAGER_PURCHASING' | 'DIRECTOR'

function formatCurrency(value?: number | null) {
  const numericValue = Number(value || 0)

  return `Rp ${new Intl.NumberFormat('id-ID').format(numericValue)}`
}

function formatOptionalCurrency(value?: number | null) {
  if (value === null || value === undefined) return '-'

  return formatCurrency(value)
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

function formatStatus(status: POStatus) {
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING_APPROVAL: 'Pending Approval',
    REVISION_REQUIRED: 'Revision Required',
    APPROVED: 'Approved',
    RELEASED: 'Released',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  }

  return statusMap[status] || status
}

function getStatusClass(status: POStatus) {
  const statusClassMap: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
    REVISION_REQUIRED: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    RELEASED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return statusClassMap[status] || 'bg-slate-100 text-slate-600'
}

function formatBudgetStatus(status?: BudgetStatus | null) {
  const statusMap: Record<string, string> = {
    NO_BUDGET: 'No Budget',
    WITHIN_BUDGET: 'Within Budget',
    OVER_BUDGET: 'Over Budget',
  }

  return statusMap[String(status || 'NO_BUDGET')] || String(status || 'No Budget')
}

function getBudgetStatusClass(status?: BudgetStatus | null) {
  const statusClassMap: Record<string, string> = {
    NO_BUDGET: 'bg-slate-100 text-slate-600',
    WITHIN_BUDGET: 'bg-green-100 text-green-700',
    OVER_BUDGET: 'bg-orange-100 text-orange-700',
  }

  return statusClassMap[String(status || 'NO_BUDGET')] || 'bg-slate-100 text-slate-600'
}

function getItemSummary(items: PurchaseOrderItem[]) {
  if (!items || items.length === 0) return '-'

  return items.map((item) => item.productName).join(', ')
}

function isPendingOverBudgetApproval(order: PurchaseOrder) {
  return order.status === 'PENDING_APPROVAL' && Boolean(order.isOverBudget)
}

export function PurchaseOrdersClient() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Status')
  const [supplier, setSupplier] = useState('All Suppliers')
  const [dateRange, setDateRange] = useState('')
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [processingPOId, setProcessingPOId] = useState<string | null>(null)

  const [currentUserRole, setCurrentUserRole] =
    useState<UserRole>('PURCHASING')

  useEffect(() => {
    const savedRole = localStorage.getItem('erp_role') as UserRole | null

    if (
      savedRole === 'PURCHASING' ||
      savedRole === 'MANAGER_PURCHASING' ||
      savedRole === 'DIRECTOR'
    ) {
      setCurrentUserRole(savedRole)
    }
  }, [])

  const canApprovePO = currentUserRole === 'MANAGER_PURCHASING'

  const fetchPurchaseOrders = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/purchase-orders', {
        cache: 'no-store',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch purchase orders')
      }

      setPurchaseOrders(result.data || [])
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to fetch purchase orders'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  const supplierOptions = useMemo(() => {
    const suppliers = purchaseOrders.map((order) => order.supplierName)
    return ['All Suppliers', ...Array.from(new Set(suppliers))]
  }, [purchaseOrders])

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      const matchesSearch =
        order.poNo.toLowerCase().includes(search.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        order.prNo.toLowerCase().includes(search.toLowerCase()) ||
        getItemSummary(order.items).toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        status === 'All Status' || formatStatus(order.status) === status

      const matchesSupplier =
        supplier === 'All Suppliers' || order.supplierName === supplier

      const matchesDate = !dateRange || order.poDate?.slice(0, 10) === dateRange

      return matchesSearch && matchesStatus && matchesSupplier && matchesDate
    })
  }, [purchaseOrders, search, status, supplier, dateRange])

  const pendingApprovalCount = purchaseOrders.filter(
    (order) => order.status === 'PENDING_APPROVAL'
  ).length

  const overBudgetApprovalCount = purchaseOrders.filter((order) =>
    isPendingOverBudgetApproval(order)
  ).length

  const releasedCount = purchaseOrders.filter(
    (order) => order.status === 'RELEASED'
  ).length

  const handleApproveOverBudgetPO = async (order: PurchaseOrder) => {
    const confirmed = window.confirm('Approve this over-budget purchase order?')

    if (!confirmed) return

    try {
      setErrorMessage('')
      setProcessingPOId(order.id)

      const response = await fetch('/api/purchasing/purchase-orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poId: order.id,
          action: 'APPROVE_OVER_BUDGET',
          approvalNotes: 'Over-budget approved by Manager Purchasing.',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || 'Failed to approve purchase order'
        )
      }

      window.alert('Purchase order approved successfully')
      setSelectedPO(null)
      await fetchPurchaseOrders()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to approve purchase order'
      )
    } finally {
      setProcessingPOId(null)
    }
  }

  const handleRejectOverBudgetPO = async (order: PurchaseOrder) => {
    const revisionReason = window.prompt('Enter revision reason')

    if (revisionReason === null) return

    const cleanReason = revisionReason.trim()

    if (!cleanReason) {
      setErrorMessage('Revision reason is required')
      return
    }

    try {
      setErrorMessage('')
      setProcessingPOId(order.id)

      const response = await fetch('/api/purchasing/purchase-orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poId: order.id,
          action: 'REJECT_OVER_BUDGET',
          rejectionReason: cleanReason,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || 'Failed to reject purchase order'
        )
      }

      window.alert('Purchase order rejected successfully')
      setSelectedPO(null)
      await fetchPurchaseOrders()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to reject purchase order'
      )
    } finally {
      setProcessingPOId(null)
    }
  }

  const handleReleasePO = async (order: PurchaseOrder) => {
    try {
      setErrorMessage('')
      setProcessingPOId(order.id)

      const response = await fetch('/api/purchasing/purchase-orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poNo: order.poNo,
          status: 'RELEASED',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Failed to release PO')
      }

      window.alert('Purchase order released successfully')
      setSelectedPO(null)
      await fetchPurchaseOrders()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to release purchase order'
      )
    } finally {
      setProcessingPOId(null)
    }
  }

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Purchase Orders' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <ModuleHeader
            title="Purchase Order"
            description="Manage purchase orders and monitor their processing status."
          />

          <Link
            href="/apps/purchasing/negotiation"
            className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Go to Price Negotiation
          </Link>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                  Total
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {purchaseOrders.length}
                </h3>
                <p className="mt-1 text-xs text-slate-400">Total active PO</p>
              </div>

              <div className="rounded-xl bg-red-50 p-3">
                <ShoppingCart size={24} className="text-red-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                  Priority
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {pendingApprovalCount}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Pending approval
                  {overBudgetApprovalCount > 0
                    ? `, ${overBudgetApprovalCount} over budget`
                    : ''}
                </p>
              </div>

              <div className="rounded-xl bg-orange-50 p-3">
                <Clock size={24} className="text-orange-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Outgoing
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {releasedCount}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Released to supplier
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3">
                <PaperPlaneTilt size={24} className="text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Search PO number, PR, supplier, or item..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              >
                <option>All Status</option>
                <option>Draft</option>
                <option>Pending Approval</option>
                <option>Revision Required</option>
                <option>Approved</option>
                <option>Released</option>
                <option>Completed</option>
                <option>Rejected</option>
                <option>Cancelled</option>
              </select>

              <select
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              >
                {supplierOptions.map((supplierOption) => (
                  <option key={supplierOption}>{supplierOption}</option>
                ))}
              </select>

              <input
                type="date"
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsTrackingModalOpen(true)}
              className="h-10 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Input Tracking Report
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">PO No</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Total Value</th>
                    <th className="px-4 py-3 font-semibold">Budget</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Approver</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        Loading purchase order data...
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-red-50/30">
                        <td className="px-4 py-4 font-bold text-red-600">
                          {order.poNo}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(order.poDate)}
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-900">
                          {order.supplierName}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {getItemSummary(order.items)}
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {formatCurrency(order.totalValue)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getBudgetStatusClass(
                                order.budgetStatus
                              )}`}
                            >
                              {formatBudgetStatus(order.budgetStatus)}
                            </span>

                            {order.isOverBudget && (
                              <p className="text-xs font-medium text-orange-600">
                                Over by {formatCurrency(order.budgetVariance)}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {formatStatus(order.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {order.approver || '-'}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPO(order)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
                              title="View PO Detail"
                            >
                              <Eye size={18} />
                            </button>

                            {(order.status === 'DRAFT' ||
                              order.status === 'REVISION_REQUIRED') && (
                              <Link
                                href={`/apps/purchasing/purchase-orders/create?poNo=${order.poNo}`}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
                                title="Edit PO"
                              >
                                <PencilSimple size={18} />
                              </Link>
                            )}

                            {order.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => handleReleasePO(order)}
                                disabled={processingPOId === order.id}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Send PO to Supplier"
                              >
                                <PaperPlaneTilt size={18} weight="bold" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {!isLoading && filteredOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No purchase order data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>
                Showing {filteredOrders.length} of {purchaseOrders.length}{' '}
                purchase order data
              </p>

              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50">
                  ‹
                </button>
                <button className="rounded-lg bg-red-600 px-3 py-1 text-white">
                  1
                </button>
                <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50">
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">
              Monthly Procurement Trend
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Purchase order volume for the last three months.
            </p>

            <div className="mt-6 flex h-36 items-end gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="h-24 w-20 rounded-t-lg bg-red-700" />
                <span className="text-xs text-slate-500">Apr</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="h-32 w-20 rounded-t-lg bg-red-500" />
                <span className="text-xs text-slate-500">May</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="h-28 w-20 rounded-t-lg bg-blue-500" />
                <span className="text-xs text-slate-500">Jun</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 p-5 text-white shadow-sm">
            <h3 className="font-semibold">Smart Insight</h3>
            <p className="mt-2 text-sm text-slate-300">
              Prioritize over-budget PO that requires manager approval before
              sending it to supplier.
            </p>

            <button className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100">
              View Insight
            </button>
          </div>
        </div>
      </div>

      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedPO.poNo}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      selectedPO.status
                    )}`}
                  >
                    {formatStatus(selectedPO.status)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getBudgetStatusClass(
                      selectedPO.budgetStatus
                    )}`}
                  >
                    {formatBudgetStatus(selectedPO.budgetStatus)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Purchase order detail and approval information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
              {isPendingOverBudgetApproval(selectedPO) && (
                <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  This purchase order exceeds the approved PR budget and
                  requires manager approval.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    PO Date
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatDate(selectedPO.poDate)}
                  </p>
                </div>

                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Supplier
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {selectedPO.supplierName}
                  </p>
                </div>

                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Total Value
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatCurrency(selectedPO.totalValue)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    PR Budget
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatOptionalCurrency(selectedPO.budgetAmount)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Budget Variance
                  </p>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      selectedPO.isOverBudget
                        ? 'text-orange-700'
                        : 'text-green-700'
                    }`}
                  >
                    {formatOptionalCurrency(selectedPO.budgetVariance)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Budget Status
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBudgetStatusClass(
                      selectedPO.budgetStatus
                    )}`}
                  >
                    {formatBudgetStatus(selectedPO.budgetStatus)}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Supplier Information
                  </h3>

                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-700">
                        Supplier ID:
                      </span>{' '}
                      {selectedPO.supplierId}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">
                        Contact:
                      </span>{' '}
                      {selectedPO.supplierContact}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">
                        Address:
                      </span>{' '}
                      {selectedPO.supplierAddress}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Approval Information
                  </h3>

                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-700">
                        Approval Level:
                      </span>{' '}
                      {selectedPO.approvalLevel}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">
                        Approver:
                      </span>{' '}
                      {selectedPO.approver || '-'}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">
                        Approval Notes:
                      </span>{' '}
                      {selectedPO.approvalNotes || '-'}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">
                        Revision Reason:
                      </span>{' '}
                      {selectedPO.rejectionReason || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Unit Price</th>
                      <th className="px-4 py-3 font-semibold">Subtotal</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {selectedPO.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.productCode}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {item.qty} {item.unit}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedPO.subtotal)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm text-slate-600">
                  <span>Tax 11%</span>
                  <span>{formatCurrency(selectedPO.taxAmount)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span>{formatCurrency(selectedPO.totalValue)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>

              {selectedPO.status === 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => handleReleasePO(selectedPO)}
                  disabled={processingPOId === selectedPO.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PaperPlaneTilt size={16} weight="bold" />
                  Send to Supplier
                </button>
              )}

              {isPendingOverBudgetApproval(selectedPO) && canApprovePO && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRejectOverBudgetPO(selectedPO)}
                    disabled={processingPOId === selectedPO.id}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject and Request Revision
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApproveOverBudgetPO(selectedPO)}
                    disabled={processingPOId === selectedPO.id}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    Approve Over-Budget PO
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <TrackingReportModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        title="Input Tracking Report"
        contextLabel="Purchase Order Monitoring"
      />
    </ModuleLayout>
  )
}