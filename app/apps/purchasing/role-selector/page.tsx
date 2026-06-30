'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

export default function PurchasingRoleSelectorPage() {
  const router = useRouter()

  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  const handleSelectStaff = () => {
    localStorage.setItem('erp_role', 'PURCHASING')
    localStorage.removeItem('erp_manager_access_granted')
    router.push('/apps/purchasing/staff')
  }

  const handleOpenManagerAccess = () => {
    setAccessCode('')
    setErrorMessage('')
    setIsManagerModalOpen(true)
  }

  const handleManagerAccess = async () => {
    if (!accessCode.trim()) {
      setErrorMessage('Manager access code is required')
      return
    }

    try {
      setIsChecking(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/manager-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessCode: accessCode.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Invalid manager access code')
      }

      localStorage.setItem('erp_role', 'MANAGER_PURCHASING')
      localStorage.setItem('erp_manager_access_granted', 'true')
      router.push('/apps/purchasing/manager')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Invalid manager access code'
      )
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Role Selector' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Select Purchasing Role"
          description="Choose a purchasing workspace based on the responsibility you want to access."
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={handleSelectStaff}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-red-200 hover:bg-red-50"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Staff Workspace
            </p>

            <h2 className="mt-3 text-xl font-bold text-slate-900">
              Purchasing Staff
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage RFQ, supplier sourcing, price negotiation, purchase orders,
              goods receipt, and three-way matching.
            </p>

            <div className="mt-5 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-red-600">
              Continue as Purchasing Staff
            </div>
          </button>

          <button
            type="button"
            onClick={handleOpenManagerAccess}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-red-200 hover:bg-red-50"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Manager Workspace
            </p>

            <h2 className="mt-3 text-xl font-bold text-slate-900">
              Manager Purchasing
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review purchase requisitions, input approved budget, approve PR,
              and decide over-budget purchase order approval.
            </p>

            <div className="mt-5 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-red-600">
              Enter Manager Access Code
            </div>
          </button>
        </div>
      </div>

      {isManagerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Manager Access Required
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter the manager access code to open Manager Purchasing
              Workspace.
            </p>

            {errorMessage && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-5">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Access Code
              </label>

              <input
                type="password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleManagerAccess()
                  }
                }}
                placeholder="Enter manager access code"
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsManagerModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleManagerAccess}
                disabled={isChecking}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChecking ? 'Checking...' : 'Continue as Manager'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  )
}