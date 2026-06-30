'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardText,
  Eye,
  MagnifyingGlass,
  Package,
  PaperPlaneTilt,
  WarningCircle,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type PRStatus =
  | 'PENDING_REVIEW'
  | 'PROCESSED'
  | 'CLOSED'
  | 'CANCELLED'
  | string

type UserRole = 'PURCHASING' | 'MANAGER_PURCHASING' | 'ADMIN'

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
  requestedById?: number | null
  department: string
  priority: string
  rawStatus?: string
  status: PRStatus
  statusLabel?: string
  purpose: string
  notes: string
  totalEstimatedValue: number

  budgetAmount: number
  budgetNote: string
  managerDecision: string
  rejectionReason: string
  isBudgetProvided: boolean

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
    PENDING_REVIEW: 'Pending Manager Review',
    PROCESSED: 'Approved for Purchasing',
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
    PENDING_REVIEW: 'bg-amber-100 text-amber-700',
    PROCESSED: 'bg-blue-100 text-blue-700',
    CLOSED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return statusMap[status] || 'bg-slate-100 text-slate-700'
}

function getRoleLabel(role: UserRole) {
  const roleMap: Record<UserRole, string> = {
    PURCHASING: 'Purchasing Staff',
    MANAGER_PURCHASING: 'Manager Purchasing',
    ADMIN: 'Admin',
  }

  return roleMap[role]
}

function isPendingReview(status: PRStatus) {
  return status === 'PENDING_REVIEW'
}

function isReadyForRFQ(status: PRStatus) {
  return status === 'PROCESSED'
}

