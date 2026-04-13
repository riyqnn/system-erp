'use client'

import { useEffect, useRef, useState } from 'react'

interface BarChartProps {
  data: { label: string; value: number; target?: number }[]
  color?: string
  height?: number
  showTarget?: boolean
}

export function BarChart({ data, color = '#dc2626', height = 200, showTarget = false }: BarChartProps) {
  const [isVisible, setIsVisible] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (chartRef.current) {
      observer.observe(chartRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.target || 0)))

  return (
    <div ref={chartRef} style={{ height }} className="w-full">
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((item, index) => {
          const valueHeight = (item.value / maxValue) * 100
          const targetHeight = showTarget && item.target ? (item.target / maxValue) * 100 : 0

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full relative" style={{ height: 'calc(100% - 24px)' }}>
                {/* Target Line */}
                {showTarget && item.target && (
                  <div
                    className="absolute w-full border-t-2 border-dashed border-slate-300 transition-all duration-1000"
                    style={{
                      bottom: `${targetHeight}%`,
                      opacity: isVisible ? 1 : 0,
                    }}
                  />
                )}

                {/* Value Bar */}
                <div
                  className="w-full rounded-t-lg transition-all duration-1000 ease-out relative group"
                  style={{
                    height: isVisible ? `${valueHeight}%` : '0%',
                    backgroundColor: color,
                  }}
                >
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity rounded-t-lg" />
                </div>
              </div>

              <span className="text-xs text-slate-500 truncate w-full text-center" title={item.label}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
