'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Scales,
  ShoppingCart,
  Package,
  FileText,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type MatchStatus =
  | 'WAITING_GR'
  | 'WAITING_INVOICE'
  | 'PARTIAL_RECEIPT'
  | 'PRICE_MISMATCH'
  | 'MATCHED'
  | 'MISMATCH'
  | 'PENDING'
  | string

type MatchingResult = {
  id: string
  checkItem: string
  checkResult: 'MATCH' | 'MISMATCH'
  detail: string
}

type ThreeWayMatching = {
  id: string
  matchingNo: string
  matchStatus: MatchStatus
  sentToFinance: boolean
  sentToFinanceAt: string | null
  createdAt: string

  poNo: string
  poDate: string | null
  poStatus: string
  poSubtotal: number
  poTaxAmount: number
  poTotalValue: number

  grNo: string
  receiptDate: string | null
  grStatus: string

  invoiceNo: string
  invoiceDate: string | null
  dueDate: string | null
  invoiceSubtotal: number
  invoiceTaxAmount: number
  invoiceGrandTotal: number
  paymentStatus: string

  supplierId: string
  supplierName: string
  supplierContact: string
  supplierAddress: string

  productCode: string
  productName: string
  category: string
  poQty: number
  grReceivedQty: number
  unit: string
  unitPrice: number

  results: MatchingResult[]
}

