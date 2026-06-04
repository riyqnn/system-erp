'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
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

const purchaseOrders = [
  {
    poNo: 'PO-202604-001',
    date: '10 Apr 2026',
    supplier: 'PT Jawamanis Rafinasi',
    totalValue: 'Rp 8.250.000',
    status: 'Released',
    approver: 'Budi Santoso',
  },
  {
    poNo: 'PO-202604-002',
    date: '11 Apr 2026',
    supplier: 'PT Aneka Coffee',
    totalValue: 'Rp 10.500.000',
    status: 'Pending Approval',
    approver: '-',
  },
  {
    poNo: 'PO-202604-003',
    date: '12 Apr 2026',
    supplier: 'PT Musim Mas',
    totalValue: 'Rp 7.200.000',
    status: 'Approved',
    approver: 'Rina Wati',
  },
  {
    poNo: 'PO-202604-004',
    date: '12 Apr 2026',
    supplier: 'PT Supernova Flexible',
    totalValue: 'Rp 3.250.000',
    status: 'Draft',
    approver: '-',
  },
]

export function PurchaseOrdersClient() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Status')
  const [supplier, setSupplier] = useState('All Suppliers')
  const [dateRange, setDateRange] = useState('')
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<(typeof purchaseOrders)[0] | null>(null)

  // Simulasi role sementara.
  // Ganti ke 'PURCHASING' untuk cek mode staf biasa.
  // Ganti ke 'MANAGER_PURCHASING' untuk cek tombol approve/reject muncul.
  type UserRole = 'PURCHASING' | 'MANAGER_PURCHASING' | 'DIRECTOR'

  const [currentUserRole] = useState<UserRole>('PURCHASING')

  const canApprovePO = currentUserRole === 'MANAGER_PURCHASING'

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      const matchesSearch =
        order.poNo.toLowerCase().includes(search.toLowerCase()) ||
        order.supplier.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = status === 'All Status' || order.status === status

      const matchesSupplier =
        supplier === 'All Suppliers' || order.supplier === supplier

      return matchesSearch && matchesStatus && matchesSupplier
    })
  }, [search, status, supplier])

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
            href="/apps/purchasing/purchase-orders/create"
            className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            + Create New PO
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                  Total
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">24</h3>
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
                <h3 className="mt-2 text-4xl font-bold text-slate-900">8</h3>
                <p className="mt-1 text-xs text-slate-400">Pending approval</p>
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
                <h3 className="mt-2 text-4xl font-bold text-slate-900">12</h3>
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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search PO number or supplier..."
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
              <option>Approved</option>
              <option>Released</option>
            </select>

            <select
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
            >
              <option>All Suppliers</option>
              <option>PT Jawamanis Rafinasi</option>
              <option>PT Aneka Coffee</option>
              <option>PT Musim Mas</option>
              <option>PT Supernova Flexible</option>
            </select>

            <input
              type="date"
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">PO No</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Total Value</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Approver</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.poNo} className="hover:bg-red-50/30">
                      <td className="px-4 py-4 font-bold text-red-600">
                        {order.poNo}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {order.date}
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-900">
                        {order.supplier}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {order.totalValue}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            order.status === 'Released'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'Pending Approval'
                                ? 'bg-orange-100 text-orange-700'
                                : order.status === 'Approved'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {order.approver}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-3 text-slate-400">
                          <button
                            type="button"
                            onClick={() => setSelectedPO(order)}
                            className="hover:text-slate-700"
                            title="View PO Detail"
                          >
                            <Eye size={18} />
                          </button>

                          {(order.status === 'Draft' ||
                            order.status === 'Revision Required') && (
                            <button
                              type="button"
                              className="hover:text-red-600"
                              title="Edit Draft PO"
                            >
                              <PencilSimple size={18} />
                            </button>
                          )}

                          {order.status === 'Approved' && (
                            <button
                              type="button"
                              className="hover:text-blue-600"
                              title="Send PO to Supplier"
                            >
                              <PaperPlaneTilt size={18} weight="bold" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
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
              <p>Showing 1-4 of 24 purchase orders</p>

              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50">
                  ‹
                </button>

                <button className="rounded-lg bg-red-600 px-3 py-1 text-white">
                  1
                </button>

                <button className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50">
                  2
                </button>

                <button className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50">
                  3
                </button>

                <button className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50">
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">
              Monthly Procurement Trend
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Supplier and purchase order trend analysis for the current month.
            </p>

            <div className="mt-6 flex h-40 items-end gap-5">
              <div className="h-24 flex-1 rounded-t-xl bg-red-700" />
              <div className="h-32 flex-1 rounded-t-xl bg-red-500" />
              <div className="h-20 flex-1 rounded-t-xl bg-red-300" />
              <div className="h-36 flex-1 rounded-t-xl bg-slate-300" />
              <div className="h-28 flex-1 rounded-t-xl bg-slate-400" />
            </div>
          </div>

          <div className="rounded-xl bg-red-700 p-5 text-white shadow-sm">
            <h3 className="font-semibold">Smart Insights</h3>

            <p className="mt-2 text-sm text-red-50">
              Three suppliers show unusual delivery patterns this month.
            </p>

            <button className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
              View Detail
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsTrackingModalOpen(true)}
            className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            Input Tracking Report
          </button>
        </div>
      </div>

      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedPO.poNo}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      selectedPO.status === 'Pending Approval'
                        ? 'bg-orange-100 text-orange-700'
                        : selectedPO.status === 'Approved'
                          ? 'bg-blue-100 text-blue-700'
                          : selectedPO.status === 'Released'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {selectedPO.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Purchase order detail and approval review.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-slate-900">
                        {selectedPO.poNo}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedPO.status === 'Pending Approval'
                            ? 'bg-orange-100 text-orange-700'
                            : selectedPO.status === 'Approved'
                              ? 'bg-blue-100 text-blue-700'
                              : selectedPO.status === 'Released'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {selectedPO.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-500">
                      Created on {selectedPO.date}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Total PO Value
                    </p>

                    <p className="mt-1 text-3xl font-bold text-red-600">
                      {selectedPO.totalValue}
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      Level 1 - Manager Purchasing Authority
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
                  <h3 className="border-b border-red-100 pb-3 text-lg font-semibold text-slate-900">
                    Supplier Information
                  </h3>

                  <div className="mt-4 space-y-4 text-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500">Name</span>
                      <span className="font-bold text-slate-900">
                        {selectedPO.supplier}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500">Supplier ID</span>
                      <span className="font-semibold text-slate-900">
                        VND-RM-004
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500">Product</span>
                      <span className="font-semibold text-slate-900">
                        Coffee Extract
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500">Price</span>
                      <span className="font-semibold text-slate-900">
                        Rp 105.000/kg
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500">Lead Time</span>
                      <span className="font-semibold text-slate-900">
                        5 Days
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Term of Payment</span>
                      <span className="font-semibold text-slate-900">
                        Net 30
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
                  <h3 className="border-b border-red-100 pb-3 text-lg font-semibold text-slate-900">
                    Order Detail
                  </h3>

                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Product</th>
                          <th className="px-4 py-3 font-semibold">Qty</th>
                          <th className="px-4 py-3 font-semibold">
                            Unit Price
                          </th>
                          <th className="px-4 py-3 text-right font-semibold">
                            Subtotal
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            Coffee Extract
                          </td>

                          <td className="px-4 py-4 text-slate-700">100 kg</td>

                          <td className="px-4 py-4 text-slate-700">
                            Rp 105.000
                          </td>

                          <td className="px-4 py-4 text-right font-semibold text-slate-900">
                            {selectedPO.totalValue}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="border-t border-slate-100 bg-red-50 px-4 py-4">
                      <div className="flex items-center justify-end gap-8">
                        <span className="text-sm font-semibold text-slate-600">
                          Total
                        </span>

                        <span className="text-lg font-bold text-red-600">
                          {selectedPO.totalValue}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Approval Rule
                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      PO value up to Rp 100.000.000 requires approval from
                      Manager Purchasing. PO value above Rp 100.000.000 requires
                      approval from Director.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
                <label className="mb-3 block text-sm font-semibold text-slate-900">
                  Approval Notes
                </label>

                <textarea
                  placeholder="Write optional approval notes..."
                  className="min-h-[100px] w-full rounded-xl border border-red-100 px-4 py-3 text-sm outline-none focus:border-red-300"
                />

                {selectedPO.status === 'Pending Approval' && canApprovePO ? (
                  <div className="mt-5">
                    <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                      You are authorized as Manager Purchasing to approve or
                      reject this purchase order.
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPO(null)}
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <X size={16} weight="bold" />
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPO(null)}
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800"
                      >
                        <CheckCircle size={16} weight="bold" />
                        Approve PO
                      </button>
                    </div>
                  </div>
                ) : selectedPO.status === 'Pending Approval' && !canApprovePO ? (
                  <div className="mt-5 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    You can view this purchase order, but approval actions are
                    only available for Manager Purchasing.
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Approval action is only available for purchase orders with
                    Pending Approval status.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <TrackingReportModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        title="Input PO Tracking"
        contextLabel="Purchase order status update"
      />
    </ModuleLayout>
  )
}