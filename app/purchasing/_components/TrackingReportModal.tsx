'use client'

import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'

type TrackingContext = {
  poNo: string
  supplierName: string
  productName: string
  qty: number
  unit: string
}

type TrackingReportModalProps = {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
  trackingContext?: TrackingContext | null
  title?: string
  contextLabel?: string
}

const initialForm = {
  trackingStatus: 'IN_PROCESS',
  estimatedArrivalDate: '',
  supplierNotes: '',
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

export function TrackingReportModal({
  isOpen,
  onClose,
  onSaved,
  trackingContext = null,
  title = 'Input Tracking Report',
  contextLabel = 'Delivery Status Update',
}: TrackingReportModalProps) {
  const [form, setForm] = useState(initialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm)
      setErrorMessage('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const hasTrackingContext = Boolean(trackingContext?.poNo)

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    if (!hasTrackingContext || !trackingContext) {
      setErrorMessage(
        'Please open tracking report from a specific purchase order in Monitoring.'
      )
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/tracking-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poNumber: trackingContext.poNo,
          trackingStatus: form.trackingStatus,
          estimatedArrivalDate: form.estimatedArrivalDate,
          supplierNotes: form.supplierNotes,
          createdByName: 'Purchasing Staff',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save tracking report')
      }

      onSaved?.()
      onClose()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save tracking report'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">{contextLabel}</p>
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
          {trackingContext ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                Tracking For
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {trackingContext.poNo} — {trackingContext.supplierName}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {trackingContext.productName} • {formatNumber(trackingContext.qty)}{' '}
                {trackingContext.unit}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
              Tracking report should be opened from a specific purchase order in
              Monitoring.
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Tracking Status
            </label>
            <select
              value={form.trackingStatus}
              onChange={(event) =>
                handleChange('trackingStatus', event.target.value)
              }
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
            >
              <option value="SENT_TO_SUPPLIER">Sent to Supplier</option>
              <option value="IN_PROCESS">In Process</option>
              <option value="IN_DELIVERY">In Delivery</option>
              <option value="DELAYED">Delayed</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Estimated Arrival Date
            </label>
            <input
              type="date"
              value={form.estimatedArrivalDate}
              onChange={(event) =>
                handleChange('estimatedArrivalDate', event.target.value)
              }
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Supplier Notes
            </label>
            <textarea
              value={form.supplierNotes}
              onChange={(event) =>
                handleChange('supplierNotes', event.target.value)
              }
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
            onClick={handleSave}
            disabled={isSaving || !hasTrackingContext}
            className="rounded-lg bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isSaving ? 'Saving...' : 'Save Tracking Report'}
          </button>
        </div>
      </div>
    </div>
  )
}