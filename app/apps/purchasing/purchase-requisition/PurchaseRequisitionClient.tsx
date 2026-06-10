'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  MagnifyingGlass,
  ClipboardText,
  Clock,
  CheckCircle,
  Eye,
  PaperPlaneTilt,
  X,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type PRStatus =
  | 'PENDING_PO_CREATION'
  | 'PROCESSED'
  | 'CLOSED'
  | 'CANCELLED'

type PurchaseRequisitionItem = {
  id: string
  productCode: string
  productName: string
  category: string
  currentStock: number
  minimumStock: number
  shortageQty: number
  requestQty: number
  unit: string
}

type PurchaseRequisition = {
  id: string
  prNo: string
  requestDate: string
  requestedBy: string
  department: string
  status: PRStatus
  notes: string
  productCode: string
  productName: string
  category: string
  currentStock: number
  minimumStock: number
  shortageQty: number
  requestQty: number
  unit: string
  items: PurchaseRequisitionItem[]
}

function formatDate(value: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatStatus(status: PRStatus) {
  const statusMap: Record<PRStatus, string> = {
    PENDING_PO_CREATION: 'Pending PO Creation',
    PROCESSED: 'Processed',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  }

  return statusMap[status] || status
}

function getStatusClass(status: PRStatus) {
  const statusClassMap: Record<PRStatus, string> = {
    PENDING_PO_CREATION: 'bg-amber-100 text-amber-700',
    PROCESSED: 'bg-blue-100 text-blue-700',
    CLOSED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return statusClassMap[status] || 'bg-slate-100 text-slate-600'
}

function getItemSummary(items: PurchaseRequisitionItem[]) {
  if (!items || items.length === 0) return '-'

  return items.map((item) => item.productName).join(', ')
}

function getQtySummary(items: PurchaseRequisitionItem[]) {
  if (!items || items.length === 0) return '-'

  return items
    .map((item) => `${formatNumber(item.requestQty)} ${item.unit}`)
    .join(', ')
}

export function PurchaseRequisitionClient() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Status')
  const [product, setProduct] = useState('All Products')
  const [requestDate, setRequestDate] = useState('')
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

      setRequisitions(result.data || [])
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

  const productOptions = useMemo(() => {
    const products = requisitions.flatMap((item) =>
      item.items.map((prItem) => prItem.productName)
    )

    return ['All Products', ...Array.from(new Set(products))]
  }, [requisitions])

  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((item) => {
      const itemSummary = getItemSummary(item.items)

      const matchesSearch =
        item.prNo.toLowerCase().includes(search.toLowerCase()) ||
        item.requestedBy.toLowerCase().includes(search.toLowerCase()) ||
        itemSummary.toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        status === 'All Status' || formatStatus(item.status) === status

      const matchesProduct =
        product === 'All Products' ||
        item.items.some((prItem) => prItem.productName === product)

      const matchesDate = !requestDate || item.requestDate === requestDate

      return matchesSearch && matchesStatus && matchesProduct && matchesDate
    })
  }, [requisitions, search, status, product, requestDate])

  const activePR = requisitions.filter(
    (item) => item.status === 'PENDING_PO_CREATION'
  ).length

  const processedPR = requisitions.filter(
    (item) => item.status === 'PROCESSED'
  ).length

  const closedPR = requisitions.filter((item) => item.status === 'CLOSED').length

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
        <div className="flex items-start justify-between gap-4">
          <ModuleHeader
            title="Purchase Requisition"
            description="Manage purchase requests submitted by warehouse staff."
          />

          <Link
            href="/apps/purchasing/purchase-requisition/create"
            className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
          >
            + Create PR
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
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Active PR
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {activePR}
                </h3>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <ClipboardText size={22} className="text-red-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Processed PR
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {processedPR}
                </h3>
              </div>
              <div className="rounded-xl bg-blue-50 p-3">
                <Clock size={22} className="text-blue-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Closed PR
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {closedPR}
                </h3>
              </div>
              <div className="rounded-xl bg-green-50 p-3">
                <CheckCircle size={22} className="text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search PR..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-red-300 md:w-64"
                />
              </div>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-red-300"
              >
                <option>All Status</option>
                <option>Pending PO Creation</option>
                <option>Processed</option>
                <option>Closed</option>
                <option>Cancelled</option>
              </select>

              <select
                value={product}
                onChange={(event) => setProduct(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-red-300"
              >
                {productOptions.map((productOption) => (
                  <option key={productOption}>{productOption}</option>
                ))}
              </select>

              <input
                type="date"
                value={requestDate}
                onChange={(event) => setRequestDate(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-red-300"
              />
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">PR No</th>
                    <th className="px-4 py-3 font-semibold">Request Date</th>
                    <th className="px-4 py-3 font-semibold">Requested By</th>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
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
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        Loading purchase requisition data...
                      </td>
                    </tr>
                  ) : (
                    filteredRequisitions.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 text-xs font-medium text-slate-700">
                          {item.prNo}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(item.requestDate)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {item.requestedBy}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {getItemSummary(item.items)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {getQtySummary(item.items)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {formatStatus(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPR(item)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
                              title="View PR detail"
                            >
                              <Eye size={18} />
                            </button>

                            <Link
                              href={`/apps/purchasing/purchase-orders/create?prNo=${item.prNo}`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
                              title="Process to Purchase Order"
                            >
                              <PaperPlaneTilt size={18} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {!isLoading && filteredRequisitions.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No purchase requisition data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>
                Showing {filteredRequisitions.length} of {requisitions.length}{' '}
                purchase requisition data
              </p>

              <div className="flex items-center gap-2">
                <button className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                  ‹
                </button>
                <button className="rounded-lg bg-red-600 px-3 py-1 text-white">
                  1
                </button>
                <button className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedPR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Purchase Requisition Detail
                </h2>
                <p className="text-sm text-slate-500">{selectedPR.prNo}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPR(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Request Date
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(selectedPR.requestDate)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Requested By
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedPR.requestedBy}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Department
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedPR.department}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Status
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      selectedPR.status
                    )}`}
                  >
                    {formatStatus(selectedPR.status)}
                  </span>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Current Stock</th>
                      <th className="px-4 py-3 font-semibold">Minimum Stock</th>
                      <th className="px-4 py-3 font-semibold">Shortage</th>
                      <th className="px-4 py-3 font-semibold">Request Qty</th>
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
                        <td className="px-4 py-4 text-slate-600">
                          {formatNumber(item.currentStock)} {item.unit}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatNumber(item.minimumStock)} {item.unit}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatNumber(item.shortageQty)} {item.unit}
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {formatNumber(item.requestQty)} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Notes
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {selectedPR.notes}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedPR(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>

              <Link
                href={`/apps/purchasing/purchase-orders/create?prNo=${selectedPR.prNo}`}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                <PaperPlaneTilt size={16} />
                Process to PO
              </Link>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  )
}