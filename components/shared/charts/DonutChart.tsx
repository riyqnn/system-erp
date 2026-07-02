'use client'

import { useEffect, useRef, useState } from 'react'

interface Segment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: Segment[]
  size?: number
  strokeWidth?: number
  innerRadius?: number
  showLabels?: boolean
  showCenterText?: boolean
  centerText?: string
  centerSubtext?: string
}

export function DonutChart({
  segments,
  size = 200,
  strokeWidth = 32,
  innerRadius,
  showLabels = true,
  showCenterText = true,
  centerText,
  centerSubtext,
}: DonutChartProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
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

  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const actualInnerRadius = innerRadius || (size - strokeWidth) / 2 - 10
  const outerRadius = size / 2
  const centerX = size / 2
  const centerY = size / 2

  let currentAngle = -Math.PI / 2 // Start from top

  const getSegmentPath = (startAngle: number, endAngle: number, isHovered: boolean) => {
    const r = isHovered ? outerRadius + 4 : outerRadius
    const x1 = centerX + r * Math.cos(startAngle)
    const y1 = centerY + r * Math.sin(startAngle)
    const x2 = centerX + r * Math.cos(endAngle)
    const y2 = centerY + r * Math.sin(endAngle)
    const x3 = centerX + actualInnerRadius * Math.cos(endAngle)
    const y3 = centerY + actualInnerRadius * Math.sin(endAngle)
    const x4 = centerX + actualInnerRadius * Math.cos(startAngle)
    const y4 = centerY + actualInnerRadius * Math.sin(startAngle)

    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0

    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${actualInnerRadius} ${actualInnerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`
  }

  const getLabelPosition = (startAngle: number, endAngle: number) => {
    const midAngle = (startAngle + endAngle) / 2
    const labelRadius = outerRadius + 25
    return {
      x: centerX + labelRadius * Math.cos(midAngle),
      y: centerY + labelRadius * Math.sin(midAngle),
    }
  }

  return (
    <div ref={chartRef} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          {/* Glow filter */}
          <filter id="segment-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Shadow */}
          <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {segments.map((segment, i) => {
          const percentage = segment.value / (total || 1)
          const angle = percentage * 2 * Math.PI
          const startAngle = currentAngle
          const endAngle = startAngle + angle
          const isHovered = hoveredIndex === i

          // eslint-disable-next-line react-hooks/immutability
          currentAngle = endAngle

          // Skip very small segments
          if (percentage < 0.02) return null

          const path = getSegmentPath(startAngle, endAngle, isHovered)
          const labelPos = getLabelPosition(startAngle, endAngle)

          return (
            <g key={i}>
              {/* Segment */}
              <path
                d={path}
                fill={segment.color}
                filter={isHovered ? 'url(#segment-glow)' : 'url(#drop-shadow)'}
                className={`transition-all duration-300 ease-out cursor-pointer ${isVisible ? 'opacity-100' : 'opacity-0 scale-90'}`}
                style={{
                  transformOrigin: `${centerX}px ${centerY}px`,
                  transform: isVisible ? 'scale(1)' : 'scale(0.9)',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Label */}
              {showLabels && percentage > 0.05 && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor={labelPos.x > centerX ? 'start' : 'end'}
                  dominantBaseline="middle"
                  className={`text-[10px] font-bold transition-all duration-300 ${isHovered ? 'fill-slate-900 scale-110' : 'fill-slate-500'}`}
                  style={{ transformOrigin: `${labelPos.x}px ${labelPos.y}px` }}
                >
                  {segment.label}
                </text>
              )}

              {/* Percentage label on segment */}
              {percentage > 0.1 && (
                <text
                  x={centerX + ((outerRadius + actualInnerRadius) / 2) * Math.cos((startAngle + endAngle) / 2)}
                  y={centerY + ((outerRadius + actualInnerRadius) / 2) * Math.sin((startAngle + endAngle) / 2)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`text-[11px] font-bold fill-white transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-80'}`}
                >
                  {Math.round(percentage * 100)}%
                </text>
              )}
            </g>
          )
        })}

        {/* Center text */}
        {showCenterText && (
          <g className="text-center">
            <text
              x={centerX}
              y={centerY - 5}
              textAnchor="middle"
              className="text-2xl font-bold fill-slate-900"
            >
              {centerText || total.toLocaleString()}
            </text>
            <text
              x={centerX}
              y={centerY + 15}
              textAnchor="middle"
              className="text-[10px] fill-slate-400 uppercase tracking-wider"
            >
              {centerSubtext || 'Total'}
            </text>
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-semibold text-slate-900">{segments[hoveredIndex].label}</p>
          <p className="text-xs text-slate-500">
            {segments[hoveredIndex].value.toLocaleString()} ({Math.round((segments[hoveredIndex].value / (total || 1)) * 100)}%)
          </p>
        </div>
      )}
    </div>
  )
}