function normalizePR(raw: any): PurchaseRequisition {
  const rawItems =
    raw.items ||
    raw.purchasing_purchase_requisition_items ||
    raw.purchase_requisition_items ||
    []

  const items: PurchaseRequisitionItem[] = rawItems.map((item: any) => {
    const product = item.products || item.product || {}

    const qty = Number(item.qty || item.quantity || item.requestQty || 0)
    const estimatedPrice = Number(
      item.estimatedPrice ||
        item.estimated_price ||
        item.unit_price ||
        item.unitPrice ||
        0
    )

    return {
      id: String(item.id || crypto.randomUUID()),
      productCode:
        item.productCode ||
        item.product_code ||
        product.sku ||
        product.product_id ||
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
      unit: item.unit || product.uom || product.unit || '-',
      estimatedPrice,
      subtotal: Number(item.subtotal || qty * estimatedPrice || 0),
    }
  })

  const totalEstimatedValue =
    Number(raw.totalEstimatedValue || raw.total_estimated_value || 0) ||
    items.reduce((total, item) => total + item.subtotal, 0)

  return {
    id: String(raw.id || raw.prNo || raw.pr_id || crypto.randomUUID()),
    prNo:
      raw.prNo ||
      raw.prNumber ||
      raw.requisitionNumber ||
      raw.requisition_number ||
      raw.pr_number ||
      raw.pr_id ||
      '-',
    requestDate: raw.requestDate || raw.request_date || raw.created_at || null,
    requiredDate: raw.requiredDate || raw.required_date || null,
    requesterName:
      raw.requesterName ||
      raw.requester_name ||
      raw.requestedBy ||
      raw.requested_by ||
      '-',
    requestedById: raw.requestedById || raw.requested_by || null,
    department: raw.department || raw.requester_department || 'Inventory',
    priority: raw.priority || 'Normal',
    rawStatus: raw.rawStatus || raw.raw_status || raw.status || 'PENDING',
    status: raw.status || 'PENDING_REVIEW',
    statusLabel: raw.statusLabel || getStatusLabel(raw.status || 'PENDING_REVIEW'),
    purpose: raw.purpose || raw.description || '-',
    notes: raw.notes || '-',
    totalEstimatedValue,

    budgetAmount: Number(raw.budgetAmount || raw.budget_amount || 0),
    budgetNote: raw.budgetNote || raw.budget_note || '',
    managerDecision: raw.managerDecision || raw.manager_decision || '',
    rejectionReason: raw.rejectionReason || raw.rejection_reason || '',
    isBudgetProvided: Boolean(raw.isBudgetProvided || raw.is_budget_provided),

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
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetNote, setBudgetNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isReviewing, setIsReviewing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('PURCHASING')

  useEffect(() => {
    const savedRole = localStorage.getItem('erp_role') as UserRole | null

    if (
      savedRole === 'PURCHASING' ||
      savedRole === 'MANAGER_PURCHASING' ||
      savedRole === 'ADMIN'
    ) {
      setCurrentUserRole(savedRole)
    }
  }, [])

  const canReviewPR =
    currentUserRole === 'MANAGER_PURCHASING' || currentUserRole === 'ADMIN'

  const canProcessRFQ =
    currentUserRole === 'PURCHASING' || currentUserRole === 'ADMIN'

  const fetchPurchaseRequisitions = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/purchase-requisitions')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Failed to fetch purchase requisitions'
        )
      }

      const normalizedData = (result.data || []).map((item: any) =>
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
    return purchaseRequisitions.filter((item) => {
      const searchKeyword = search.toLowerCase()

      const matchesSearch =
        item.prNo.toLowerCase().includes(searchKeyword) ||
        item.requesterName.toLowerCase().includes(searchKeyword) ||
        item.department.toLowerCase().includes(searchKeyword) ||
        item.items.some((prItem) =>
          prItem.productName.toLowerCase().includes(searchKeyword)
        )

      const matchesStatus =
        statusFilter === 'All Status' || item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [purchaseRequisitions, search, statusFilter])

  const pendingSourcingCount = purchaseRequisitions.filter(
    (item: AnyObject) => isPendingSourcing(item.status)
  ).length

  const approvedCount = purchaseRequisitions.filter((item) =>
    isReadyForRFQ(item.status)
  ).length

  const closedCount = purchaseRequisitions.filter(
    (item) => item.status === 'CLOSED'
  ).length

  const openDetail = (item: PurchaseRequisition) => {
    setSelectedPR(item)
    setBudgetAmount(item.budgetAmount ? String(item.budgetAmount) : '')
    setBudgetNote(item.budgetNote || '')
    setRejectionReason(item.rejectionReason || '')
    setErrorMessage('')
  }

  const closeDetail = () => {
    setSelectedPR(null)
    setBudgetAmount('')
    setBudgetNote('')
    setRejectionReason('')
    setErrorMessage('')
  }

  const handleReviewPR = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedPR) return

    if (!canReviewPR) {
      setErrorMessage('Only Manager Purchasing can review purchase requisitions.')
      return
    }

    if (action === 'APPROVE') {
      const numericBudget = Number(budgetAmount || 0)

      if (!numericBudget || Number.isNaN(numericBudget) || numericBudget <= 0) {
        setErrorMessage('Budget amount is required before approving PR.')
        return
      }
    }

    if (action === 'REJECT' && !rejectionReason.trim()) {
      setErrorMessage('Rejection reason is required.')
      return
    }

    try {
      setIsReviewing(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/purchase-requisitions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prNo: selectedPR.prNo,
          action,
          budgetAmount: Number(budgetAmount || 0),
          budgetNote,
          rejectionReason,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Failed to review purchase requisition'
        )
      }

      await fetchPurchaseRequisitions()

      alert(
        action === 'APPROVE'
          ? 'Purchase Requisition approved and budget has been recorded.'
          : 'Purchase Requisition rejected.'
      )

      closeDetail()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to review purchase requisition'
      )
    } finally {
      setIsReviewing(false)
    }
  }

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
          description="Review purchase requisitions from Inventory, record manager budget approval, and continue approved PRs to RFQ/Sourcing."
        />

        {errorMessage && !selectedPR && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Current workspace:{' '}
          <span className="font-semibold text-slate-900">
            {getRoleLabel(currentUserRole)}
          </span>
          . Manager Purchasing can review PR and input budget. Purchasing Staff
          can process approved PR to RFQ/Sourcing.
          <Link
            href="/apps/purchasing/role-selector"
            className="ml-2 font-semibold text-red-600 hover:underline"
          >
            Switch Role
          </Link>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Purchase requisitions from Inventory must be reviewed by Manager
          Purchasing before they can continue to RFQ/Sourcing and price
          negotiation.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Pending Review
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {pendingReviewCount}
                </h3>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <WarningCircle size={26} className="text-amber-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Approved for Purchasing
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {approvedCount}
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
                <option value="PENDING_REVIEW">Pending Manager Review</option>
                <option value="PROCESSED">Approved for Purchasing</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">PR No</th>
                    <th className="px-4 py-3 font-semibold">Request Date</th>
                    <th className="px-4 py-3 font-semibold">Requester</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Estimated Value</th>
                    <th className="px-4 py-3 font-semibold">Budget</th>
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
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        Loading purchase requisitions...
                      </td>
                    </tr>
                  ) : (
                    filteredPR.map((item) => (
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
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {item.budgetAmount > 0
                            ? formatCurrency(item.budgetAmount)
                            : '-'}
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
                              onClick={() => openDetail(item)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              title="View Detail"
                            >
                              <Eye size={18} weight="bold" />
                            </button>

                            {canProcessRFQ && isReadyForRFQ(item.status) && (
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
                        colSpan={9}
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
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    Purchase Requisition Detail
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    {selectedPR.prNo}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    PR from Inventory must be reviewed by Manager Purchasing
                    before it can continue to RFQ/Sourcing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              {errorMessage && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

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
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Priority</span>
                      <span className="font-semibold text-slate-900">
                        {selectedPR.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Manager Review & Budget
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
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
                      <span className="text-slate-500">Estimated Value</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(selectedPR.totalEstimatedValue)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Approved Budget</span>
                      <span className="font-semibold text-slate-900">
                        {selectedPR.budgetAmount > 0
                          ? formatCurrency(selectedPR.budgetAmount)
                          : '-'}
                      </span>
                    </div>
                    {selectedPR.budgetNote && (
                      <div>
                        <span className="text-slate-500">Budget Note</span>
                        <p className="mt-1 rounded-lg bg-slate-50 p-2 text-slate-700">
                          {selectedPR.budgetNote}
                        </p>
                      </div>
                    )}
                    {selectedPR.rejectionReason && (
                      <div>
                        <span className="text-slate-500">Rejection Reason</span>
                        <p className="mt-1 rounded-lg bg-red-50 p-2 text-red-700">
                          {selectedPR.rejectionReason}
                        </p>
                      </div>
                    )}
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

              {isPendingReview(selectedPR.status) && canReviewPR && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Manager Purchasing Review
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Enter the approved budget to approve this PR. If this PR
                    should not continue, provide the rejection reason.
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Budget Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={budgetAmount}
                        onChange={(event) => setBudgetAmount(event.target.value)}
                        placeholder="Example: 100000000"
                        className="h-11 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Budget Note
                      </label>
                      <input
                        type="text"
                        value={budgetNote}
                        onChange={(event) => setBudgetNote(event.target.value)}
                        placeholder="Budget note or purchasing commitment"
                        className="h-11 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Rejection Reason
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      placeholder="Required only when rejecting this PR"
                      className="min-h-[90px] w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {isPendingReview(selectedPR.status) && !canReviewPR && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Manager Review Required
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    This PR is waiting for Manager Purchasing review. Purchasing
                    Staff can view the request, but cannot approve, reject, or
                    input budget.
                  </p>
                </div>
              )}

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
                    {selectedPR.items.map((item) => (
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

              <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>

                {isPendingReview(selectedPR.status) && canReviewPR && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReviewPR('REJECT')}
                      disabled={isReviewing}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <XCircle size={16} weight="bold" />
                      {isReviewing ? 'Processing...' : 'Reject PR'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReviewPR('APPROVE')}
                      disabled={isReviewing}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle size={16} weight="bold" />
                      {isReviewing ? 'Processing...' : 'Approve & Save Budget'}
                    </button>
                  </>
                )}

                {canProcessRFQ && isReadyForRFQ(selectedPR.status) && (
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