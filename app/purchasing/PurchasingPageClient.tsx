'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ShoppingCart,
  Users,
  Package,
  ArrowRight,
  ClipboardText,
  FileText,
  Handshake,
  CheckCircle,
  Truck,
  Scales,
  WarningCircle,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { MiniChart } from '@/components/shared/charts'

type DashboardSummary = {
  totalSuppliers: number
  totalPurchaseRequisitions: number
  totalRFQ: number
  totalNegotiations: number
  totalPurchaseOrders: number
  totalGoodsReceipts: number
  totalThreeWayMatchings: number
  totalTrackingReports: number
  pendingApprovalPO: number
  releasedPO: number
  agreedNegotiations: number
  matchedDocuments: number
}

type MonthlyPO = {
  month: string
  count: number
  value: number
}

type OverviewItem = {
  label: string
  value: number
}

type AlertItem = {
  title: string
  value: number
  description: string
}

type DashboardData = {
  summary: DashboardSummary
  monthlyPurchaseOrders: MonthlyPO[]
  poStatusOverview: OverviewItem[]
  supplierStatusOverview: OverviewItem[]
  alerts: AlertItem[]
}

type PurchasingWorkspaceRole = 'PURCHASING' | 'MANAGER_PURCHASING'

const emptySummary: DashboardSummary = {
  totalSuppliers: 0,
  totalPurchaseRequisitions: 0,
  totalRFQ: 0,
  totalNegotiations: 0,
  totalPurchaseOrders: 0,
  totalGoodsReceipts: 0,
  totalThreeWayMatchings: 0,
  totalTrackingReports: 0,
  pendingApprovalPO: 0,
  releasedPO: 0,
  agreedNegotiations: 0,
  matchedDocuments: 0,
}

const poStatusClassMap: Record<string, string> = {
  Draft: 'bg-slate-400',
  Pending: 'bg-orange-400',
  'Pending Approval': 'bg-orange-500',
  Approved: 'bg-blue-500',
  Released: 'bg-green-500',
  'Revision Required': 'bg-yellow-500',
  Completed: 'bg-emerald-500',
  Cancelled: 'bg-red-500',
  Rejected: 'bg-red-500',
}

