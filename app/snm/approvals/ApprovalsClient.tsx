'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, XCircle, ClipboardText, Package, Factory } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { rupiah, fmtDate, genDocId, notify, loadOutstandingByCustomer } from '@/lib/snm'

type PendingSO = {
  so_id: string
  cust_id: string
  so_date: string
  so_type: 'REGULAR' | 'PO'
  grand_total: number
  ms_customer: { cust_name: string; credit_limit: number } | null
}
type SoItem = { so_detail_id: number; product_id: string; qty_order: number; unit_price: number; subtotal: number; ms_product: { product_name: string; uom: string } | null }

export function ApprovalsClient({ userId }: { userId: number }) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<PendingSO[]>([])
  const [outstanding, setOutstanding] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [active, setActive] = useState<PendingSO | null>(null)
  const [items, setItems] = useState<SoItem[]>([])

  const load = async () => {
    setLoading(true)
    const [soRes, out] = await Promise.all([
      supabase.from('tr_so_header')
        .select('so_id, cust_id, so_date, so_type, grand_total, ms_customer(cust_name, credit_limit)')
        .eq('approval_status', 'WAITING_APPROVAL')
        .order('created_at', { ascending: true }),
      loadOutstandingByCustomer(supabase),
    ])
    setRows((soRes.data as unknown as PendingSO[]) ?? [])
    setOutstanding(out)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openSO(o: PendingSO) {
    setActive(o)
    setItems([])
    const { data } = await supabase.from('tr_so_detail')
      .select('so_detail_id, product_id, qty_order, unit_price, subtotal, ms_product(product_name, uom)')
      .eq('so_id', o.so_id)
    setItems((data as unknown as SoItem[]) ?? [])
  }

  // UC-SLS-08: approve (+ UC-SLS-05A: PO → request production)
  async function approve(o: PendingSO) {
    setBusy(true)
    const { error } = await supabase.from('tr_so_header')
      .update({ approval_status: 'APPROVED', approved_by: userId, approved_at: new Date().toISOString(), rejection_reason: null })
      .eq('so_id', o.so_id)
    if (error) { setBusy(false); alert(error.message); return }

    // Pre-Order → raise production requests for each FG item (modul Production)
    if (o.so_type === 'PO') {
      const { data: dets } = await supabase.from('tr_so_detail').select('product_id, qty_order').eq('so_id', o.so_id)
      for (const d of (dets as { product_id: string; qty_order: number }[] ?? [])) {
        const prId = await genDocId(supabase, 'tr_production_request', 'production_request_id', 'PRD')
        await supabase.from('tr_production_request').insert({
          production_request_id: prId,
          fg_product_id: d.product_id,
          qty_requested: d.qty_order,
          request_date: new Date().toISOString(),
          requested_by: userId,
          status: 'PENDING',
          notes: `Pre-Order ${o.so_id} (${o.ms_customer?.cust_name ?? ''})`,
        })
      }
      await notify(supabase, {
        recipientRole: 'Production', type: 'INFORMATION', priority: 'HIGH', sourceModule: 'SNM',
        title: 'Permintaan produksi dari Pre-Order', message: `${o.so_id} disetujui — mohon jadwalkan produksi item terkait.`,
        sourceRefId: o.so_id, sourceRefType: 'SO', actionUrl: '/production/resep-order', createdBy: userId,
      })
    }

    // UC-SLS-09: notify Admin Sales
    await notify(supabase, {
      recipientRole: 'SNM', type: 'APPROVAL', priority: 'MEDIUM',
      title: 'Sales Order disetujui', message: `${o.so_id} (${o.ms_customer?.cust_name ?? ''}) telah disetujui — siap terbitkan Delivery Order.`,
      sourceRefId: o.so_id, sourceRefType: 'SO', actionUrl: '/snm/sales', createdBy: userId,
    })
    setBusy(false)
    setActive(null)
    await load()
  }

  // UC-SLS-08 alt: reject
  async function reject(o: PendingSO) {
    const reason = prompt('Alasan penolakan (wajib):')
    if (!reason || !reason.trim()) return
    setBusy(true)
    const { error } = await supabase.from('tr_so_header')
      .update({ approval_status: 'REJECTED_CREDIT', rejection_reason: reason.trim(), approved_by: userId, approved_at: new Date().toISOString() })
      .eq('so_id', o.so_id)
    if (error) { setBusy(false); alert(error.message); return }
    await notify(supabase, {
      recipientRole: 'SNM', type: 'WARNING', priority: 'HIGH',
      title: 'Sales Order ditolak', message: `${o.so_id}: ${reason.trim()}`,
      sourceRefId: o.so_id, sourceRefType: 'SO', actionUrl: '/snm/sales', createdBy: userId,
    })
    setBusy(false)
    setActive(null)
    await load()
  }

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing', href: '/snm' },
        { label: 'Approval Manager' },
      ]}
    >
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Otoritas Manajerial</p>
          <ModuleHeader title="Approval Manager" />
          <p className="text-slate-500 -mt-4 text-sm">
            Tinjau Sales Order berisiko (lewat credit limit, nilai ≥ {rupiah(500_000_000)}, atau Pre-Order).
            {rows.length > 0 && <> · <span className="text-amber-600 font-medium">{rows.length} menunggu</span></>}
          </p>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 font-medium">No. SO</th>
                    <th className="px-6 py-3.5 font-medium">Customer</th>
                    <th className="px-6 py-3.5 font-medium">Tipe</th>
                    <th className="px-6 py-3.5 font-medium">Tanggal</th>
                    <th className="px-6 py-3.5 font-medium text-right">Grand Total</th>
                    <th className="px-6 py-3.5 font-medium text-right">Sisa Kredit</th>
                    <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Tidak ada SO yang menunggu persetujuan</p>
                    </td></tr>
                  ) : rows.map((o) => {
                    const credit = o.ms_customer?.credit_limit ?? 0
                    const remaining = credit - (outstanding[o.cust_id] ?? 0)
                    return (
                      <tr key={o.so_id} className="hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => openSO(o)}>
                        <td className="px-6 py-4"><span className="font-mono font-semibold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">{o.so_id}</span></td>
                        <td className="px-6 py-4 font-medium text-slate-900">{o.ms_customer?.cust_name ?? '—'}</td>
                        <td className="px-6 py-4">
                          {o.so_type === 'PO'
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Pre-Order</span>
                            : <span className="text-slate-400 text-xs">Regular</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(o.so_date)}</td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium text-slate-900">{rupiah(o.grand_total)}</td>
                        <td className={`px-6 py-4 text-right tabular-nums font-medium ${remaining - o.grand_total < 0 ? 'text-[#dc2626]' : 'text-green-600'}`}>{rupiah(remaining)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs" disabled={busy} onClick={() => approve(o)}>Setujui</Button>
                            <Button variant="outline" size="sm" className="h-8 border-red-200 text-red-600 hover:bg-red-50 text-xs" disabled={busy} onClick={() => reject(o)}>Tolak</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review drawer */}
      {active && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setActive(null)} />
          <div className="fixed inset-y-0 right-0 w-[460px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono">{active.so_id}{active.so_type === 'PO' ? ' · Pre-Order' : ''}</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{active.ms_customer?.cust_name}</h2>
              </div>
              <button onClick={() => setActive(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {active.so_type === 'PO' && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800 flex items-center gap-1.5">
                  <Factory className="w-4 h-4" weight="fill" /> Pre-Order: menyetujui akan otomatis membuat permintaan produksi.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Credit Limit" value={rupiah(active.ms_customer?.credit_limit ?? 0)} />
                <Stat label="Saldo Piutang" value={rupiah(outstanding[active.cust_id] ?? 0)} tone="text-amber-600" />
                <Stat label="Nilai SO" value={rupiah(active.grand_total)} />
                <Stat label="Sisa Kredit" value={rupiah((active.ms_customer?.credit_limit ?? 0) - (outstanding[active.cust_id] ?? 0))}
                  tone={(active.ms_customer?.credit_limit ?? 0) - (outstanding[active.cust_id] ?? 0) - active.grand_total < 0 ? 'text-[#dc2626]' : 'text-green-600'} />
              </div>
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Item Pesanan</div>
                <div className="divide-y divide-slate-50">
                  {items.map((it) => (
                    <div key={it.so_detail_id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{it.ms_product?.product_name}</p>
                        <p className="text-xs text-slate-400">{it.qty_order} {it.ms_product?.uom} × {rupiah(it.unit_price)}</p>
                      </div>
                      <span className="tabular-nums text-slate-700">{rupiah(it.subtotal)}</span>
                    </div>
                  ))}
                  {items.length === 0 && <div className="px-4 py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5"><ClipboardText className="w-4 h-4" /> Memuat item…</div>}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-2">
              <Button className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white" disabled={busy} onClick={() => approve(active)}>
                <CheckCircle className="w-4 h-4 mr-1.5" weight="fill" /> Setujui
              </Button>
              <Button variant="outline" className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50" disabled={busy} onClick={() => reject(active)}>
                <XCircle className="w-4 h-4 mr-1.5" /> Tolak
              </Button>
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
      <p className={`text-sm font-semibold tabular-nums mt-0.5 ${tone}`}>{value}</p>
    </div>
  )
}
