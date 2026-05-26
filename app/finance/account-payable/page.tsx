'use client'

import React from 'react'
import { Gear } from "@phosphor-icons/react"

export default function AccountPayablePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-[fadeInUp_0.5s_ease-out]">
      <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center border border-red-100 shadow-[0_4px_20px_rgba(238,68,68,0.15)]">
        <Gear className="w-8 h-8 text-[#EE4444] animate-spin" style={{ animationDuration: '6s' }} />
      </div>
      <div className="text-center space-y-2 max-w-md">
        <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Account Payable</h1>
        <p className="text-sm text-slate-500">
          Halaman ini sedang dalam tahap pengembangan aktif oleh tim pengembang PT Mayora Indah.
        </p>
      </div>
    </div>
  )
}
