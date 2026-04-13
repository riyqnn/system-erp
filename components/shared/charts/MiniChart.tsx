'use client'

import { useEffect, useRef, useState } from 'react'

interface MiniChartProps {
  data: number[]
  color?: string
  height?: number
  showGradient?: boolean
}

export function MiniChart({ data, color = '#dc2626', height = 60, showGradient = true }: MiniChartProps) {
  const [isVisible, setIsVisible] = useState(false)
  const chartRef = useRef<SVGSVGElement>(null)

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

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,100 ${points} 100,100`

  return (
    <svg
      ref={chartRef}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`w-full h-full transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ height }}
    >
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showGradient && (
        <polygon
          points={areaPoints}
          fill={`url(#gradient-${color})`}
          className="transition-all duration-1000"
        />
      )}

      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-1000"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
