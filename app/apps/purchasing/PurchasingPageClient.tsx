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
  Receipt,
  Scales,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { MiniChart } from '@/components/shared/charts'

const quickActions = [
  {
    label: 'Supplier',
    href: '/apps/purchasing/supplier',
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
    label: 'Price Negosiation',
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
    label: 'Approval PO',
    href: '/apps/purchasing/approval-po',
    icon: CheckCircle,
    count: '42',
    description: 'Pending approvals',
    trend: '+3%',
    chartData: [18, 24, 31, 36, 42, 39, 45, 50, 47, 53, 51, 58],
  },
  {
    label: 'Monitoring Pengiriman',
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
        <ModuleHeader title="Purchasing Dashboard" />

        {/* Stats Cards with Charts */}
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