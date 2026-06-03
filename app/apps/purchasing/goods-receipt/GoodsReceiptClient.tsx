'use client'

import { useState } from 'react'
import {
  ShoppingCart,
  ClipboardText,
  CheckCircle,
  Package,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

export function GoodsReceiptClient() {
  const [receivedQty, setReceivedQty] = useState('500')
  const [expiryDate, setExpiryDate] = useState('2028-04-01')
  const [batchNo, setBatchNo] = useState('BATCH-2026-04')
  const [condition, setCondition] = useState('Good')
  const [notes, setNotes] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Goods Receipt' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Goods Receipt"
          description="Record goods received from suppliers based on released purchase orders."
        />

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart size={20} className="text-red-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Select Purchase Order
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.8fr]">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                PO Number & Supplier
              </label>
              <select className="h-11 w-full rounded-lg border border-red-100 px-3 text-sm font-medium outline-none focus:border-red-300">
                <option>PO-202604-001 — PT Jawamanis Rafinasi</option>
                <option>PO-202604-002 — PT Aneka Coffee</option>
                <option>PO-202604-003 — PT Supernova Flexible</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Supplier
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  PT Jawamanis Rafinasi
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  PO Date
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  10 Apr 2026
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Status
                </p>
                <span className="mt-1 inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                  Released
                </span>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Expected Delivery
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  12 Apr 2026
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardText size={20} className="text-red-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Receipt Detail
            </h3>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Ordered Qty</th>
                    <th className="px-4 py-3 font-semibold">Received Qty</th>
                    <th className="px-4 py-3 font-semibold">Expiry Date</th>
                    <th className="px-4 py-3 font-semibold">Batch No.</th>
                    <th className="px-4 py-3 font-semibold">Condition</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">Gula Pasir</p>
                      <p className="text-xs text-slate-400">RM-001</p>
                    </td>

                    <td className="px-4 py-4 text-slate-700">500 kg</td>

                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={receivedQty}
                        onChange={(event) => setReceivedQty(event.target.value)}
                        className="h-10 w-28 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(event) => setExpiryDate(event.target.value)}
                        className="h-10 w-40 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={batchNo}
                        onChange={(event) => setBatchNo(event.target.value)}
                        className="h-10 w-40 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={condition}
                        onChange={(event) => setCondition(event.target.value)}
                        className="h-10 rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                      >
                        <option>Good</option>
                        <option>Damaged</option>
                        <option>Partial</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add receiving notes here, such as truck condition, arrival time, or packaging condition."
              className="min-h-[110px] w-full rounded-xl border border-red-100 px-4 py-3 text-sm outline-none focus:border-red-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Receipt Confirmation
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto]">
              <div>
                <label className="flex items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(event) => setIsConfirmed(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    I confirm that the received goods are correct and have been
                    inspected physically by the warehouse team.
                  </span>
                </label>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Total Received
                    </p>
                    <p className="mt-1 text-lg font-bold text-red-600">
                      {receivedQty} kg
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Received By
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      Admin User (Warehouse)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="h-11 rounded-lg border border-slate-200 bg-white px-6 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>

                <button className="h-11 rounded-lg bg-red-700 px-6 text-sm font-medium text-white hover:bg-red-800">
                  Save GR
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Package size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Inventory Insight
              </h3>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              This receipt will increase warehouse stock by the received quantity.
              Current warehouse capacity is within the safe threshold.
            </p>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Safety Stock</span>
                <span className="font-bold text-slate-900">200 kg</span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[70%] rounded-full bg-red-600" />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>Current: 850 kg</span>
                <span>Target: 1.000 kg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}