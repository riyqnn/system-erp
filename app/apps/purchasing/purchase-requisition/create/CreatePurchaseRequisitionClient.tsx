'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Info } from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type CriticalItem = {
  product: string
  currentStock: string
  minimumStock: string
  shortage: string
  requestQty: string
  unit: string
}

export function CreatePurchaseRequisitionClient() {
  const router = useRouter()

  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<CriticalItem[]>([
    {
      product: 'RM-001 Gula Pasir',
      currentStock: '50 kg',
      minimumStock: '100 kg',
      shortage: '50 kg',
      requestQty: '500',
      unit: 'kg',
    },
    {
      product: 'RM-002 Glukosa',
      currentStock: '30 kg',
      minimumStock: '100 kg',
      shortage: '70 kg',
      requestQty: '500',
      unit: 'kg',
    },
    {
      product: 'RM-003 Ekstrak Kopi',
      currentStock: '20 kg',
      minimumStock: '80 kg',
      shortage: '60 kg',
      requestQty: '300',
      unit: 'kg',
    },
  ])

  const updateQty = (index: number, value: string) => {
    const updated = [...items]
    updated[index].requestQty = value
    setItems(updated)
  }

  const addManualItem = () => {
    setItems([
      ...items,
      {
        product: 'New Manual Item',
        currentStock: '-',
        minimumStock: '-',
        shortage: '-',
        requestQty: '',
        unit: 'pcs',
      },
    ])
  }

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Purchase Requisition', href: '/apps/purchasing/purchase-requisition' },
        { label: 'Create PR' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Create Purchase Requisition"
          description="Generate a new purchase requisition based on critical stock items."
        />

        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Info size={18} className="mt-0.5 shrink-0" />
          <p>
            The system has detected 3 items with stock below the minimum threshold.
            Please define the required procurement quantity.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">
            Request Information
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                PR ID
              </label>
              <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200">
                <input
                  type="text"
                  value="PR-202604-006"
                  readOnly
                  className="w-full px-3 text-sm outline-none"
                />
                <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-[10px] font-bold text-slate-500">
                  AUTO
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Requested By
              </label>
              <input
                type="text"
                value="Andi Susanto — Warehouse Staff"
                readOnly
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Request Date
              </label>
              <input
                type="text"
                value="05/20/2026"
                readOnly
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Department
              </label>
              <input
                type="text"
                value="Warehouse / Inventory"
                readOnly
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Critical Stock Items</h3>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
              {items.length} items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 font-semibold">Current Stock</th>
                  <th className="px-3 py-3 font-semibold">Minimum Stock</th>
                  <th className="px-3 py-3 font-semibold">Shortage</th>
                  <th className="px-3 py-3 font-semibold">Request Qty</th>
                  <th className="px-3 py-3 font-semibold">Unit</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={`${item.product}-${index}`}>
                    <td className="px-3 py-4 font-semibold text-slate-900">
                      {item.product}
                    </td>
                    <td className="px-3 py-4 font-semibold text-red-500">
                      {item.currentStock}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {item.minimumStock}
                    </td>
                    <td className="px-3 py-4 font-semibold text-red-500">
                      {item.shortage}
                    </td>
                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.requestQty}
                        onChange={(e) => updateQty(index, e.target.value)}
                        className="h-10 w-24 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                      />
                    </td>
                    <td className="px-3 py-4 text-slate-600">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addManualItem}
            className="mt-4 text-sm font-medium text-slate-600 hover:text-red-600"
          >
            + Add Manual Item
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-900">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Example: Prioritize RM-001 because production is scheduled next week."
            className="min-h-[140px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-300"
          />
        </div>

        <div className="flex flex-col justify-between gap-3 md:flex-row">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Save Draft
            </button>

            <Link
              href="/apps/purchasing/purchase-requisition"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
            >
              Submit PR →
            </Link>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}