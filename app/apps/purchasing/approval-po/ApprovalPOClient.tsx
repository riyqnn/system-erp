'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarBlank,
  Storefront,
  ClipboardText,
  CheckCircle,
  X,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

export function ApprovalPOClient() {
  const router = useRouter()
  const [approvalNotes, setApprovalNotes] = useState('')

  const goBackToPO = () => {
    router.push('/apps/purchasing/purchase-orders')
  }

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Approval PO' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Approval PO"
          description="Review and approve purchase orders before they are released to suppliers."
        />

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">
                  PO-202604-002
                </h2>

                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  Pending Approval
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <CalendarBlank size={16} />
                <span>Created on 11 Apr 2026</span>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Total PO Value
              </p>
              <p className="mt-1 text-3xl font-bold text-red-600">
                Rp 10.500.000
              </p>

              <span className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Level 1 - Purchasing Manager Authority
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 border-b border-red-100 pb-3">
              <Storefront size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Supplier Information
              </h3>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Name</span>
                <span className="font-bold text-slate-900">PT Aneka Coffee</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Supplier ID</span>
                <span className="font-semibold text-slate-900">VND-RM-004</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Product</span>
                <span className="font-semibold text-slate-900">
                  Coffee Extract (RM-003)
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Price</span>
                <span className="font-semibold text-slate-900">
                  Rp 105.000/kg
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Lead Time</span>
                <span className="font-semibold text-slate-900">5 Days</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Term of Payment</span>
                <span className="font-semibold text-slate-900">Net 30</span>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl bg-slate-900">
              <div className="relative h-40 bg-gradient-to-br from-slate-600 via-slate-800 to-black">
                <div className="absolute inset-0 opacity-30">
                  <div className="h-full w-full bg-[radial-gradient(circle_at_center,_#ffffff_1px,_transparent_1px)] [background-size:16px_16px]" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    Main Supplier Facility - Java Region
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 border-b border-red-100 pb-3">
              <ClipboardText size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Order Detail
              </h3>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Unit Price</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Subtotal
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        Coffee Extract
                      </td>
                      <td className="px-4 py-4 text-slate-700">100 kg</td>
                      <td className="px-4 py-4 text-slate-700">
                        Rp 105.000
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-900">
                        Rp 10.500.000
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 bg-red-50 px-4 py-4">
                <div className="flex items-center justify-end gap-8">
                  <span className="text-sm font-semibold text-slate-600">
                    Total
                  </span>
                  <span className="text-lg font-bold text-red-600">
                    Rp 10.500.000
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Approval Summary
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                This purchase order is within Level 1 approval authority and can
                be approved by the Purchasing Manager.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <label className="mb-3 block text-sm font-semibold text-slate-900">
            Approval Notes
          </label>

          <textarea
            value={approvalNotes}
            onChange={(event) => setApprovalNotes(event.target.value)}
            placeholder="Write optional approval notes..."
            className="min-h-[120px] w-full rounded-xl border border-red-100 px-4 py-3 text-sm outline-none focus:border-red-300"
          />

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={goBackToPO}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <X size={16} weight="bold" />
              Reject
            </button>

            <button
              type="button"
              onClick={goBackToPO}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800"
            >
              <CheckCircle size={16} weight="bold" />
              Approve PO
            </button>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}