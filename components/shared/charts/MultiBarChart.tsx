'use client'

import { useEffect, useRef, useState } from 'react'

interface DataPoint {
  category: string
  values: { label: string; value: number; color: string }[]
}

interface MultiBarChartProps {
  data: DataPoint[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  barRadius?: number
  barSpacing?: number
}

export function MultiBarChart({
  data,
  height = 240,
  showGrid = true,
  showLegend = true,
  barRadius = 4,
  barSpacing = 2,
}: MultiBarChartProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredBar, setHoveredBar] = useState<{ categoryIndex: number; valueIndex: number } | null>(null)
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

  // Find max value for scaling
  const maxValue = Math.max(...data.flatMap(d => d.values.map(v => v.value)))

  const padding = { top: 30, right: 20, bottom: 40, left: 50 }
  const chartWidth = 1000
  const chartHeight = height - padding.top - padding.bottom

  const barGroupWidth = (chartWidth - padding.left - padding.right) / data.length
  const barWidth = (barGroupWidth - barSpacing * (data[0]?.values.length || 1)) / (data[0]?.values.length || 1)

  const getBarX = (categoryIndex: number, valueIndex: number) =>
    padding.left + categoryIndex * barGroupWidth + barSpacing + valueIndex * barWidth

  const getBarHeight = (value: number) => (value / maxValue) * chartHeight

  const getBarY = (value: number) => padding.top + chartHeight - getBarHeight(value)

  // Extract unique legend items
  const legendItems = data[0]?.values.map(v => ({ label: v.label, color: v.color })) || []

  return (
    <div ref={chartRef} className="w-full relative" style={{ height }}>
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          {/* Shadow for bars */}
          <filter id="bar-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>

        {/* Y-axis grid lines and labels */}
        {showGrid && (
          <>
            {Array.from({ length: 5 }).map((_, i) => {
              const y = padding.top + (chartHeight / 4) * i
              const value = Math.round(maxValue * (1 - i / 4))
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray={i === 0 ? "0" : "4 4"}
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-medium"
                  >
                    {value.toLocaleString()}
                  </text>
                </g>
              )
            })}
          </>
        )}

        {/* Y-axis line */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#CBD5E1"
          strokeWidth="1"
        />

        {/* Bars */}
        {data.map((category, catIndex) =>
          category.values.map((valueItem, valIndex) => {
            const x = getBarX(catIndex, valIndex)
            const y = getBarY(valueItem.value)
            const barH = getBarHeight(valueItem.value)
            const isHovered =
              hoveredBar?.categoryIndex === catIndex && hoveredBar?.valueIndex === valIndex

            return (
              <g key={`${catIndex}-${valIndex}`}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={barRadius}
                  fill={valueItem.color}
                  filter="url(#bar-shadow)"
                  className={`transition-all duration-500 ease-out ${isVisible ? 'opacity-100' : 'opacity-0 scale-y-0'}`}
                  style={{
                    transformOrigin: `${x + barWidth / 2}px ${height - padding.bottom}px`,
                    transform: isHovered ? 'scaleX(1.05)' : 'scaleX(1)',
                  }}
                  onMouseEnter={() => setHoveredBar({ categoryIndex: catIndex, valueIndex: valIndex })}
                  onMouseLeave={() => setHoveredBar(null)}
                />

                {/* Value label on hover */}
                {isHovered && (
                  <g className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <rect
                      x={x + barWidth / 2 - 30}
                      y={y - 30}
                      width={60}
                      height={24}
                      rx="6"
                      fill="#1E293B"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 14}
                      textAnchor="middle"
                      className="text-[10px] fill-white font-bold"
                    >
                      {valueItem.value.toLocaleString()}
                    </text>
                  </g>
                )}
              </g>
            )
          })
        )}

        {/* X-axis labels */}
        {data.map((category, i) => {
          const x = padding.left + i * barGroupWidth + barGroupWidth / 2
          return (
            <text
              key={i}
              x={x}
              y={height - 12}
              textAnchor="middle"
              className="text-[10px] fill-slate-500 font-medium"
            >
              {category.category}
            </text>
          )
        })}

        {/* X-axis line */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={chartWidth - padding.right}
          y2={height - padding.bottom}
          stroke="#CBD5E1"
          strokeWidth="1"
        />
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="absolute top-0 right-0 flex gap-4">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-slate-500 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
