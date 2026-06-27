'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardText, Users, Megaphone, ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { AreaChart, DonutChart, MultiBarChart } from '@/components/shared/charts'
import { createClient } from '@/lib/supabase/client'
import { rupiah, fmtDateShort, SO_STATUS_BADGE, SO_STATUS_LABEL } from '@/lib/snm'

const BRAND = {
  primary: 'hsl(0, 84%, 60%)',
  primaryForeground: 'hsl(210, 40%, 98%)',
  background: 'hsl(0, 0%, 98%)',
  surface: 'hsl(0, 0%, 100%)',
  surfaceElevated: 'hsl(210, 40%, 99%)',
  textPrimary: 'hsl(222.2, 84%, 4.9%)',
  textSecondary: 'hsl(215.4, 16.3%, 46.9%)',
  textMuted: 'hsl(215, 20%, 65%)',
  success: 'hsl(142, 76%, 36%)',
  successBg: 'hsl(142, 76%, 96%)',
  warning: 'hsl(38, 92%, 50%)',
  warningBg: 'hsl(38, 92%, 96%)',
  destructive: 'hsl(0, 84.2%, 60.2%)',
  destructiveBg: 'hsl(0, 84.2%, 96%)',
  border: 'hsl(210, 40%, 92%)',
} as const

const CHART_COLORS = {
  primary: '#EE4444',
  secondary: '#10B981',
  tertiary: '#3B82F6',
  quaternary: '#F97316',
  quinary: '#8B5CF6',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: CHART_COLORS.quaternary,
  WAITING_APPROVAL: CHART_COLORS.quinary,
  APPROVED: CHART_COLORS.secondary,
  REJECTED_CREDIT: CHART_COLORS.primary,
  CANCELLED: '#94A3B8',
}

const SO_STATUS_KEYS = Object.keys(STATUS_COLORS)

function useNumberRoll(finalValue: number, duration = 1500) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setDisplayValue(Math.floor(easeOutQuart * finalValue))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [finalValue, duration])

  return displayValue
}

function formatNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function monthlyCounts(dates: string[], months = 12): number[] {
  const now = new Date()
  const buckets = new Array(months).fill(0)
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${d.getMonth()}`)
  }
  dates.forEach((s) => {
    const d = new Date(s)
    const k = `${d.getFullYear()}-${d.getMonth()}`
    const idx = keys.indexOf(k)
    if (idx >= 0) buckets[idx]++
  })
  return buckets
}

function cumulative(arr: number[]): number[] {
  let sum = 0
  return arr.map((v) => (sum += v))
}

function trendPctNum(series: number[]): number {
  if (series.length < 2) return 0
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  if (prev === 0) return last > 0 ? 100 : 0
  return Math.round(((last - prev) / prev) * 100)
}

function monthlyTrend(
  orders: { created_at: string; grand_total: number }[],
  months = 12,
) {
  const now = new Date()
  const result = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const monthOrders = orders.filter((o) => {
      const od = new Date(o.created_at)
      return `${od.getFullYear()}-${od.getMonth()}` === key
    })
    result.push({
      label: d.toLocaleDateString('id-ID', { month: 'short' }),
      value: monthOrders.length,
      secondary: Math.round(monthOrders.reduce((s, o) => s + (o.grand_total || 0), 0) / 1_000_000),
    })
  }
  return result
}

function monthlyByStatus(
  orders: { created_at: string; approval_status: string }[],
  months = 6,
) {
  const now = new Date()
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const monthOrders = orders.filter((o) => {
      const od = new Date(o.created_at)
      return `${od.getFullYear()}-${od.getMonth()}` === key
    })
    return {
      category: d.toLocaleDateString('id-ID', { month: 'short' }),
      values: SO_STATUS_KEYS.map((s) => ({
        label: SO_STATUS_LABEL[s] || s,
        value: monthOrders.filter((o) => o.approval_status === s).length,
        color: STATUS_COLORS[s],
      })),
    }
  })
}

function GlassCard({
  children,
  className = '',
  hover = false,
  onMouseEnter,
  onMouseLeave,
}: {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  return (
    <div
      className={`
        bg-white/90 backdrop-blur-xl
        border border-white/70
        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]
        rounded-3xl overflow-hidden
        ${hover ? 'hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5' : ''}
        transition-all duration-500 ease-out
        ${className}
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )
}

