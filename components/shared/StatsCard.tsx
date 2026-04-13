'use client'

import { ReactNode } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon: ReactNode
  description: string
  className?: string
  showChart?: boolean
}

export function KPICard({
  title,
  value,
  change = 0,
  trend = 'neutral',
  icon,
  description,
  className,
  showChart = true
}: KPICardProps) {
  // Generate random chart data for visual variety
  const chartData = [35, 45, 30, 50, 40, 60, 45, 55, 40, 65, 50, 60]

  return (
    <Card
      className={cn(
        'border-slate-200 hover:shadow-md transition-shadow duration-200',
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-red-600">{value}</h3>
              {change !== 0 && (
                <span
                  className={cn(
                    'flex items-center text-xs font-medium',
                    trend === 'up' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend === 'up' ? (
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  ) : trend === 'down' ? (
                    <ArrowDownRight className="h-3 w-3 mr-0.5" />
                  ) : (
                    <Minus className="h-3 w-3 mr-0.5" />
                  )}
                  {Math.abs(Number(change))}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
            {icon}
          </div>
        </div>

        {/* Mini Area Chart */}
        {showChart && (
          <div className="mt-4 h-12 flex items-end gap-0.5">
            {chartData.map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-red-100 to-red-50 rounded-t-sm transition-all hover:from-red-200 hover:to-red-100"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color?: 'red' | 'green' | 'blue' | 'yellow' | 'slate'
  trend?: {
    value: number
    label: string
  }
  onClick?: () => void
  className?: string
}

export function StatCard({
  label,
  value,
  icon,
  color = 'red',
  trend,
  onClick,
  className
}: StatCardProps) {
  const colorStyles = {
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' }
  }

  const selectedColor = colorStyles[color]

  return (
    <Card
      className={cn(
        'border-slate-200 hover:shadow-md transition-all cursor-pointer',
        onClick && 'hover:border-red-200',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-black">{value}</h3>
            {trend && (
              <p className="text-xs text-slate-500 mt-1">
                <span className={trend.value > 0 ? 'text-green-600' : 'text-red-600'}>
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>{' '}
                {trend.label}
              </p>
            )}
          </div>
          <div
            className={cn(
              'h-10 w-10 rounded-lg border flex items-center justify-center',
              selectedColor.bg,
              selectedColor.border
            )}
            style={{ color: color === 'red' ? '#dc2626' : undefined }}
          >
            <div className={selectedColor.text}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
