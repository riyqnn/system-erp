'use client'

import Link from 'next/link'
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
  Clock,
  WarningCircle,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { MiniChart } from '@/components/shared/charts'

const quickActions = [
  {
    label: 'Suppliers',
    href: '/apps/purchasing/suppliers',
    icon: Users,
    count: '18',
    description: 'Active suppliers',
    trend: '+4%',
    chartData: [40, 48, 55, 62, 70, 68, 75, 82, 78, 88, 85, 92],
  },
  {
    label: 'Purchase Requisition',
    href: '/apps/purchasing/purchase-requisition',
    icon: ClipboardText,
    count: '89',
    description: 'Purchase requests',
    trend: '+7%',
    chartData: [30, 38, 45, 52, 58, 55, 65, 72, 68, 78, 75, 82],
  },
  {
    label: 'RFQ / Sourcing',
    href: '/apps/purchasing/rfq-sourcing',
    icon: FileText,
    count: '24',
    description: 'Open quotations',
    trend: '+6%',
    chartData: [20, 28, 35, 42, 48, 45, 55, 62, 59, 66, 64, 72],
  },
  {
    label: 'Price Negotiation',
    href: '/apps/purchasing/negotiation',
    icon: Handshake,
    count: '31',
    description: 'Price negotiations',
    trend: '+5%',
    chartData: [25, 32, 38, 44, 51, 49, 56, 63, 60, 68, 66, 74],
  },
  {
    label: 'Purchase Order',
    href: '/apps/purchasing/purchase-orders',
    icon: ShoppingCart,
    count: '567',
    description: 'Active POs',
    trend: '+10%',
    chartData: [50, 58, 65, 72, 80, 75, 85, 92, 88, 98, 95, 105],
  },
  {
    label: 'Monitoring',
    href: '/apps/purchasing/delivery-monitoring',
    icon: Truck,
    count: '76',
    description: 'Delivery monitoring',
    trend: '+8%',
    chartData: [35, 42, 50, 56, 63, 60, 68, 75, 72, 80, 78, 86],
  },
  {
    label: 'Goods Receipt',
    href: '/apps/purchasing/goods-receipt',
    icon: Package,
    count: '64',
    description: 'Received goods',
    trend: '+6%',
    chartData: [28, 36, 43, 50, 57, 54, 61, 69, 66, 73, 71, 79],
  },
  {
    label: 'Three-Way Matching',
    href: '/apps/purchasing/three-way-matching',
    icon: Scales,
    count: '38',
    description: 'PO, GR, and invoice match',
    trend: '+5%',
    chartData: [22, 30, 37, 43, 49, 46, 54, 61, 58, 65, 63, 70],
  },
]

const poStatusOverview = [
  {
    label: 'Draft',
    value: 4,
    percentage: 17,
    className: 'bg-slate-400',
  },
  {
    label: 'Pending Approval',
    value: 8,
    percentage: 33,
    className: 'bg-orange-500',
  },
  {
    label: 'Approved',
    value: 6,
    percentage: 25,
    className: 'bg-blue-500',
  },
  {
    label: 'Released',
    value: 6,
    percentage: 25,
    className: 'bg-green-500',
  },
]

const monthlyPOTrend = [
  { month: 'Jan', value: 18 },
  { month: 'Feb', value: 22 },
  { month: 'Mar', value: 25 },
  { month: 'Apr', value: 31 },
  { month: 'May', value: 28 },
  { month: 'Jun', value: 36 },
]

const supplierCategories = [
  { label: 'Raw Material', value: 12, width: '70%' },
  { label: 'Packaging', value: 8, width: '48%' },
  { label: 'Logistics', value: 5, width: '30%' },
  { label: 'Maintenance', value: 3, width: '18%' },
]

const alerts = [
  {
    title: '2 purchase orders are overdue',
    description: 'Follow up supplier delivery confirmation.',
    icon: WarningCircle,
  },
  {
    title: '8 POs pending approval',
    description: 'Waiting for manager approval before release.',
    icon: Clock,
  },
  {
    title: '3 RFQs waiting for supplier response',
    description: 'Monitor quotation deadline this week.',
    icon: FileText,
  },
]

export function PurchasingPageClient() {
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Monthly Purchase Order Trend
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Overview of purchase order volume during the last six months.
                </p>
              </div>

              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                +12% this month
              </span>
            </div>

            <div className="mt-8 flex h-56 items-end gap-5">
              {monthlyPOTrend.map((item) => (
                <div
                  key={item.month}
                  className="flex flex-1 flex-col items-center justify-end"
                >
                  <div
                    className="w-full rounded-t-xl bg-red-600 transition hover:bg-red-700"
                    style={{ height: `${item.value * 4}px` }}
                  />
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {item.month}
                  </p>
                </div>
              ))}
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
              {poStatusOverview.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {item.label}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.value} PO
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.className}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Supplier Category Distribution
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Supplier composition based on purchasing category.
            </p>

            <div className="mt-6 space-y-5">
              {supplierCategories.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {item.label}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.value} suppliers
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-red-600"
                      style={{ width: item.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Purchasing Alerts
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Items that need purchasing team attention.
                </p>
              </div>

              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                3 alerts
              </span>
            </div>

            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="rounded-lg bg-white p-2 text-red-600">
                    <alert.icon size={20} weight="bold" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {alert.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {alert.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Card
              key={action.href}
              className="border border-slate-200 bg-white hover:shadow-lg transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-3 rounded-xl"
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-black">
                      {action.count}
                    </span>

                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {action.trend}
                    </span>
                  </div>
                </div>

                <MiniChart data={action.chartData} color="#dc2626" height={80} />

                <Link
                  href={action.href}
                  className="mt-4 flex items-center justify-center w-full py-2 text-sm font-medium rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-all"
                  style={{ color: '#dc2626' }}
                >
                  View Details
                  <ArrowRight weight="bold" className="h-4 w-4 ml-2" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ModuleLayout>
  )
}