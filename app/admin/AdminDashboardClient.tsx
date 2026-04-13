'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserCheck,
  Clock,
  TrendUp,
  CurrencyDollar,
  Package,
  Factory,
  ShoppingCart,
  ChartLine,
  Plus,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { MetricCard, MiniChart, DonutChart, BarChart } from '@/components/shared/charts'

export function AdminDashboardClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users')
      if (response.status === 401 || response.status === 403) {
        router.push('/dashboard')
        return
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const moduleData = [
    {
      name: 'Finance',
      icon: <CurrencyDollar weight="bold" className="h-6 w-6" />,
      color: '#dc2626',
      stats: { revenue: '2.4M', invoices: 847, change: 12 },
      chartData: [65, 72, 68, 85, 92, 88, 95, 102, 98, 110, 105, 115],
    },
    {
      name: 'Inventory',
      icon: <Package weight="bold" className="h-6 w-6" />,
      color: '#dc2626',
      stats: { products: '2.8K', stock: '12.4K', change: 8 },
      chartData: [45, 52, 48, 60, 65, 58, 70, 75, 68, 80, 77, 85],
    },
    {
      name: 'Production',
      icon: <Factory weight="bold" className="h-6 w-6" />,
      color: '#dc2626',
      stats: { orders: 234, completed: 189, change: 15 },
      chartData: [35, 42, 38, 50, 55, 48, 62, 68, 60, 72, 70, 78],
    },
    {
      name: 'Purchasing',
      icon: <ShoppingCart weight="bold" className="h-6 w-6" />,
      color: '#dc2626',
      stats: { orders: 567, vendors: 234, change: 6 },
      chartData: [55, 62, 58, 70, 75, 68, 80, 85, 78, 88, 85, 92],
    },
    {
      name: 'Sales & Marketing',
      icon: <ChartLine weight="bold" className="h-6 w-6" />,
      color: '#dc2626',
      stats: { revenue: '3.8M', orders: '1.2K', change: 18 },
      chartData: [75, 82, 78, 90, 95, 88, 98, 105, 100, 110, 108, 115],
    },
  ]

  const monthlyData = [
    { label: 'Jan', value: 65, target: 70 },
    { label: 'Feb', value: 72, target: 75 },
    { label: 'Mar', value: 68, target: 70 },
    { label: 'Apr', value: 85, target: 80 },
    { label: 'May', value: 92, target: 85 },
    { label: 'Jun', value: 88, target: 90 },
    { label: 'Jul', value: 95, target: 92 },
    { label: 'Aug', value: 102, target: 95 },
    { label: 'Sep', value: 98, target: 98 },
    { label: 'Oct', value: 108, target: 100 },
    { label: 'Nov', value: 110, target: 105 },
    { label: 'Dec', value: 115, target: 110 },
  ]

  if (loading) {
    return (
      <ModuleLayout activeModule="admin" moduleTitle="Admin" breadcrumbs={[]}>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#dc2626' }}></div>
            <p className="text-slate-500">Loading dashboard...</p>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  return (
    <ModuleLayout
      activeModule="admin"
      moduleTitle="Admin"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">System analytics & performance metrics</p>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            title="System Health"
            value="98.5%"
            change={0.3}
            icon={<TrendUp weight="bold" className="h-6 w-6" />}
            trend="up"
          />
        </div>

        {/* Charts Row 1: Module Performance + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Module Performance - Wide */}
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 bg-white shadow-sm h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-black">Module Performance</h2>
                    <p className="text-sm text-slate-500">12-month trend analysis</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moduleData.map((module, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl border border-slate-200 hover:border-red-200 hover:shadow-md transition-all duration-300"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'all 0.5s ease-out'
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${module.color}10` }}
                        >
                          <div style={{ color: module.color }}>{module.icon}</div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-black text-sm">{module.name}</h3>
                          <p className="text-xs text-slate-500">
                            {module.stats.revenue || module.stats.products} · {module.stats.change > 0 ? '+' : ''}{module.stats.change}%
                          </p>
                        </div>
                      </div>
                      <MiniChart data={module.chartData} color={module.color} height={60} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Donut Chart */}
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-black mb-2">System Completion</h2>
              <p className="text-sm text-slate-500 mb-6">Overall progress</p>

              <div className="flex justify-center mb-6">
                <DonutChart
                  value={87}
                  size={200}
                  strokeWidth={16}
                  color="#dc2626"
                  label="Complete"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
                    <span className="text-slate-600">Completed</span>
                  </div>
                  <span className="font-semibold text-black">142</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-slate-600">In Progress</span>
                  </div>
                  <span className="font-semibold text-black">21</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <span className="text-slate-600">Pending</span>
                  </div>
                  <span className="font-semibold text-black">8</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart - Full Width */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-black">Revenue Trend</h2>
                <p className="text-sm text-slate-500">Monthly performance vs target</p>
              </div>
            </div>
            <BarChart data={monthlyData} color="#dc2626" height={220} showTarget />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-black mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => router.push('/admin/pending-users')}
                className="rounded-full px-6"
                style={{ backgroundColor: '#dc2626' }}
              >
                <Users weight="bold" className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-slate-200 hover:border-red-200 hover:bg-red-50"
              >
                <ChartLine weight="bold" className="h-4 w-4 mr-2" style={{ color: '#dc2626' }} />
                View Statistics
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-slate-200 hover:border-red-200 hover:bg-red-50"
              >
                <TrendUp weight="bold" className="h-4 w-4 mr-2" style={{ color: '#dc2626' }} />
                Module Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  )
}
