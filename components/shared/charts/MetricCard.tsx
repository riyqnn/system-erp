'use client'

import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon?: ReactNode
  color?: string
  trend?: 'up' | 'down' | 'neutral'
  size?: 'default' | 'large'
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  color = '#dc2626',
  trend,
  size = 'default',
}: MetricCardProps) {
  const isLarge = size === 'large'

  return (
    <Card className="border border-slate-200 bg-white hover:shadow-lg transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm text-slate-500 mb-1">{title}</p>
            <p
              className={`font-bold text-black ${isLarge ? 'text-4xl' : 'text-2xl'}`}
            >
              {value}
            </p>
          </div>
          {icon && (
            <div
              className="p-3 rounded-xl transition-transform hover:scale-110"
              style={{ backgroundColor: `${color}10` }}
            >
              <div style={{ color }}>{icon}</div>
            </div>
          )}
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                trend === 'up' || change > 0
                  ? 'bg-green-100 text-green-700'
                  : trend === 'down' || change < 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {change > 0 ? '+' : ''}
              {change}%
            </div>
            <span className="text-xs text-slate-500">vs last period</span>
          </div>
        )}
      </div>
    </Card>
  )
}
