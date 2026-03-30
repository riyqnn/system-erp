'use client'

import Link from 'next/link'
import { TrendUp, Users, Megaphone, ChartLineUp, ClipboardText } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'

const quickActions = [
  { label: 'Sales Orders', href: '/apps/snm/sales', icon: ClipboardText, count: '1,234', description: 'Customer orders' },
  { label: 'Customers', href: '/apps/snm/customers', icon: Users, count: '8,567', description: 'Customer database' },
  { label: 'Marketing', href: '/apps/snm/marketing', icon: Megaphone, count: '45', description: 'Marketing campaigns' },
]

export default function SnmPage() {
  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing' },
      ]}
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Sales & Marketing Overview</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-sm transition-all">
                <CardContent className="p-6">
                  <action.icon weight="bold" size={32} className="mb-3" style={{ color: '#dc2626' }} />
                  <h3 className="font-semibold text-slate-900 mb-1">{action.label}</h3>
                  <p className="text-2xl font-semibold text-slate-900 mb-1">{action.count}</p>
                  <p className="text-sm text-slate-500">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </ModuleLayout>
  )
}
