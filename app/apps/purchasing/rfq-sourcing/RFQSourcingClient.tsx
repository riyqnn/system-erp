'use client'

import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

const sentRFQHistory = [
  {
    supplier: 'PT Musim Mas',
    sentDate: '10 Apr 2026',
    deadline: '15 Apr 2026',
    status: 'Waiting Response',
  },
  {
    supplier: 'PT Musim Mas',
    sentDate: '10 Apr 2026',
    deadline: '15 Apr 2026',
    status: 'Offer Received',
  },
]

export function RFQSourcingClient() {
  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'RFQ / Sourcing' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="RFQ / Sourcing Supplier"
          description="Find and register new suppliers for products without registered suppliers."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Sourcing Workflow
            </h3>

            <div className="mt-5 space-y-5">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600">
                    Send RFQ
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Send quotation request to candidate supplier.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Input Quotation
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Record offer submitted by supplier.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  3
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Register Supplier
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Select and register supplier if approved.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
              <div className="border-b border-red-50 bg-yellow-50 px-5 py-3 text-sm text-yellow-800">
                This product does not have an active registered supplier. Please start sourcing a new supplier.
              </div>

              <div className="space-y-6 p-5">
                <section>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Required Product Detail
                  </h3>

                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                    <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                      <p className="text-[11px] font-semibold uppercase text-slate-500">
                        Product
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        Minyak Nabati
                      </p>
                      <p className="text-xs text-slate-600">(RM-004)</p>
                    </div>

                    <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                      <p className="text-[11px] font-semibold uppercase text-slate-500">
                        Category
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        Raw Material
                      </p>
                    </div>

                    <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                      <p className="text-[11px] font-semibold uppercase text-slate-500">
                        Unit
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        Liter (L)
                      </p>
                    </div>

                    <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                      <p className="text-[11px] font-semibold uppercase text-slate-500">
                        Required Qty
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        500 L
                      </p>
                    </div>

                    <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                      <p className="text-[11px] font-semibold uppercase text-slate-500">
                        PR Reference
                      </p>
                      <p className="mt-1 text-sm font-bold text-indigo-700">
                        PR-202604-007
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                    Candidate Supplier Data
                  </h3>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Example: PT Sumber Pangan Jaya"
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        PIC / Contact Name
                      </label>
                      <input
                        type="text"
                        placeholder="Full name of person in charge"
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="email@company.com"
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="+62 8xx xxxx xxxx"
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Address
                      </label>
                      <textarea
                        placeholder="Complete office or warehouse address of supplier"
                        className="min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                    RFQ Detail
                  </h3>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Quotation Deadline
                      </label>
                      <input
                        type="date"
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Specification Notes
                      </label>
                      <textarea
                        placeholder="Example: Halal certification, 20L jerrycan packaging..."
                        className="min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-3">
                    <button className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                      Cancel
                    </button>

                    <button className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700">
                      Send RFQ
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Sent RFQ History
              </h3>

              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">
                        Candidate Supplier
                      </th>
                      <th className="px-4 py-3 font-semibold">Sent Date</th>
                      <th className="px-4 py-3 font-semibold">Deadline</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {sentRFQHistory.map((item, index) => (
                      <tr key={`${item.supplier}-${index}`}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.supplier}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.sentDate}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.deadline}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.status === 'Waiting Response'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">
                            View Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-xl bg-purple-700 p-5 text-white shadow-sm">
                <h3 className="font-semibold">Automated Sourcing Insight</h3>
                <p className="mt-2 text-sm leading-relaxed text-purple-100">
                  We found 3 additional suppliers in your region that specialize in vegetable oil.
                  Would you like to invite them?
                </p>

                <button className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50">
                  View Recommendations
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase text-purple-700">
                    Supplier Integrity
                  </span>
                  <span className="text-yellow-500">◎</span>
                </div>

                <h3 className="mt-3 font-semibold text-slate-900">
                  Compliance Checklist
                </h3>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>✅ Legal Entity Verification</p>
                  <p>✅ Sustainability Certification</p>
                  <p>✅ Safety Management Audit</p>
                </div>

                <p className="mt-4 text-xs italic text-slate-400">
                  Update checklist in Master Supplier settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}