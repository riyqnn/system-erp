'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  WarningCircle,
  PaperPlaneTilt,
  ClockCounterClockwise,
  CheckCircle,
  ArrowRight,
  Target,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

export function PriceNegotiationClient() {
  const [offerPrice, setOfferPrice] = useState('98.000')
  const [quantity, setQuantity] = useState('100')
  const [deadline, setDeadline] = useState('2026-04-15')
  const [notes, setNotes] = useState('')

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Price Negotiation' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Price Negotiation"
          description="Record supplier price negotiation before creating a purchase order."
        />

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <WarningCircle size={22} className="mt-0.5 text-yellow-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Price negotiation is required for the following product.
                </p>

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
                    RM-003 — Coffee Extract
                  </span>
                  <span className="rounded-full bg-purple-100 px-3 py-1 font-semibold text-purple-700">
                    Supplier: PT Aneka Coffee (VND-RM-004)
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Reference Price
              </p>
              <p className="text-2xl font-bold text-slate-900">
                Rp 105.000 / kg
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PaperPlaneTilt size={20} className="text-purple-700" />
            <h3 className="text-lg font-semibold text-slate-900">
              Submit Offer
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px_220px_1fr]">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Proposed Price
              </label>
              <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200 focus-within:border-red-300">
                <span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">
                  Rp
                </span>
                <input
                  type="text"
                  value={offerPrice}
                  onChange={(event) => setOfferPrice(event.target.value)}
                  className="w-full px-3 text-sm outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Reference: Rp 105.000/kg
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Quantity
              </label>
              <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200 focus-within:border-red-300">
                <input
                  type="text"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-full px-3 text-sm outline-none"
                />
                <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                  kg
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Confirmation Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Negotiation Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add message for supplier..."
                className="min-h-[40px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>

            <button className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700">
              Send Offer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <ClockCounterClockwise size={20} className="text-purple-700" />
              <h3 className="text-lg font-semibold text-slate-900">
                Offer History
              </h3>
            </div>

            <div className="relative space-y-5 border-l-2 border-purple-100 pl-6">
              <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-purple-700" />
              <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Offer Sent</p>
                    <p className="text-xs text-slate-500">10 Apr 2026, 09:15</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Sent
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  Proposed price: Rp 98.000/kg | Qty: 100 kg
                </p>
              </div>

              <div className="absolute -left-[7px] top-[132px] h-3 w-3 rounded-full bg-yellow-700" />
              <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Supplier Response Received
                    </p>
                    <p className="text-xs text-slate-500">11 Apr 2026, 14:30</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Responded
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  PT Aneka Coffee proposed Rp 102.000/kg
                </p>
              </div>

              <div className="rounded-xl border border-green-100 bg-green-50 p-5">
                <p className="text-xs font-bold uppercase text-green-700">
                  Final Agreed Price
                </p>

                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-white p-4">
                    <p className="text-xs text-slate-500">Final Price</p>
                    <p className="mt-1 text-lg font-bold text-green-700">
                      Rp 102.000
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      Between Rp 98.000 and Rp 102.000/kg
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-4">
                    <p className="text-xs text-slate-500">Quantity</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      100 kg
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-4">
                    <p className="text-xs text-slate-500">Estimated Total</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      Rp 10.200.000
                    </p>
                  </div>
                </div>

                <button className="mt-5 w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800">
                  Approve and Save Final Price
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <CheckCircle size={20} className="text-green-700" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Price Has Been Agreed
                  </h3>
                  <span className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase text-green-700">
                    Agreed
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Final Price</span>
                  <span className="font-bold text-slate-900">
                    Rp 100.000/kg
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Total Offer</span>
                  <span className="text-right font-bold text-slate-900">
                    Rp 10.000.000
                    <br />
                    <span className="text-xs font-normal text-slate-500">
                      Qty: 100 kg
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Valid Until</span>
                  <span className="font-bold text-red-600">30 Apr 2026</span>
                </div>
              </div>

              <Link
                href="/apps/purchasing/purchase-orders"
                className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800"
              >
                Continue to Create Purchase Order
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-slate-900 p-5 text-white shadow-sm">
              <div className="absolute inset-0 opacity-30">
                <div className="h-full w-full bg-gradient-to-br from-teal-500 via-slate-900 to-black" />
              </div>

              <div className="relative">
                <Target size={26} className="text-teal-300" />
                <h3 className="mt-12 text-lg font-semibold">
                  Vendor Relationship Management
                </h3>
                <p className="mt-2 text-sm text-slate-200">
                  Maintain long-term partnerships with optimized pricing and
                  transparent communication.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700">
            Input Tracking Report
          </button>
        </div>
      </div>
    </ModuleLayout>
  )
}