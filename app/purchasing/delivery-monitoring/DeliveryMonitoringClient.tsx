'use client'

import { TrackingReportModal } from '../_components/TrackingReportModal'
import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Truck,
  Clock,
  WarningCircle,
  MagnifyingGlass,
  CheckCircle,
  Package,
  MapPin,
  ChartBar,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type TrackingReport = {
  id: string
  trackingNo: string
  entityType: string
  entityId: string | null
  trackingStatus: string
  manualTrackingStatus: string | null
  estimatedArrivalDate: string | null
  supplierNotes: string
  reportedBy: string
  reportedAt: string | null

  poNo: string
  poDate: string | null
  poReleaseDate: string | null
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
  qty: number
  receivedQty: number
  unit: string

  receiptId: string | null
  receiptDate: string | null
  hasGoodsReceipt: boolean
}

type MonitoringStatus = 'On Track' | 'Due Today' | 'Overdue'
type TimelineStatus = 'done' | 'current' | 'warning' | 'pending'

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

function getDateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function getDaysLeft(dateValue?: string | null) {
  if (!dateValue) return null

  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) return null

  const today = getDateOnly(new Date())
  const targetDate = getDateOnly(parsedDate)
  const diffTime = targetDate.getTime() - today.getTime()

  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function normalizeStatus(value?: string | null) {
  return String(value || '').toUpperCase()
}

function formatTrackingStatus(value?: string | null) {
  const status = normalizeStatus(value)

  if (status === 'SENT_TO_SUPPLIER') return 'Sent to Supplier'
  if (status === 'IN_PROCESS') return 'In Process'
  if (status === 'IN_DELIVERY') return 'In Delivery'
  if (status === 'DELAYED') return 'Delayed'
  if (status === 'DELIVERED') return 'Delivered'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'CANCELLED') return 'Cancelled'

  return 'Pending'
}

function getMonitoringStatus(item: TrackingReport): MonitoringStatus {
  const trackingStatus = normalizeStatus(item.trackingStatus)
  const deliveryDate = item.estimatedArrivalDate || item.expectedDeliveryDate
  const daysLeft = getDaysLeft(deliveryDate)

  if (trackingStatus === 'DELAYED') return 'Overdue'
  if (daysLeft !== null && daysLeft < 0 && trackingStatus !== 'COMPLETED') {
    return 'Overdue'
  }

  if (daysLeft === 0 && trackingStatus !== 'COMPLETED') return 'Due Today'

  return 'On Track'
}

function getRemainingDays(item: TrackingReport) {
  const trackingStatus = normalizeStatus(item.trackingStatus)

  if (trackingStatus === 'COMPLETED') return '-'

  const deliveryDate = item.estimatedArrivalDate || item.expectedDeliveryDate
  const daysLeft = getDaysLeft(deliveryDate)

  if (daysLeft === null) return '-'
  if (daysLeft === 0) return '0 day'
  if (daysLeft === 1) return '1 day'

  return `${daysLeft} days`
}

function getStatusClass(status: MonitoringStatus) {
  if (status === 'Overdue') return 'bg-red-100 text-red-700'
  if (status === 'Due Today') return 'bg-yellow-100 text-yellow-700'

  return 'bg-emerald-100 text-emerald-700'
}

