import Link from 'next/link'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { CheckCircle, FileText, CreditCard } from '@phosphor-icons/react/dist/ssr'

export default function PurchasingFinancePage() {
  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/purchasing' },
        { label: 'Finance Handoff' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Finance Handoff"
          description="Three-Way Matching documents that have been confirmed and sent to Finance."
        />

        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle size={28} className="mt-1 text-green-700" />
            <div>
              <h3 className="text-lg font-bold text-green-800">
                Document Successfully Sent to Finance
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-green-700">
                The matched purchasing document has passed Three-Way Matching and
                is now handed over to Finance for account payable and payment
                processing.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={22} className="text-red-700" />
              <h3 className="font-semibold text-slate-900">
                Matched Document
              </h3>
            </div>
            <p className="text-sm text-slate-600">
              PO, Goods Receipt, and Invoice have been validated through
              Three-Way Matching.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={22} className="text-red-700" />
              <h3 className="font-semibold text-slate-900">
                Account Payable
              </h3>
            </div>
            <p className="text-sm text-slate-600">
              Finance can continue the process by reviewing AP and preparing the
              payment schedule.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle size={22} className="text-red-700" />
              <h3 className="font-semibold text-slate-900">
                Status
              </h3>
            </div>
            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Sent to Finance
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Integration Flow
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="rounded-lg bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700">
              Purchase Order
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700">
              Goods Receipt
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700">
              Three-Way Matching
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center text-sm font-semibold text-green-700">
              Finance Handoff
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700">
              Payment Process
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/purchasing/three-way-matching"
            className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Back to Three-Way Matching
          </Link>

          <Link
            href="/purchasing"
            className="rounded-lg bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Back to Purchasing Dashboard
          </Link>
        </div>
      </div>
    </ModuleLayout>
  )
}