function formatCurrency(value: number) {
  return `Rp ${new Intl.NumberFormat('id-ID').format(value || 0)}`
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

function formatMatchStatus(status: MatchStatus) {
  const statusMap: Record<string, string> = {
    WAITING_GR: 'Waiting Goods Receipt',
    WAITING_INVOICE: 'Waiting Supplier Invoice',
    PARTIAL_RECEIPT: 'Partial Receipt',
    PRICE_MISMATCH: 'Price Mismatch',
    MATCHED: 'Matched',
    MISMATCH: 'Mismatch',
    PENDING: 'Pending',
  }

  return statusMap[status] || status
}

function getMatchStatusClass(status: MatchStatus) {
  const statusClassMap: Record<string, string> = {
    WAITING_GR: 'bg-amber-100 text-amber-700',
    WAITING_INVOICE: 'bg-orange-100 text-orange-700',
    PARTIAL_RECEIPT: 'bg-yellow-100 text-yellow-700',
    PRICE_MISMATCH: 'bg-red-100 text-red-700',
    MATCHED: 'bg-green-100 text-green-700',
    MISMATCH: 'bg-red-100 text-red-700',
    PENDING: 'bg-amber-100 text-amber-700',
  }

  return statusClassMap[status] || 'bg-slate-100 text-slate-600'
}

function getResultClass(result: 'MATCH' | 'MISMATCH') {
  return result === 'MATCH'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'
}

function canSendToFinance(matching: ThreeWayMatching | null) {
  if (!matching) return false

  return matching.matchStatus === 'MATCHED' && !matching.sentToFinance
}

export function ThreeWayMatchingClient() {
  const router = useRouter()

  const [matchings, setMatchings] = useState<ThreeWayMatching[]>([])
  const [selectedMatchingId, setSelectedMatchingId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchMatchings = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/three-way-matchings', {
        cache: 'no-store',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Failed to fetch three-way matching data'
        )
      }

      const matchingData = result.data || []
      setMatchings(matchingData)

      if (matchingData.length > 0) {
        setSelectedMatchingId((currentId) => {
          const currentStillExists = matchingData.some(
            (item: ThreeWayMatching) => item.id === currentId
          )

          return currentStillExists ? currentId : matchingData[0].id
        })
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to fetch three-way matching data'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMatchings()
  }, [])

  const selectedMatching = useMemo(() => {
    return matchings.find((item) => item.id === selectedMatchingId) || null
  }, [matchings, selectedMatchingId])

  const matchedCount = matchings.filter(
    (item) => item.matchStatus === 'MATCHED'
  ).length

  const reviewRequiredCount = matchings.filter(
    (item) =>
      item.matchStatus !== 'MATCHED' &&
      item.matchStatus !== 'WAITING_GR' &&
      item.matchStatus !== 'WAITING_INVOICE'
  ).length

  const pendingCount = matchings.filter((item) =>
    ['WAITING_GR', 'WAITING_INVOICE', 'PENDING'].includes(item.matchStatus)
  ).length

  const handleSendToFinance = async () => {
    if (!selectedMatching) return

    if (!canSendToFinance(selectedMatching)) {
      setErrorMessage(
        selectedMatching.sentToFinance
          ? 'This matching document has already been sent to Finance.'
          : 'Only matched documents can be sent to Finance.'
      )
      return
    }

    const confirmed = window.confirm(
      'Send this matched document to Finance Account Payable?'
    )

    if (!confirmed) return

    try {
      setIsSending(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/three-way-matchings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchingNo: selectedMatching.matchingNo,
          poNumber: selectedMatching.poNo,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Failed to send matching to Finance Account Payable'
        )
      }

      setMatchings((prev) =>
        prev.map((item) =>
          item.id === selectedMatching.id
            ? {
                ...item,
                sentToFinance: true,
                sentToFinanceAt: new Date().toISOString(),
                paymentStatus: 'PENDING_VERIFICATION',
              }
            : item
        )
      )

      alert('Three-Way Matching has been sent to Finance Account Payable.')
      router.push('/finance/account-payable')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to send matching to Finance Account Payable'
      )
    } finally {
      setIsSending(false)
    }
  }

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
          description="Match purchase order, goods receipt, and supplier invoice before sending to Finance Account Payable."
        />

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Matched
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {matchedCount}
                </h3>
              </div>
              <div className="rounded-xl bg-green-50 p-3">
                <CheckCircle size={22} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Review Required
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {reviewRequiredCount}
                </h3>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <WarningCircle size={22} className="text-red-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Pending
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">
                  {pendingCount}
                </h3>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <Scales size={22} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Scales size={20} className="text-red-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Select Matching Document
            </h3>
          </div>

          {isLoading ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              Loading three-way matching data...
            </div>
          ) : matchings.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No matching document is available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.8fr]">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Supplier Invoice
                </label>
                <select
                  value={selectedMatchingId}
                  onChange={(event) => setSelectedMatchingId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-red-100 px-3 text-sm font-medium outline-none focus:border-red-300"
                >
                  {matchings.map((matching) => (
                    <option key={matching.id} value={matching.id}>
                      {matching.invoiceNo} — {matching.supplierName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Matching No
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {selectedMatching?.matchingNo || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Supplier
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {selectedMatching?.supplierName || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Status
                  </p>
                  {selectedMatching && (
                    <span
                      className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getMatchStatusClass(
                        selectedMatching.matchStatus
                      )}`}
                    >
                      {formatMatchStatus(selectedMatching.matchStatus)}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Finance
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {selectedMatching?.sentToFinance ? 'Sent' : 'Not Sent'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedMatching && (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ShoppingCart size={20} className="text-red-600" />
                  <h3 className="font-semibold text-slate-900">
                    Purchase Order
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">PO Number</span>
                    <span className="font-semibold text-slate-900">
                      {selectedMatching.poNo}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">PO Date</span>
                    <span className="font-semibold text-slate-900">
                      {formatDate(selectedMatching.poDate)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(selectedMatching.poTotalValue)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Package size={20} className="text-red-600" />
                  <h3 className="font-semibold text-slate-900">
                    Goods Receipt
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">GR Number</span>
                    <span className="font-semibold text-slate-900">
                      {selectedMatching.grNo}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Receipt Date</span>
                    <span className="font-semibold text-slate-900">
                      {formatDate(selectedMatching.receiptDate)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Received Qty</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(selectedMatching.grReceivedQty)}{' '}
                      {selectedMatching.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-red-600" />
                  <h3 className="font-semibold text-slate-900">
                    Supplier Invoice
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Invoice No</span>
                    <span className="font-semibold text-slate-900">
                      {selectedMatching.invoiceNo}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Invoice Date</span>
                    <span className="font-semibold text-slate-900">
                      {formatDate(selectedMatching.invoiceDate)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Grand Total</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(selectedMatching.invoiceGrandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Matching Result
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Comparison result between PO, GR, and supplier invoice.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getMatchStatusClass(
                    selectedMatching.matchStatus
                  )}`}
                >
                  {formatMatchStatus(selectedMatching.matchStatus)}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Check Item</th>
                      <th className="px-4 py-3 font-semibold">Result</th>
                      <th className="px-4 py-3 font-semibold">Detail</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {selectedMatching.results.map((result) => (
                      <tr key={result.id}>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {result.checkItem}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getResultClass(
                              result.checkResult
                            )}`}
                          >
                            {result.checkResult}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {result.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Product
                    </p>
                    <p className="mt-1 font-bold text-slate-900">
                      {selectedMatching.productName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      PO Qty
                    </p>
                    <p className="mt-1 font-bold text-slate-900">
                      {formatNumber(selectedMatching.poQty)}{' '}
                      {selectedMatching.unit}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      GR Qty
                    </p>
                    <p className="mt-1 font-bold text-slate-900">
                      {formatNumber(selectedMatching.grReceivedQty)}{' '}
                      {selectedMatching.unit}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Unit Price
                    </p>
                    <p className="mt-1 font-bold text-slate-900">
                      {formatCurrency(selectedMatching.unitPrice)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedMatching.sentToFinance && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  This matching document has already been sent to Finance
                  Account Payable.
                </div>
              )}

              {selectedMatching.matchStatus !== 'MATCHED' && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  This document cannot be sent to Finance yet because the
                  matching status is {formatMatchStatus(selectedMatching.matchStatus)}.
                </div>
              )}

              <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Review Document
                </button>

                <button
                  type="button"
                  onClick={handleSendToFinance}
                  disabled={isSending || !canSendToFinance(selectedMatching)}
                  className="rounded-lg bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSending
                    ? 'Sending...'
                    : selectedMatching.sentToFinance
                      ? 'Already Sent to Finance'
                      : 'Confirm and Send to Finance'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ModuleLayout>
  )
}