function getTimelineSteps(item: TrackingReport) {
  const poStatus = normalizeStatus(item.poStatus)
  const trackingStatus = normalizeStatus(item.trackingStatus)
  const manualTrackingStatus = normalizeStatus(item.manualTrackingStatus)

  const isReleased =
    Boolean(item.poReleaseDate) || ['RELEASED', 'COMPLETED'].includes(poStatus)

  const hasManualTracking = Boolean(item.manualTrackingStatus)
  const hasGoodsReceipt =
    Boolean(item.receiptDate) ||
    item.hasGoodsReceipt ||
    trackingStatus === 'COMPLETED'

  const inDeliveryIsActive =
    ['IN_PROCESS', 'IN_DELIVERY', 'DELAYED', 'DELIVERED'].includes(
      manualTrackingStatus
    ) || hasGoodsReceipt

  const inDeliveryStatus: TimelineStatus =
    trackingStatus === 'DELAYED'
      ? 'warning'
      : ['IN_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(trackingStatus) ||
          hasGoodsReceipt
        ? 'done'
        : inDeliveryIsActive
          ? 'current'
          : 'pending'

  return [
    {
      label: 'PO Created',
      date: formatDate(item.poDate),
      status: item.poDate ? 'done' : 'pending',
    },
    {
      label: 'PO Released',
      date: item.poReleaseDate ? formatDate(item.poReleaseDate) : '-',
      status: isReleased ? 'done' : 'pending',
    },
    {
      label: 'Sent to Supplier',
      date: isReleased ? formatDate(item.poReleaseDate || item.poDate) : '-',
      status: isReleased ? 'done' : 'pending',
    },
    {
      label: 'In Delivery',
      date: hasManualTracking ? formatDate(item.reportedAt) : 'Waiting update',
      status: inDeliveryStatus,
    },
    {
      label: 'Goods Receipt',
      date: hasGoodsReceipt ? formatDate(item.receiptDate) : 'Pending',
      status: hasGoodsReceipt ? 'done' : 'pending',
    },
  ] as Array<{
    label: string
    date: string
    status: TimelineStatus
  }>
}

export function DeliveryMonitoringClient() {
  const [trackingReports, setTrackingReports] = useState<TrackingReport[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Status')
  const [supplier, setSupplier] = useState('All Suppliers')
  const [dateRange, setDateRange] = useState('')
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [selectedTracking, setSelectedTracking] =
    useState<TrackingReport | null>(null)
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchTrackingReports = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/tracking-reports')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch tracking reports')
      }

      const deliveryData = (result.data || []).filter(
        (item: TrackingReport) =>
          (item.entityType === 'DELIVERY' ||
            item.entityType === 'PURCHASE_ORDER') &&
          item.poNo !== '-'
      )

      setTrackingReports(deliveryData)

      if (!expandedPoId && deliveryData.length > 0) {
        setExpandedPoId(deliveryData[0].id)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to fetch tracking reports'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrackingReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const supplierOptions = useMemo(() => {
    const suppliers = trackingReports.map((item) => item.supplierName)

    return ['All Suppliers', ...Array.from(new Set(suppliers))]
  }, [trackingReports])

  const filteredData = useMemo(() => {
    return trackingReports.filter((item) => {
      const monitoringStatus = getMonitoringStatus(item)
      const deliveryDate = item.estimatedArrivalDate || item.expectedDeliveryDate

      const matchesSearch =
        item.poNo.toLowerCase().includes(search.toLowerCase()) ||
        item.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        item.productName.toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        status === 'All Status' || monitoringStatus === status

      const matchesSupplier =
        supplier === 'All Suppliers' || item.supplierName === supplier

      const matchesDate = !dateRange || deliveryDate?.slice(0, 10) === dateRange

      return matchesSearch && matchesStatus && matchesSupplier && matchesDate
    })
  }, [trackingReports, search, status, supplier, dateRange])

  const onTrackCount = trackingReports.filter(
    (item) => getMonitoringStatus(item) === 'On Track'
  ).length

  const dueTodayCount = trackingReports.filter(
    (item) => getMonitoringStatus(item) === 'Due Today'
  ).length

  const overdueCount = trackingReports.filter(
    (item) => getMonitoringStatus(item) === 'Overdue'
  ).length

  const supplierPerformance = useMemo(() => {
    const supplierMap = new Map<string, { total: number; onTrack: number }>()

    trackingReports.forEach((item) => {
      const current = supplierMap.get(item.supplierName) || {
        total: 0,
        onTrack: 0,
      }

      current.total += 1

      if (getMonitoringStatus(item) === 'On Track') {
        current.onTrack += 1
      }

      supplierMap.set(item.supplierName, current)
    })

    return Array.from(supplierMap.entries()).map(([supplierName, value]) => ({
      supplier: supplierName,
      value:
        value.total === 0
          ? 0
          : Math.round((value.onTrack / value.total) * 100),
    }))
  }, [trackingReports])

  const openTrackingModal = (item: TrackingReport) => {
    setSelectedTracking(item)
    setIsTrackingModalOpen(true)
    setExpandedPoId(item.id)
  }

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/purchasing' },
        { label: 'Monitoring' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Monitoring"
          description="Monitor delivery status for all released purchase orders."
        />

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  On Track
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {onTrackCount}
                </h3>
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
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {dueTodayCount}
                </h3>
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
                <h3 className="mt-2 text-4xl font-bold text-red-600">
                  {overdueCount}
                </h3>
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
                {supplierOptions.map((supplierOption) => (
                  <option key={supplierOption}>{supplierOption}</option>
                ))}
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
              <button
                type="button"
                className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
              >
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
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        Loading delivery monitoring data...
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      const monitoringStatus = getMonitoringStatus(item)
                      const remainingDays = getRemainingDays(item)
                      const deliveryDate =
                        item.estimatedArrivalDate || item.expectedDeliveryDate
                      const timelineSteps = getTimelineSteps(item)
                      const isExpanded = expandedPoId === item.id

                      return (
                        <Fragment key={item.id}>
                          <tr
                            className={
                              monitoringStatus === 'Overdue'
                                ? 'bg-red-50/70'
                                : 'bg-white'
                            }
                          >
                            <td className="px-4 py-4 font-bold text-red-600">
                              {item.poNo}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {item.supplierName}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {item.productName}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {formatNumber(item.qty)} {item.unit}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {formatDate(item.poReleaseDate)}
                            </td>
                            <td
                              className={`px-4 py-4 font-semibold ${
                                monitoringStatus === 'Overdue'
                                  ? 'text-red-600'
                                  : 'text-slate-700'
                              }`}
                            >
                              {formatDate(deliveryDate)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                    monitoringStatus
                                  )}`}
                                >
                                  {monitoringStatus}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {formatTrackingStatus(item.trackingStatus)}
                                </span>
                              </div>
                            </td>
                            <td
                              className={`px-4 py-4 font-bold ${
                                monitoringStatus === 'Overdue'
                                  ? 'text-red-600'
                                  : 'text-orange-500'
                              }`}
                            >
                              {remainingDays}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedPoId(item.id)}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  View Timeline
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTrackingModal(item)}
                                  disabled={item.hasGoodsReceipt}
                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  Input Tracking
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="bg-white px-6 py-5">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                                  <div className="mb-4 flex items-center gap-2">
                                    <CheckCircle
                                      size={18}
                                      className="text-emerald-600"
                                    />
                                    <h4 className="font-semibold text-slate-900">
                                      Delivery Timeline
                                    </h4>
                                  </div>

                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                    {timelineSteps.map((step) => (
                                      <div key={step.label} className="relative">
                                        <div
                                          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                                            step.status === 'done'
                                              ? 'bg-emerald-500 text-white'
                                              : step.status === 'current'
                                                ? 'bg-red-600 text-white'
                                                : step.status === 'warning'
                                                  ? 'bg-red-500 text-white'
                                                  : 'bg-slate-200 text-slate-500'
                                          }`}
                                        >
                                          {step.status === 'done' ? '✓' : '•'}
                                        </div>
                                        <p className="mt-2 text-xs font-semibold text-slate-800">
                                          {step.label}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                          {step.date}
                                        </p>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-600">
                                    <span className="font-semibold text-slate-800">
                                      Supplier Notes:
                                    </span>{' '}
                                    {item.supplierNotes}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })
                  )}

                  {!isLoading && filteredData.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No delivery monitoring data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ChartBar size={20} className="text-red-600" />
              <h3 className="font-semibold text-slate-900">
                Supplier Delivery Performance
              </h3>
            </div>

            <div className="space-y-4">
              {supplierPerformance.map((item) => (
                <div key={item.supplier}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {item.supplier}
                    </span>
                    <span className="text-slate-500">{item.value}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-red-600"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}

              {!isLoading && supplierPerformance.length === 0 && (
                <p className="text-sm text-slate-500">
                  No supplier performance data available.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-red-600" />
              <h3 className="font-semibold text-slate-900">
                Destination Warehouse
              </h3>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <Package size={26} className="text-red-600" />
              <p className="mt-4 text-sm font-semibold text-slate-900">
                Main Raw Material Warehouse
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cikupa Manufacturing Plant, Tangerang
              </p>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Delivery monitoring is connected with purchase orders, manual
              supplier tracking updates, and goods receipt records.
            </p>
          </div>
        </div>
      </div>

      <TrackingReportModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        onSaved={fetchTrackingReports}
        trackingContext={
          selectedTracking
            ? {
                poNo: selectedTracking.poNo,
                supplierName: selectedTracking.supplierName,
                productName: selectedTracking.productName,
                qty: selectedTracking.qty,
                unit: selectedTracking.unit,
              }
            : null
        }
      />
    </ModuleLayout>
  )
}