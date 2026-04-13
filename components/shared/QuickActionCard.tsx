'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { type Icon } from '@phosphor-icons/react'

export interface QuickActionCardProps {
  label: string
  href: string
  icon: Icon
  count: string
  description: string
}

export function QuickActionCard({ label, href, icon: Icon, count, description }: QuickActionCardProps) {
  return (
    <Link href={href}>
      <Card className="border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-sm transition-all">
        <CardContent className="p-6">
          <Icon weight="bold" size={32} className="mb-3" style={{ color: '#dc2626' }} />
          <h3 className="font-semibold text-black mb-1">{label}</h3>
          <p className="text-2xl font-semibold text-black mb-1">{count}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
