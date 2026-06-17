'use client'

import { useEffect, useMemo, useState } from 'react'
import { Receipt, Warning, X } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { rupiah, fmtDate, PAYMENT_BADGE } from '@/lib/snm'

type Invoice = {
  inv_id: string
  invoice_number: string | null
  so_id: string | null
  do_id: string | null
  cust_id: string
  inv_date: string | null
  due_date: string | null
  grand_total: number
  payment_status: 'UNPAID' | 'PAID' | 'OVERDUE'
  payment_term: string | null
  finance_status: string | null
  sent_finance_at: string | null
  ms_customer: { cust_name: string } | null
}

const today = () => new Date().toISOString().slice(0, 10)
const isOverdue = (inv: Invoice) =>
  inv.payment_status === 'OVERDUE' ||
  (inv.payment_status === 'UNPAID' && !!inv.due_date && inv.due_date < today())

const TABS = ['ALL', 'UNPAID', 'OVERDUE', 'PAID'] as const
const TAB_LABEL: Record<string, string> = { ALL: 'Semua', UNPAID: 'Belum Bayar', OVERDUE: 'Jatuh Tempo', PAID: 'Lunas' }

export function InvoicesClient() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('ALL')
  const [detail, setDetail] = useState<Invoice | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('tr_sales_invoice')
      .select('inv_id, invoice_number, so_id, do_id, cust_id, inv_date, due_date, grand_total, payment_status, payment_term, finance_status, sent_finance_at, ms_customer(cust_name)')
      .order('inv_date', { ascending: false })
    setRows((data as unknown as Invoice[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // payment status is updated by Finance
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = rows.filter((r) => {
    if (tab === 'ALL') return true
    if (tab === 'OVERDUE') return isOverdue(r)
    if (tab === 'UNPAID') return r.payment_status === 'UNPAID' && !isOverdue(r)
    return r.payment_status === tab
  })

  const totalUnpaid = rows.filter((r) => r.payment_status !== 'PAID').reduce((s, r) => s + (r.grand_total || 0), 0)
  const overdueCount = rows.filter(isOverdue).length

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing', href: '/snm' },
        { label: 'Invoices' },
      ]}
    >
      <div className="space-y-6 max-w-[1300px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Penagihan</p>
            <ModuleHeader title="Daftar Invoice & Status Pembayaran" />
            <p className="text-slate-500 -mt-4 text-sm">
              {rows.length} invoice
              {overdueCount > 0 && <> · <span className="text-[#dc2626] font-medium">{overdueCount} jatuh tempo</span></>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Total Piutang Berjalan</p>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{rupiah(totalUnpaid)}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                tab === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 font-medium">No. Invoice</th>
                    <th className="px-6 py-3.5 font-medium">Customer</th>
                    <th className="px-6 py-3.5 font-medium">Tgl Invoice</th>
                    <th className="px-6 py-3.5 font-medium">Jatuh Tempo</th>
                    <th className="px-6 py-3.5 font-medium text-right">Nilai</th>
                    <th className="px-6 py-3.5 font-medium">Status Bayar</th>
                    <th className="px-6 py-3.5 font-medium">Finance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada invoice</p>
                    </td></tr>
                  ) : filtered.map((r) => {
                    const overdue = isOverdue(r)
                    const status = overdue && r.payment_status === 'UNPAID' ? 'OVERDUE' : r.payment_status
                    return (
                      <tr key={r.inv_id} className="hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => setDetail(r)}>
                        <td className="px-6 py-4"><span className="font-mono font-semibold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">{r.invoice_number ?? r.inv_id}</span></td>
                        <td className="px-6 py-4 font-medium text-slate-900">{r.ms_customer?.cust_name ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.inv_date)}</td>
                        <td className={`px-6 py-4 text-xs ${overdue ? 'text-[#dc2626] font-medium' : 'text-slate-500'}`}>{fmtDate(r.due_date)}</td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium text-slate-900">{rupiah(r.grand_total)}</td>
                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}</span></td>
                        <td className="px-6 py-4 text-xs text-slate-500">{r.finance_status ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Warning className="w-3.5 h-3.5" /> Pencatatan pembayaran adalah domain modul Finance. Tim Sales memantau status secara read-only (UC-SLS-14).
        </p>
      </div>

      {/* Detail drawer (read-only) */}
      {detail && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setDetail(null)} />
          <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono">{detail.invoice_number ?? detail.inv_id}</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{detail.ms_customer?.cust_name}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Tanggal Invoice" value={fmtDate(detail.inv_date)} />
                <Stat label="Jatuh Tempo" value={fmtDate(detail.due_date)} tone={isOverdue(detail) ? 'text-[#dc2626]' : 'text-slate-900'} />
                <Stat label="Payment Term" value={(detail.payment_term ?? '—').replace('_', ' ')} />
                <Stat label="Status Bayar" value={isOverdue(detail) && detail.payment_status === 'UNPAID' ? 'OVERDUE' : detail.payment_status} />
                <Stat label="Sumber SO" value={detail.so_id ?? '—'} />
                <Stat label="Sumber DO" value={detail.do_id ?? '—'} />
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">Nilai Invoice</span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">{rupiah(detail.grand_total)}</span>
              </div>
              <div className="rounded-xl border border-slate-100 p-4 text-xs text-slate-500 space-y-1">
                <p>Status Finance: <b className="text-slate-700">{detail.finance_status ?? '—'}</b></p>
                <p>Ditransmisikan ke Finance: <b className="text-slate-700">{detail.sent_finance_at ? fmtDate(detail.sent_finance_at) : 'belum'}</b></p>
              </div>
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  )
}

function Stat({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${tone}`}>{value}</p>
    </div>
  )
}
