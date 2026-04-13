'use client'

import Link from 'next/link'
import { Package, Tag, ArrowsLeftRight, Warehouse, ArrowRight } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { MiniChart } from '@/components/shared/charts'

const quickActions = [
  {
    label: 'Products',
    href: '/apps/inventory/products',
    icon: Package,
    count: '2,847',
    description: 'Manage product catalog',
    trend: '+6%',
    chartData: [45, 52, 58, 65, 72, 68, 78, 85, 80, 90, 88, 95]
  },
  {
    label: 'Categories',
    href: '/apps/inventory/categories',
    icon: Tag,
    count: '156',
    description: 'Product categories',
    trend: '+3%',
    chartData: [20, 25, 30, 35, 40, 38, 45, 50, 48, 55, 52, 58]
  },
  {
    label: 'Stock Operations',
    href: '/apps/inventory/stock',
    icon: ArrowsLeftRight,
    count: '1,234',
    description: 'Stock movements',
    trend: '+10%',
    chartData: [55, 62, 68, 75, 82, 78, 88, 95, 90, 100, 98, 105]
  },
  {
    label: 'Warehouses',
    href: '/apps/inventory/warehouses',
    icon: Warehouse,
    count: '12',
    description: 'Warehouse locations',
    trend: '0%',
    chartData: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]
  },
]

export function InventoryPageClient() {
  return (
    <ModuleLayout
      activeModule="inventory"
      moduleTitle="Inventory"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Inventory' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader title="Inventory Overview" />

        {/* Stats Cards with Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Card key={action.href} className="border border-slate-200 bg-white hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: '#dc262610' }}
                  >
                    <action.icon weight="bold" size={24} style={{ color: '#dc2626' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-black">{action.label}</h3>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-black">{action.count}</span>
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
