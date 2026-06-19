'use client'

import { X } from '@phosphor-icons/react'

type TrackingReportModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  contextLabel?: string
}

export function TrackingReportModal({
  isOpen,
  onClose,
  title = 'Input Tracking Report',
  contextLabel = 'Delivery Status Update',
}: TrackingReportModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {contextLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Tracking Status
            </label>
            <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300">
              <option>In Process</option>
              <option>In Delivery</option>
              <option>Delayed</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Estimated Arrival Date
            </label>
            <input
              type="date"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Supplier Notes
            </label>
            <textarea
              placeholder="Example: Supplier confirmed that the goods are already in delivery and expected to arrive tomorrow morning."
              className="min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Save Tracking Report
          </button>
        </div>
      </div>
    </div>
  )
}