const supplierStatusClassMap: Record<string, string> = {
  Active: 'bg-red-600',
  Inactive: 'bg-slate-400',
  Suspended: 'bg-orange-500',
  Unknown: 'bg-slate-300',
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

function getPercentage(value: number, total: number) {
  if (!total) return 0

  return Math.round((value / total) * 100)
}

function getMonthlyBarHeight(value: number, maxValue: number) {
  if (value <= 0) return 18
  if (maxValue <= 0) return 18

  return Math.max((value / maxValue) * 155, 34)
}

function getSafeKey(...values: Array<string | number | null | undefined>) {
  return values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join('-')
}

function getWorkspaceLabel(role: PurchasingWorkspaceRole) {
  if (role === 'MANAGER_PURCHASING') return 'Manager Purchasing'

  return 'Purchasing Staff'
}

export function PurchasingPageClient({
  workspaceRole = 'PURCHASING',
}: {
  workspaceRole?: PurchasingWorkspaceRole
}) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    localStorage.setItem('erp_role', workspaceRole)
  }, [workspaceRole])

  const fetchDashboard = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/dashboard')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch dashboard data')
      }

      setDashboardData(result.data)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const summary = dashboardData?.summary || emptySummary
  const monthlyPOTrend = dashboardData?.monthlyPurchaseOrders || []
  const poStatusOverview = dashboardData?.poStatusOverview || []
  const supplierStatusOverview = dashboardData?.supplierStatusOverview || []
  const alerts = dashboardData?.alerts || []

  const maxMonthlyPO = Math.max(
    ...monthlyPOTrend.map((item) => item.count || 0),
    1
  )

  const quickActions = useMemo(
    () => [
      {
        label: 'Suppliers',
        href: '/purchasing/suppliers',
        icon: Users,
        count: summary.totalSuppliers,
        description: 'Supplier product profiles',
        trend: 'Live data',
        chartData: [2, 3, 4, 5, 6, summary.totalSuppliers],
      },
      {
        label: 'Purchase Requisition',
        href: '/purchasing/purchase-requisition',
        icon: ClipboardText,
        count: summary.totalPurchaseRequisitions,
        description:
          workspaceRole === 'MANAGER_PURCHASING'
            ? 'Review PR and input approved budget'
            : 'View approved PR for purchasing process',
        trend: 'Live data',
        chartData: [1, 2, 3, 5, 7, summary.totalPurchaseRequisitions],
      },
      {
        label: 'RFQ / Sourcing',
        href: '/purchasing/rfq-sourcing',
        icon: FileText,
        count: summary.totalRFQ,
        description: 'Supplier quotations',
        trend: 'Live data',
        chartData: [1, 1, 2, 2, 3, summary.totalRFQ],
      },
      {
        label: 'Price Negotiation',
        href: '/purchasing/negotiation',
        icon: Handshake,
        count: summary.totalNegotiations,
        description: 'Price negotiations',
        trend: 'Live data',
        chartData: [1, 1, 2, 2, 3, summary.totalNegotiations],
      },
      {
        label: 'Purchase Order',
        href: '/purchasing/purchase-orders',
        icon: ShoppingCart,
        count: summary.totalPurchaseOrders,
        description:
          workspaceRole === 'MANAGER_PURCHASING'
            ? 'Review over-budget PO approval'
            : 'Monitor and process purchase orders',
        trend: 'Live data',
        chartData: [1, 2, 4, 5, 6, summary.totalPurchaseOrders],
      },
      {
        label: 'Monitoring',
        href: '/purchasing/delivery-monitoring',
        icon: Truck,
        count: summary.totalTrackingReports,
        description: 'Tracking reports',
        trend: 'Live data',
        chartData: [1, 2, 3, 4, 5, summary.totalTrackingReports],
      },
      {
        label: 'Goods Receipt',
        href: '/purchasing/goods-receipt',
        icon: Package,
        count: summary.totalGoodsReceipts,
        description: 'Received goods',
        trend: 'Live data',
        chartData: [1, 1, 2, 3, 4, summary.totalGoodsReceipts],
      },
      {
        label: 'Three-Way Matching',
        href: '/purchasing/three-way-matching',
        icon: Scales,
        count: summary.totalThreeWayMatchings,
        description: 'PO, GR, and invoice match',
        trend: 'Live data',
        chartData: [1, 1, 2, 2, 3, summary.totalThreeWayMatchings],
      },
    ],
    [summary, workspaceRole]
  )

  const totalPOStatus = poStatusOverview.reduce(
    (total, item) => total + item.value,
    0
  )

  const totalSupplierStatus = supplierStatusOverview.reduce(
    (total, item) => total + item.value,
    0
  )

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Purchasing Dashboard"
          description="Monitor purchasing activities, supplier readiness, purchase orders, delivery status, and document matching."
        />

        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-slate-600">
          Current workspace:{' '}
          <span className="font-semibold text-slate-900">
            {getWorkspaceLabel(workspaceRole)}
          </span>
          . Need to switch role?{' '}
          <Link
            href="/purchasing/role-selector"
            className="font-semibold text-red-600 hover:underline"
          >
            Open Role Selector
          </Link>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading purchasing dashboard data...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Monthly Purchase Order Trend
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Purchase order volume based on database transaction period.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    {formatNumber(summary.totalPurchaseOrders)} total PO
                  </span>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 px-5 pb-5 pt-6">
                  {monthlyPOTrend.length > 0 ? (
                    <div className="flex h-[255px] items-end gap-5">
                      {monthlyPOTrend.map((item, index) => {
                        const barHeight = getMonthlyBarHeight(
                          item.count,
                          maxMonthlyPO
                        )

                        return (
                          <div
                            key={getSafeKey('monthly-po', item.month, index)}
                            className="flex h-full flex-1 flex-col justify-end"
                          >
                            <div className="flex h-[175px] items-end justify-center">
                              <div
                                className="w-full max-w-[150px] rounded-t-2xl bg-red-600 transition hover:bg-red-700"
                                style={{ height: `${barHeight}px` }}
                                title={`${item.month}: ${item.count} PO`}
                              />
                            </div>

                            <div className="mt-4 text-center">
                              <p className="truncate text-xs font-medium text-slate-500">
                                {item.month || '-'}
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-900">
                                {formatNumber(item.count)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex h-[255px] w-full items-center justify-center text-sm text-slate-500">
                      No monthly purchase order data available.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  PO Status Overview
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Current distribution of purchase order status.
                </p>

                <div className="mt-6 space-y-4">
                  {poStatusOverview.length > 0 ? (
                    poStatusOverview.map((item, index) => {
                      const percentage = getPercentage(item.value, totalPOStatus)

                      return (
                        <div key={getSafeKey('po-status', item.label, index)}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-700">
                              {item.label || '-'}
                            </span>
                            <span className="shrink-0 font-semibold text-slate-900">
                              {formatNumber(item.value)} PO
                            </span>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                poStatusClassMap[item.label] || 'bg-red-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      No purchase order status data available.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Supplier Status Distribution
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Supplier profile composition based on active status.
                </p>

                <div className="mt-6 space-y-5">
                  {supplierStatusOverview.length > 0 ? (
                    supplierStatusOverview.map((item, index) => {
                      const percentage = getPercentage(
                        item.value,
                        totalSupplierStatus
                      )

                      return (
                        <div
                          key={getSafeKey('supplier-status', item.label, index)}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-700">
                              {item.label || '-'}
                            </span>
                            <span className="shrink-0 font-semibold text-slate-900">
                              {formatNumber(item.value)} suppliers
                            </span>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                supplierStatusClassMap[item.label] ||
                                'bg-red-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      No supplier status data available.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Purchasing Alerts
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Items that need purchasing team attention.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    {alerts.length} alerts
                  </span>
                </div>

                <div className="space-y-3">
                  {alerts.length > 0 ? (
                    alerts.map((alert, index) => {
                      const AlertIcon =
                        alert.value > 0 ? WarningCircle : CheckCircle

                      return (
                        <div
                          key={getSafeKey(
                            'alert',
                            alert.title,
                            alert.description,
                            index
                          )}
                          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                        >
                          <div className="rounded-lg bg-white p-2 text-red-600">
                            <AlertIcon size={20} weight="bold" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatNumber(alert.value)} {alert.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {alert.description}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      No purchasing alerts available.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {quickActions.map((action) => (
                <Card
                  key={action.href}
                  className="border border-slate-200 bg-white transition-all hover:shadow-lg"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div
                        className="rounded-xl p-3"
                        style={{ backgroundColor: '#dc262610' }}
                      >
                        <action.icon
                          weight="bold"
                          size={24}
                          style={{ color: '#dc2626' }}
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-black">
                          {action.label}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {action.description}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-3xl font-bold text-black">
                          {formatNumber(action.count)}
                        </span>

                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          {action.trend}
                        </span>
                      </div>
                    </div>

                    <MiniChart
                      data={action.chartData}
                      color="#dc2626"
                      height={80}
                    />

                    <Link
                      href={action.href}
                      className="mt-4 flex w-full items-center justify-center rounded-lg border border-slate-200 py-2 text-sm font-medium transition-all hover:border-red-200 hover:bg-red-50"
                      style={{ color: '#dc2626' }}
                    >
                      View Details
                      <ArrowRight weight="bold" className="ml-2 h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </ModuleLayout>
  )
}