const kpiColorConfig = {
  red: {
    bg: 'bg-gradient-to-br from-red-50/95 to-red-50/50',
    icon: 'text-red-600',
    border: 'border-red-100/60',
    glow: 'hover:shadow-[0_0_32px_rgba(238,68,68,0.15)]',
    accent: CHART_COLORS.primary,
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-50/95 to-emerald-50/50',
    icon: 'text-emerald-600',
    border: 'border-emerald-100/60',
    glow: 'hover:shadow-[0_0_32px_rgba(16,185,129,0.15)]',
    accent: CHART_COLORS.secondary,
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50/95 to-orange-50/50',
    icon: 'text-orange-500',
    border: 'border-orange-100/60',
    glow: 'hover:shadow-[0_0_32px_rgba(249,115,22,0.15)]',
    accent: CHART_COLORS.quaternary,
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50/95 to-blue-50/50',
    icon: 'text-blue-600',
    border: 'border-blue-100/60',
    glow: 'hover:shadow-[0_0_32px_rgba(59,130,246,0.15)]',
    accent: CHART_COLORS.tertiary,
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50/95 to-purple-50/50',
    icon: 'text-purple-600',
    border: 'border-purple-100/60',
    glow: 'hover:shadow-[0_0_32px_rgba(139,92,246,0.15)]',
    accent: CHART_COLORS.quinary,
  },
}

interface PremiumKPICardProps {
  title: string
  value: number | string
  formattedValue?: string
  change?: number | null
  changeLabel?: string
  icon: React.ComponentType<{ className?: string }>
  color: 'red' | 'green' | 'orange' | 'blue' | 'purple'
  href?: string
  secondaryValue?: string
  secondaryLabel?: string
  trendData?: number[]
  index?: number
}

