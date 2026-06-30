'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type UserRole = 'PURCHASING' | 'MANAGER_PURCHASING'

export function PurchasingDefaultRedirect() {
  const router = useRouter()

  useEffect(() => {
    const savedRole = localStorage.getItem('erp_role') as UserRole | null
    const managerAccessGranted = localStorage.getItem(
      'erp_manager_access_granted'
    )

    if (
      savedRole === 'MANAGER_PURCHASING' &&
      managerAccessGranted === 'true'
    ) {
      router.replace('/apps/purchasing/manager')
      return
    }

    localStorage.setItem('erp_role', 'PURCHASING')
    localStorage.removeItem('erp_manager_access_granted')
    router.replace('/apps/purchasing/staff')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
      Opening Purchasing workspace...
    </div>
  )
}