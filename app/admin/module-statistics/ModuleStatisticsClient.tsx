'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import {
  CurrencyDollar,
  Package,
  Factory,
  ShoppingCart,
  TrendUp,
} from '@phosphor-icons/react'
import { ModuleHeader } from '@/components/shared'

const moduleConfig = {
  finance: {
    name: 'Finance',
    icon: <CurrencyDollar weight="bold" className="h-6 w-6" />,
    color: '#dc2626',
    stats: [
      { label: 'Total Invoices', value: '847', change: 12 },
      { label: 'Payments Processed', value: '1,523', change: 8 },
      { label: 'Revenue', value: '$2.4M', change: 15 },
      { label: 'Pending', value: '45', change: -5 },
      { label: 'Reports Generated', value: '234', change: 20 },
    ],
  },
  inventory: {
    name: 'Inventory',
    icon: <Package weight="bold" className="h-6 w-6" />,
    color: '#dc2626',
    stats: [
      { label: 'Total Products', value: '2,847', change: 5 },
      { label: 'Stock Value', value: '$1.2M', change: 10 },
      { label: 'Categories', value: '156', change: 2 },
      { label: 'Warehouses', value: '12', change: 0 },
      { label: 'Stock Movements', value: '1,234', change: 18 },
    ],
  },
  production: {
    name: 'Production',
    icon: <Factory weight="bold" className="h-6 w-6" />,
    color: '#dc2626',
    stats: [
      { label: 'Production Orders', value: '234', change: 8 },
      { label: 'Completed', value: '189', change: 12 },
      { label: 'In Progress', value: '45', change: -3 },
      { label: 'BOMs', value: '156', change: 5 },
      { label: 'Planning Efficiency', value: '94%', change: 2 },
    ],
  },
  purchasing: {
    name: 'Purchasing',
    icon: <ShoppingCart weight="bold" className="h-6 w-6" />,
    color: '#dc2626',
    stats: [
      { label: 'Purchase Orders', value: '567', change: 10 },
      { label: 'Vendors', value: '234', change: 3 },
      { label: 'Pending Orders', value: '89', change: -8 },
      { label: 'Requests', value: '124', change: 15 },
      { label: 'On-Time Delivery', value: '96%', change: 4 },
    ],
  },
  snm: {
    name: 'Sales & Marketing',
    icon: <TrendUp weight="bold" className="h-6 w-6" />,
    color: '#dc2626',
    stats: [
      { label: 'Sales Orders', value: '1,234', change: 18 },
      { label: 'Customers', value: '8,567', change: 12 },
      { label: 'Revenue', value: '$3.8M', change: 22 },
      { label: 'Marketing Campaigns', value: '45', change: 8 },
      { label: 'Conversion Rate', value: '3.2%', change: 5 },
    ],
  },
}

export function ModuleStatisticsClient() {
  const searchParams = useSearchParams()
  const modItem = searchParams.get('module') || 'finance'
  const config = moduleConfig[modItem as keyof typeof moduleConfig] || moduleConfig.finance

  return (
    <ModuleLayout
      activeModule="admin"
      moduleTitle="Admin"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
        { label: 'Module Statistics' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader title={`${config.name} Statistics`} />

        {/* Module Overview */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="p-4 rounded-xl"
                style={{ backgroundColor: `${config.color}10` }}
              >
                <div style={{ color: config.color }}>
                  {config.icon}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">{config.name}</h2>
                <p className="text-slate-500">Detailed performance metrics and analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {config.stats.map((stat, index) => (
            <Card key={index} className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      stat.change >= 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {stat.change >= 0 ? '+' : ''}
                    {stat.change}%
                  </span>
                </div>
                <p className="text-3xl font-bold text-black">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-2">vs last period</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Module Selector */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-black mb-4">View Other Modules</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(moduleConfig).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => window.history.pushState({}, '', `/admin/module-statistics?module=${key}`)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    modItem === key
                      ? 'text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  style={modItem === key ? { backgroundColor: '#dc2626' } : {}}
                >
                  {value.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  )
}
