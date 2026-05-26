'use client'

import { useEffect, useRef, useState } from 'react'

interface AreaChartProps {
  data: { label: string; value: number; secondary?: number }[]
  color?: string
  secondaryColor?: string
  height?: number
  showGrid?: boolean
  showTooltip?: boolean
  gradient?: boolean
  smooth?: boolean
}

export function AreaChart({
  data,
  color = '#EE4444',
  secondaryColor = '#10B981',
  height = 280,
  showGrid = true,
  showTooltip = true,
  gradient = true,
  smooth = true,
}: AreaChartProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

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

  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.secondary || 0)))
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = 1000
  const chartHeight = height - padding.top - padding.bottom

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * (chartWidth - padding.left - padding.right)
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight

  // Generate smooth curve points
  const generateSmoothPath = (values: number[]) => {
    if (values.length < 2) return ''

    let path = `M ${getX(0)} ${getY(values[0])}`

    if (smooth) {
      for (let i = 0; i < values.length - 1; i++) {
        const x1 = getX(i)
        const y1 = getY(values[i])
        const x2 = getX(i + 1)
        const y2 = getY(values[i + 1])

        const cp1x = x1 + (x2 - x1) / 3
        const cp1y = y1
        const cp2x = x1 + (2 * (x2 - x1)) / 3
        const cp2y = y2

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`
      }
    } else {
      for (let i = 1; i < values.length; i++) {
        path += ` L ${getX(i)} ${getY(values[i])}`
      }
    }

    return path
  }

  const primaryValues = data.map(d => d.value)
  const secondaryValues = data.map(d => d.secondary || 0)

  const primaryPath = generateSmoothPath(primaryValues)
  const secondaryPath = generateSmoothPath(secondaryValues)

  // Area fill paths
  const primaryAreaPath = `${primaryPath} L ${getX(data.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`
  const secondaryAreaPath = `${secondaryPath} L ${getX(data.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`

  return (
    <div ref={chartRef} className="w-full relative" style={{ height }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Primary gradient */}
          <linearGradient id={`area-gradient-primary-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={gradient ? 0.3 : 0.1} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>

          {/* Secondary gradient */}
          <linearGradient id={`area-gradient-secondary-${secondaryColor}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity={gradient ? 0.3 : 0.1} />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity={0} />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
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
                    strokeDasharray="4 4"
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

        {/* Secondary area */}
        {secondaryValues.some(v => v > 0) && (
          <path
            d={secondaryAreaPath}
            fill={`url(#area-gradient-secondary-${secondaryColor})`}
            className={`transition-opacity duration-1000 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {/* Primary area */}
        <path
          d={primaryAreaPath}
          fill={`url(#area-gradient-primary-${color})`}
          className={`transition-opacity duration-1000 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Secondary line */}
        {secondaryValues.some(v => v > 0) && (
          <path
            d={secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {/* Primary line */}
        <path
          d={primaryPath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glow)"
          className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Data points */}
        {data.map((item, i) => {
          const x = getX(i)
          const y = getY(item.value)
          const isHovered = hoveredIndex === i

          return (
            <g key={i}>
              {/* Interaction zone */}
              <rect
                x={x - (chartWidth - padding.left - padding.right) / (data.length - 1) / 2}
                y={padding.top}
                width={(chartWidth - padding.left - padding.right) / (data.length - 1)}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              />

              {/* Point */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 6 : 3}
                fill={color}
                className={`transition-all duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 scale-0'}`}
                style={{
                  transformOrigin: `${x}px ${y}px`,
                }}
              />

              {/* Tooltip */}
              {showTooltip && isHovered && (
                <g className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <rect
                    x={x - 50}
                    y={y - 55}
                    width={100}
                    height={40}
                    rx="8"
                    fill="white"
                    filter="url(#glow)"
                    stroke={color}
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={y - 35}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-500 font-medium"
                  >
                    {item.label}
                  </text>
                  <text
                    x={x}
                    y={y - 20}
                    textAnchor="middle"
                    className="text-xs fill-slate-900 font-bold"
                  >
                    {item.value.toLocaleString()}
                  </text>
                </g>
              )}

              {/* X-axis labels */}
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] fill-slate-400 font-medium"
              >
                {item.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Y-axis line */}
      <div
        className="absolute left-[50px] top-0 bottom-8 w-px bg-slate-100"
        style={{ top: padding.top }}
      />
    </div>
  )
}
