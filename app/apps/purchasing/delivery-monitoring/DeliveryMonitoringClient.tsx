'use client'

import { TrackingReportModal } from '../_components/TrackingReportModal'
import { Fragment, useMemo, useState } from 'react'
import {
  Truck,
  Clock,
  WarningCircle,
  MagnifyingGlass,
  CheckCircle,
  Package,
  MapPin,
  ChartBar,
  DotsThreeVertical,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

const monitoringData = [
  {
    poNo: 'PO-2023-0911',
    supplier: 'Cq. Maju Jaya',
    product: 'Pump',
    qty: '12 Unit',
    releaseDate: '10 Apr 2024',
    expectedDelivery: '14 Apr 2024',
    status: 'Overdue',
    remainingDays: '-2 days',
    highlighted: true,
  },
  {
    poNo: 'PO-2023-0912',
    supplier: 'Cq. Maju Jaya',
    product: 'Pump',
    qty: '12 Unit',
    releaseDate: '10 Apr 2024',
    expectedDelivery: '14 Apr 2024',
    status: 'Due Today',
    remainingDays: '0 day',
    highlighted: false,
  },
  {
    poNo: 'PO-2023-0913',
    supplier: 'Cq. Maju Jaya',
    product: 'Pump',
    qty: '12 Unit',
    releaseDate: '10 Apr 2024',
    expectedDelivery: '14 Apr 2024',
    status: 'Due Today',
    remainingDays: '0 day',
    highlighted: false,
  },
]

const timelineSteps = [
  {
    label: 'PO Created',
    date: '06 Apr 2024',
    status: 'done',
  },
  {
    label: 'PO Approved',
    date: '07 Apr 2024',
    status: 'done',
  },
  {
    label: 'Sent to Supplier',
    date: '07 Apr 2024',
    status: 'done',
  },
  {
    label: 'In Delivery',
    date: '11 Apr 2024',
    status: 'current',
  },
  {
    label: 'Goods Receipt',
    date: 'Pending',
    status: 'pending',
  },
]

const supplierPerformance = [
  { supplier: 'Global Ind.', value: 46 },
  { supplier: 'Krakatau', value: 62 },
  { supplier: 'Maju Jaya', value: 78 },
  { supplier: 'Logistics X', value: 55 },
  { supplier: 'Indo Part', value: 69 },
]

export function DeliveryMonitoringClient() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Status')
  const [supplier, setSupplier] = useState('All Suppliers')
  const [dateRange, setDateRange] = useState('')
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)

  const filteredData = useMemo(() => {
    return monitoringData.filter((item) => {
      const matchesSearch =
        item.poNo.toLowerCase().includes(search.toLowerCase()) ||
        item.supplier.toLowerCase().includes(search.toLowerCase()) ||
        item.product.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = status === 'All Status' || item.status === status
      const matchesSupplier =
        supplier === 'All Suppliers' || item.supplier === supplier

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
        { label: 'Monitoring' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Monitoring"
          description="Monitor delivery status for all released purchase orders."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  On Track
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">8</h3>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <Truck size={26} className="text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Due Today
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">3</h3>
              </div>
              <div className="rounded-xl bg-orange-50 p-3">
                <Clock size={26} className="text-orange-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                  Overdue
                </p>
                <h3 className="mt-2 text-4xl font-bold text-red-600">2</h3>
              </div>
              <div className="rounded-xl bg-white p-3">
                <WarningCircle size={26} className="text-red-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
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
                  placeholder="PO number / supplier"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-red-300"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              >
                <option>All Status</option>
                <option>On Track</option>
                <option>Due Today</option>
                <option>Overdue</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Supplier
              </label>
              <select
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              >
                <option>All Suppliers</option>
                <option>Cq. Maju Jaya</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Date Range
              </label>
              <input
                type="date"
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              />
            </div>

            <div className="flex items-end">
              <button className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700">
                Filter
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">PO No</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Release Date</th>
                    <th className="px-4 py-3 font-semibold">
                      Expected Delivery
                    </th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Days Left</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item, index) => (
                    <Fragment key={item.poNo}>
                      <tr
                        className={
                          item.highlighted ? 'bg-red-50/70' : 'bg-white'
                        }
                      >
                        <td className="px-4 py-4 font-bold text-red-600">
                          {item.poNo}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {item.supplier}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {item.product}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{item.qty}</td>
                        <td className="px-4 py-4 text-slate-700">
                          {item.releaseDate}
                        </td>
                        <td
                          className={`px-4 py-4 font-semibold ${
                            item.status === 'Overdue'
                              ? 'text-red-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {item.expectedDelivery}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.status === 'Overdue'
                                ? 'bg-red-100 text-red-700'
                                : item.status === 'Due Today'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-4 font-bold ${
                            item.status === 'Overdue'
                              ? 'text-red-600'
                              : 'text-orange-500'
                          }`}
                        >
                          {item.remainingDays}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button className="text-slate-500 hover:text-red-600">
                            <DotsThreeVertical size={22} weight="bold" />
                          </button>
                        </td>
                      </tr>

                      {index === 0 && (
                        <tr>
                          <td colSpan={9} className="bg-white px-6 py-5">
                            <div className="rounded-xl border border-red-100 bg-white px-6 py-5">
                              <h4 className="text-sm font-bold text-slate-900">
                                Delivery Timeline: PO-2023-0892
                              </h4>

                              <div className="mt-6 grid grid-cols-5 gap-2">
                                {timelineSteps.map((step) => (
                                  <div
                                    key={step.label}
                                    className="flex flex-col items-center text-center"
                                  >
                                    <div
                                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                        step.status === 'done'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : step.status === 'current'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-slate-100 text-slate-400'
                                      }`}
                                    >
                                      {step.status === 'done' ? (
                                        <CheckCircle size={18} weight="bold" />
                                      ) : step.status === 'current' ? (
                                        <Truck size={18} weight="bold" />
                                      ) : (
                                        <Package size={18} weight="bold" />
                                      )}
                                    </div>
                                    <p
                                      className={`mt-2 text-xs font-semibold ${
                                        step.status === 'current'
                                          ? 'text-red-600'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      {step.label}
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                      {step.date}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Supplier Delivery Performance
              </h3>
              <button className="text-sm font-semibold text-red-600 hover:text-red-700">
                Detail Insight →
              </button>
            </div>

            <div className="flex h-56 items-end justify-between gap-4">
              {supplierPerformance.map((item) => (
                <div
                  key={item.supplier}
                  className="flex flex-1 flex-col items-center justify-end"
                >
                  <div
                    className="w-full max-w-[70px] rounded-t-xl bg-red-600"
                    style={{ height: `${item.value}%` }}
                  />
                  <p className="mt-3 text-center text-xs text-slate-500">
                    {item.supplier}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <h3 className="font-semibold text-slate-900">
                  Destination Warehouse Location
                </h3>
              </div>

              <div className="relative h-64 bg-slate-900 p-5 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex justify-center pt-8">
                    <div className="text-6xl text-white/90">🇮🇩</div>
                  </div>

                  <div className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900">
                    <MapPin
                      size={16}
                      weight="fill"
                      className="mr-1 inline text-red-600"
                    />
                    Main Warehouse - Karawang, ID
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTrackingModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
>
            <ChartBar size={18} weight="bold" />
            Input Tracking Report
            </button>
          </div>
        </div>
      </div>
      <TrackingReportModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        title="Input Tracking Report"
        contextLabel="Delivery status update from supplier"
      />
    </ModuleLayout>
  )
}