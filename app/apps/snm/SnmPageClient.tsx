'use client'

import Link from 'next/link'
import { ClipboardText, Users, Megaphone, ArrowRight } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { MiniChart } from '@/components/shared/charts'

const quickActions = [
  {
    label: 'Sales Orders',
    href: '/apps/snm/sales',
    icon: ClipboardText,
    count: '1,234',
    description: 'Customer orders',
    trend: '+18%',
    chartData: [75, 82, 88, 95, 102, 98, 110, 118, 112, 125, 120, 130]
  },
  {
    label: 'Customers',
    href: '/apps/snm/customers',
    icon: Users,
    count: '8,567',
    description: 'Customer database',
    trend: '+12%',
    chartData: [55, 62, 68, 75, 82, 78, 85, 92, 88, 95, 92, 100]
  },
  {
    label: 'Marketing',
    href: '/apps/snm/marketing',
    icon: Megaphone,
    count: '45',
    description: 'Marketing campaigns',
    trend: '+8%',
    chartData: [35, 42, 48, 55, 50, 58, 65, 72, 68, 75, 72, 80]
  },
]

export function SnmPageClient() {
  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader title="Sales & Marketing Overview" />

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
