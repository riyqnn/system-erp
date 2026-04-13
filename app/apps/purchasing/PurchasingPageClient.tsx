'use client'

import Link from 'next/link'
import { ShoppingCart, Users, Package, ArrowRight } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { MiniChart } from '@/components/shared/charts'

const quickActions = [
  {
    label: 'Purchase Orders',
    href: '/apps/purchasing/orders',
    icon: ShoppingCart,
    count: '567',
    description: 'Active POs',
    trend: '+10%',
    chartData: [50, 58, 65, 72, 80, 75, 85, 92, 88, 98, 95, 105]
  },
  {
    label: 'Vendors',
    href: '/apps/purchasing/vendors',
    icon: Users,
    count: '234',
    description: 'Supplier management',
    trend: '+4%',
    chartData: [40, 48, 55, 62, 70, 68, 75, 82, 78, 88, 85, 92]
  },
  {
    label: 'Requests',
    href: '/apps/purchasing/requests',
    icon: Package,
    count: '89',
    description: 'Purchase requests',
    trend: '+7%',
    chartData: [30, 38, 45, 52, 58, 55, 65, 72, 68, 78, 75, 82]
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
        <ModuleHeader title="Purchasing Overview" />

        {/* Stats Cards with Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