function PremiumKPICard({
  title,
  value,
  formattedValue,
  change,
  changeLabel,
  icon: Icon,
  color,
  href,
  secondaryValue,
  secondaryLabel,
  trendData,
  index = 0,
}: PremiumKPICardProps) {
  const config = kpiColorConfig[color]
  const numericValue = typeof value === 'number' ? value : 0
  const rolledValue = useNumberRoll(numericValue)
  const [isHovered, setIsHovered] = useState(false)

  const content = (
    <GlassCard
      hover={!!href}
      className={`relative ${href ? 'cursor-pointer' : ''} ${config.glow}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[${config.accent}] to-transparent opacity-0 transition-opacity duration-500 ${isHovered ? 'opacity-60' : ''}`}
      />

      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div
            className={`
              w-11 h-11 rounded-2xl ${config.bg} ${config.border}
              border flex items-center justify-center
              transition-all duration-400 ease-out
              ${isHovered ? 'scale-110 rotate-[-3deg]' : ''}
            `}
          >
            <Icon className={`w-5 h-5 ${config.icon}`} />
          </div>
          {change !== undefined && change !== null && (
            <div
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                ${change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}
              `}
            >
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color: BRAND.textPrimary }}>
            {formattedValue || (typeof value === 'number' ? rolledValue.toLocaleString() : value)}
          </p>
          <p className="text-sm font-medium" style={{ color: BRAND.textSecondary }}>
            {title}
          </p>
        </div>

        {(secondaryValue || changeLabel) && (
          <div className="mt-4 pt-4 border-t border-slate-100/60 flex items-center justify-between">
            {secondaryValue && (
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: BRAND.textMuted }}>
                  {secondaryLabel}
                </p>
                <p className="text-sm font-semibold" style={{ color: BRAND.textPrimary }}>
                  {secondaryValue}
                </p>
              </div>
            )}
            {changeLabel && (
              <p className="text-xs" style={{ color: BRAND.textMuted }}>
                {changeLabel}
              </p>
            )}
          </div>
        )}

        {trendData && (
          <div className="mt-4 pt-4 border-t border-slate-100/60">
            <svg
              viewBox="0 0 100 24"
              preserveAspectRatio="none"
              className="w-full h-6"
            >
              <defs>
                <linearGradient id={`snm-trend-${index}-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={config.accent} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={config.accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                points={trendData.map((v, i) => `${(i / (trendData.length - 1)) * 100},${24 - ((v - Math.min(...trendData)) / (Math.max(...trendData) - Math.min(...trendData) || 1)) * 20}`).join(' ')}
                fill="none"
                stroke={config.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70"
              />
              <polygon
                points={`0,24 ${trendData.map((v, i) => `${(i / (trendData.length - 1)) * 100},${24 - ((v - Math.min(...trendData)) / (Math.max(...trendData) - Math.min(...trendData) || 1)) * 20}`).join(' ')} 100,24`}
                fill={`url(#snm-trend-${index}-${color})`}
                className="opacity-40"
              />
            </svg>
          </div>
        )}
      </CardContent>
    </GlassCard>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

type SO = {
  so_id: string
  so_date: string
  grand_total: number
  approval_status: string
  created_at: string
  ms_customer: { cust_name: string } | null
}

type Notif = {
  id: string
  title: string
  message: string | null
  created_at: string
  status: string
}

export function SnmPageClient() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<SO[]>([])
  const [custDates, setCustDates] = useState<string[]>([])
  const [forecastDates, setForecastDates] = useState<string[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [waiting, setWaiting] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      const [soRes, custRes, fcRes, ntRes, waitRes] = await Promise.all([
        supabase
          .from('tr_so_header')
          .select('so_id, so_date, grand_total, approval_status, created_at, ms_customer(cust_name)')
          .order('created_at', { ascending: false }),
        supabase.from('ms_customer').select('created_at'),
        supabase.from('an_sales_forecast').select('created_at'),
        supabase
          .from('notifications')
          .select('id, title, message, created_at, status')
          .eq('recipient_role', 'SNM')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('tr_so_header')
          .select('so_id', { count: 'exact', head: true })
          .eq('approval_status', 'WAITING_APPROVAL'),
      ])
      if (!active) return
      setOrders((soRes.data as unknown as SO[]) ?? [])
      setCustDates(((custRes.data as { created_at: string }[]) ?? []).map((r) => r.created_at))
      setForecastDates(((fcRes.data as { created_at: string }[]) ?? []).map((r) => r.created_at))
      setNotifs((ntRes.data as Notif[]) ?? [])
      setWaiting(waitRes.count ?? 0)
      setMounted(true)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [supabase])

  const soMonthly = useMemo(() => monthlyCounts(orders.map((o) => o.created_at)), [orders])
  const custMonthly = useMemo(() => cumulative(monthlyCounts(custDates)), [custDates])
  const fcMonthly = useMemo(() => monthlyCounts(forecastDates), [forecastDates])

  const totalRevenue = useMemo(
    () =>
      orders
        .filter((o) => o.approval_status === 'APPROVED')
        .reduce((s, o) => s + (o.grand_total || 0), 0),
    [orders],
  )

  const areaData = useMemo(() => monthlyTrend(orders), [orders])
  const donutData = useMemo(() => {
    const counts: Record<string, number> = {}
    orders.forEach((o) => {
      counts[o.approval_status] = (counts[o.approval_status] || 0) + 1
    })
    return Object.entries(counts).map(([status, count]) => ({
      label: SO_STATUS_LABEL[status] || status,
      value: count,
      color: STATUS_COLORS[status] || CHART_COLORS.tertiary,
    }))
  }, [orders])
  const multiBarData = useMemo(() => monthlyByStatus(orders), [orders])

  const recent = orders.slice(0, 6)

  if (!mounted) {
    return (
      <ModuleLayout activeModule="snm" moduleTitle="Sales & Marketing">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-10 h-10 border-3 border-slate-100 rounded-full animate-spin"
              style={{ borderTopColor: BRAND.primary, borderWidth: '3px' }}
            />
            <p style={{ color: BRAND.textSecondary }}>Loading analytics...</p>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  const cards = [
    {
      title: 'Sales Orders',
      value: orders.length,
      change: trendPctNum(soMonthly),
      changeLabel: 'vs last month',
      icon: ClipboardText as React.ComponentType<{ className?: string }>,
      color: 'red' as const,
      href: '/snm/sales',
      secondaryValue: rupiah(totalRevenue),
      secondaryLabel: 'Revenue',
      trendData: soMonthly,
    },
    {
      title: 'Customers',
      value: custDates.length,
      change: trendPctNum(monthlyCounts(custDates)),
      changeLabel: 'vs last month',
      icon: Users as React.ComponentType<{ className?: string }>,
      color: 'blue' as const,
      href: '/snm/customers',
      trendData: custMonthly,
    },
    {
      title: 'Forecast',
      value: forecastDates.length,
      change: trendPctNum(fcMonthly),
      changeLabel: 'vs last month',
      icon: Megaphone as React.ComponentType<{ className?: string }>,
      color: 'purple' as const,
      href: '/snm/marketing',
      trendData: fcMonthly,
    },
  ]

  return (
    <ModuleLayout activeModule="snm" moduleTitle="Sales & Marketing">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-end justify-between animate-[fadeInUp_0.5s_ease-out]">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: BRAND.primary }} />
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: BRAND.primary }}
                >
                  Sales & Marketing
                </p>
                <h1 className="text-3xl font-semibold tracking-tight" style={{ color: BRAND.textPrimary }}>
                  Analytics Dashboard
                </h1>
              </div>
            </div>
            <p className="text-sm ml-4" style={{ color: BRAND.textSecondary }}>
              Sales performance & marketing overview
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: BRAND.textMuted }}>
              Total Nilai SO Disetujui
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ color: BRAND.textPrimary }}
            >
              {rupiah(totalRevenue)}
            </p>
          </div>
        </div>

        {/* ── Pending approval banner ── */}
        {waiting > 0 && (
          <Link
            href="/snm/approvals"
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors animate-[fadeInUp_0.5s_ease-out_0.05s_both]"
          >
            <CheckCircle className="w-4 h-4 shrink-0" weight="fill" />
            <span>
              <b>{waiting}</b> Sales Order menunggu persetujuan manager.
            </span>
            <ArrowRight className="w-4 h-4 ml-auto shrink-0" weight="bold" />
          </Link>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 animate-[fadeInUp_0.5s_ease-out_0.05s_both]">
          {cards.map((card, index) => (
            <PremiumKPICard key={card.title} {...card} index={index} />
          ))}
        </div>

        {/* ── AreaChart + DonutChart ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 animate-[fadeInUp_0.5s_ease-out_0.1s_both]">
            <GlassCard>
              <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                    Sales Order Trend (12 Months)
                  </h3>
                  <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                    Monthly order count vs revenue (in millions)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.primary }} />
                    <span className="text-xs" style={{ color: BRAND.textMuted }}>Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.secondary }} />
                    <span className="text-xs" style={{ color: BRAND.textMuted }}>Revenue (M)</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <AreaChart
                  data={areaData}
                  color={CHART_COLORS.primary}
                  secondaryColor={CHART_COLORS.secondary}
                  height={280}
                  showGrid
                  showTooltip
                  gradient
                  smooth
                />
              </div>
            </GlassCard>
          </div>

          <div className="animate-[fadeInUp_0.5s_ease-out_0.15s_both]">
            <GlassCard>
              <div className="px-6 py-5 border-b border-slate-100/60">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                    SO by Status
                  </h3>
                  <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                    Approval status distribution
                  </p>
                </div>
              </div>
              <div className="p-6 flex flex-col items-center justify-center">
                <DonutChart
                  segments={donutData}
                  size={220}
                  strokeWidth={36}
                  showLabels
                  showCenterText
                  centerText={orders.length.toLocaleString()}
                  centerSubtext="Total SO"
                />
              </div>
              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-3">
                  {donutData.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] truncate" style={{ color: BRAND.textMuted }}>
                          {item.label}
                        </p>
                        <p className="text-xs font-semibold" style={{ color: BRAND.textPrimary }}>
                          {formatNumber(item.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ── MultiBarChart ── */}
        <div className="animate-[fadeInUp_0.5s_ease-out_0.2s_both]">
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                  Monthly Performance by Status
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  Sales Order distribution per approval status (6 months)
                </p>
              </div>
              <div className="flex items-center gap-3">
                {SO_STATUS_KEYS.slice(0, 3).map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS[s] }} />
                    <span className="text-xs" style={{ color: BRAND.textMuted }}>
                      {SO_STATUS_LABEL[s] || s}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6">
              <MultiBarChart
                data={multiBarData}
                height={240}
                showGrid
                showLegend={false}
                barRadius={4}
                barSpacing={4}
              />
            </div>
          </GlassCard>
        </div>

        {/* ── Recent Orders + Notifications ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="animate-[fadeInUp_0.5s_ease-out_0.25s_both]">
            <GlassCard>
              <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                    Recent Sales Orders
                  </h3>
                  <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                    Latest customer orders
                  </p>
                </div>
                <Link href="/snm/sales">
                  <span
                    className="text-xs font-medium transition-colors duration-300 inline-flex items-center gap-1"
                    style={{ color: BRAND.primary }}
                  >
                    View All
                    <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                  </span>
                </Link>
              </div>
              <div className="divide-y divide-slate-100/60">
                {recent.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: BRAND.textMuted }}>
                    Belum ada Sales Order
                  </p>
                ) : (
                  recent.map((o) => (
                    <div
                      key={o.so_id}
                      className="flex items-center justify-between py-3.5 px-6 hover:bg-slate-50/80 border-b border-slate-100/60 last:border-0 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                          {o.ms_customer?.cust_name ?? '—'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500 font-mono bg-slate-100/80 px-1.5 py-0.5 rounded">
                            {o.so_id}
                          </span>
                          <span className="text-[11px] text-slate-400">· {fmtDateShort(o.so_date)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-semibold text-slate-900 tabular-nums">
                          {rupiah(o.grand_total)}
                        </p>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${SO_STATUS_BADGE[o.approval_status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {o.approval_status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          <div className="animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
            <GlassCard>
              <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                    Notifications
                  </h3>
                  <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                    Latest updates & alerts
                  </p>
                </div>
                {notifs.some((n) => n.status === 'UNREAD') && (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50/80 border border-emerald-100/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-emerald-700">Live</span>
                  </div>
                )}
              </div>
              <div className="divide-y divide-slate-100/60 max-h-[380px] overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: BRAND.textMuted }}>
                    Belum ada notifikasi
                  </p>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-4 py-3.5 px-6 hover:bg-slate-50/80 border-b border-slate-100/60 last:border-0 transition-colors group"
                    >
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.status === 'UNREAD' ? 'bg-red-500' : 'bg-slate-200'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate pr-4 group-hover:text-slate-900 transition-colors">
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        <style jsx global>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          * { animation-fill-mode: forwards; }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
          .overflow-y-auto::-webkit-scrollbar { width: 4px; }
          .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
          .overflow-y-auto::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 2px; }
          .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        `}</style>
      </div>
    </ModuleLayout>
  )
}
