'use client'

import { useState } from 'react'
import {
  FileText,
  Truck,
  Receipt,
  CheckCircle,
  PaperPlaneTilt,
  Sparkle,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

const matchingResults = [
  {
    label: 'Product',
    detail: 'MATCH (RM-001 Gula Pasir)',
  },
  {
    label: 'Quantity',
    detail: 'MATCH (500 kg = 500 kg = 500 kg)',
  },
  {
    label: 'Price',
    detail: 'MATCH (Rp 16.500/kg)',
  },
]

export function ThreeWayMatchingClient() {
  const [selectedInvoice, setSelectedInvoice] = useState(
    'INV-JWM-20260401 | PT Jawamanis Rafinasi | Rp 8.250.000'
  )
  const [hasMatched, setHasMatched] = useState(true)

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Three-Way Matching' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Three-Way Matching"
          description="Verify consistency between purchase order, goods receipt, and supplier invoice."
        />

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-xs font-semibold text-slate-600">
            Select Supplier Invoice
          </label>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <select
              value={selectedInvoice}
              onChange={(event) => setSelectedInvoice(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none focus:border-red-300"
            >
              <option>
                INV-JWM-20260401 | PT Jawamanis Rafinasi | Rp 8.250.000
              </option>
              <option>
                INV-ANK-20260402 | PT Aneka Coffee | Rp 10.500.000
              </option>
              <option>
                INV-SPF-20260403 | PT Supernova Flexible | Rp 6.500.000
              </option>
            </select>

            <button
              type="button"
              onClick={() => setHasMatched(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800"
            >
              <Sparkle size={18} weight="bold" />
              Run Matching
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-blue-600 px-5 py-3 text-white">
              <h3 className="font-semibold">Purchase Order</h3>
              <FileText size={20} weight="bold" />
            </div>

            <div className="space-y-4 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-bold text-slate-900">PO-202604-001</span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Product</span>
                  <span className="font-semibold text-slate-900">Gula Pasir</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-slate-500">Quantity</span>
                  <span className="font-semibold text-slate-900">500 kg</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-slate-500">Unit Price</span>
                  <span className="font-semibold text-slate-900">
                    Rp 16.500/kg
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Total PO</span>
                  <span className="font-bold text-blue-600">Rp 8.250.000</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-green-200 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-green-600 px-5 py-3 text-white">
              <h3 className="font-semibold">Goods Receipt</h3>
              <Truck size={20} weight="bold" />
            </div>

            <div className="space-y-4 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Receipt ID</span>
                <span className="font-bold text-slate-900">GR-202604-001</span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Product</span>
                  <span className="font-semibold text-slate-900">Gula Pasir</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-slate-500">Received Qty</span>
                  <span className="font-semibold text-slate-900">500 kg</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-slate-500">Exp. Date</span>
                  <span className="font-semibold text-slate-900">
                    2028-04-01
                  </span>
                </div>
              </div>

              <div className="flex justify-end border-t border-dashed border-slate-200 pt-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  <CheckCircle size={14} weight="bold" />
                  Accepted
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-orange-200 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-orange-500 px-5 py-3 text-white">
              <h3 className="font-semibold">Supplier Invoice</h3>
              <Receipt size={20} weight="bold" />
            </div>

            <div className="space-y-4 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Invoice ID</span>
                <span className="font-bold text-slate-900">
                  INV-JWM-20260401
                </span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Product</span>
                  <span className="font-semibold text-slate-900">Gula Pasir</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-slate-500">Billed Qty</span>
                  <span className="font-semibold text-slate-900">500 kg</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-slate-500">Billed Price</span>
                  <span className="font-semibold text-slate-900">
                    Rp 16.500/kg
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Total Invoice</span>
                  <span className="font-bold text-orange-600">
                    Rp 8.250.000
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasMatched && (
          <div className="overflow-hidden rounded-xl border border-green-200 bg-white shadow-sm">
            <div className="bg-green-600 px-6 py-10 text-center text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-green-600">
                <CheckCircle size={38} weight="fill" />
              </div>

              <h2 className="mt-4 text-3xl font-bold tracking-wide">
                MATCHING SUCCESSFUL
              </h2>
              <p className="mt-2 text-sm text-green-50">
                All documents are synchronized and valid.
              </p>
            </div>

            <div className="space-y-3 bg-green-50 px-6 py-5">
              {matchingResults.map((result) => (
                <div
                  key={result.label}
                  className="flex items-center justify-between rounded-lg border border-green-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} weight="fill" className="text-green-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {result.label}: {result.detail}
                    </span>
                  </div>

                  <span className="text-xs font-bold uppercase text-green-700">
                    Verified
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-green-100 bg-white px-6 py-5">
              <div className="rounded-xl bg-slate-50 p-5">
                <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Subtotal
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      Rp 8.250.000
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Due Date
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      10 May 2026
                    </p>
                    <p className="text-xs font-semibold text-red-600">
                      Net 30
                    </p>
                  </div>
                </div>
              </div>

              <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800">
                <PaperPlaneTilt size={18} weight="bold" />
                Confirm and Send to Finance
              </button>

              <p className="mt-4 text-center text-xs text-slate-400">
                This action will lock the documents and register payment obligations in the Finance module.
              </p>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}