'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { MetricCard, DonutChart, BarChart } from '@/components/shared/charts'
import {
  Users,
  UserCheck,
  Clock,
  TrendUp,
  ChartLine,
  CurrencyDollar,
  Package,
  Factory,
  ShoppingCart,
} from '@phosphor-icons/react'

export function StatisticsClient() {
  const userDistribution = [
    { label: 'Active', value: 142, color: '#dc2626' },
    { label: 'Pending', value: 8, color: '#f59e0b' },
    { label: 'Inactive', value: 6, color: '#94a3b8' },
  ]

  const revenueData = [
    { label: 'Jan', value: 180, target: 200 },
    { label: 'Feb', value: 220, target: 230 },
    { label: 'Mar', value: 195, target: 210 },
    { label: 'Apr', value: 260, target: 250 },
    { label: 'May', value: 285, target: 270 },
    { label: 'Jun', value: 310, target: 300 },
  ]

  return (
    <ModuleLayout
      activeModule="admin"
      moduleTitle="Admin"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
        { label: 'Statistics' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-black mb-1">Statistics</h1>
          <p className="text-slate-500">Comprehensive system analytics and metrics</p>
        </div>

        {/* User Statistics */}
        <div>
          <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
            <Users weight="bold" className="h-5 w-5" style={{ color: '#dc2626' }} />
            User Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value="156"
              change={12}
              icon={<Users weight="bold" className="h-6 w-6" />}
              trend="up"
            />
            <MetricCard
              title="Active Users"
              value="142"
              change={8}
              icon={<UserCheck weight="bold" className="h-6 w-6" />}
              trend="up"
            />
            <MetricCard
              title="Pending Approval"
              value="8"
              change={-3}
              icon={<Clock weight="bold" className="h-6 w-6" />}
              trend="down"
            />
            <MetricCard
              title="New This Week"
              value="23"
              change={15}
              icon={<TrendUp weight="bold" className="h-6 w-6" />}
              trend="up"
            />
          </div>
        </div>

        {/* User Distribution Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-slate-200 bg-white lg:col-span-1">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-black mb-6">User Distribution</h3>
              <div className="flex justify-center mb-6">
                <DonutChart
                  value={91}
                  size={200}
                  strokeWidth={16}
                  color="#dc2626"
                  label="Active %"
                />
              </div>
              <div className="space-y-3">
                {userDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-slate-600">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-black mb-2">Revenue Trend</h3>
              <p className="text-sm text-slate-500 mb-6">Monthly performance vs target</p>
              <BarChart data={revenueData} color="#dc2626" height={220} showTarget />
            </CardContent>
          </Card>
        </div>

        {/* Module Statistics */}
        <div>
          <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
            <ChartLine weight="bold" className="h-5 w-5" style={{ color: '#dc2626' }} />
            Module Performance
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Finance */}
            <Card className="border border-slate-200 bg-white hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#dc262610' }}>
                    <CurrencyDollar weight="bold" className="h-6 w-6" style={{ color: '#dc2626' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-black">Finance</h3>
                    <p className="text-sm text-slate-500">Last 30 days</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Invoices</p>
                    <p className="text-xl font-bold text-black">847</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Payments</p>
                    <p className="text-xl font-bold text-black">1,523</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Revenue</p>
                    <p className="text-xl font-bold text-black">$2.4M</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Growth</p>
                    <p className="text-xl font-bold text-green-600">+12%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card className="border border-slate-200 bg-white hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#dc262610' }}>
                    <Package weight="bold" className="h-6 w-6" style={{ color: '#dc2626' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-black">Inventory</h3>
                    <p className="text-sm text-slate-500">Current status</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Products</p>
                    <p className="text-xl font-bold text-black">2,847</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Stock Value</p>
                    <p className="text-xl font-bold text-black">$1.2M</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Categories</p>
                    <p className="text-xl font-bold text-black">156</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Warehouses</p>
                    <p className="text-xl font-bold text-black">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Production */}
            <Card className="border border-slate-200 bg-white hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#dc262610' }}>
                    <Factory weight="bold" className="h-6 w-6" style={{ color: '#dc2626' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-black">Production</h3>
                    <p className="text-sm text-slate-500">This month</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Orders</p>
                    <p className="text-xl font-bold text-black">234</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Completed</p>
                    <p className="text-xl font-bold text-black">189</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">In Progress</p>
                    <p className="text-xl font-bold text-black">45</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Efficiency</p>
                    <p className="text-xl font-bold text-green-600">94%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purchasing */}
            <Card className="border border-slate-200 bg-white hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#dc262610' }}>
                    <ShoppingCart weight="bold" className="h-6 w-6" style={{ color: '#dc2626' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-black">Purchasing</h3>
                    <p className="text-sm text-slate-500">This month</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Purchase Orders</p>
                    <p className="text-xl font-bold text-black">567</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Vendors</p>
                    <p className="text-xl font-bold text-black">234</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Pending</p>
                    <p className="text-xl font-bold text-black">89</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">On-Time Rate</p>
                    <p className="text-xl font-bold text-green-600">96%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}
