'use client'

import { useEffect, useMemo, useState } from 'react'
import { Target, Warning, CheckCircle, FloppyDisk } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { currentPeriode } from '@/lib/snm'

type Product = { product_id: string; product_name: string; uom: string }
type Forecast = { forecast_id: number; product_id: string; target_qty: number }

export function ForecastClient({ userId }: { userId: number }) {
  const supabase = useMemo(() => createClient(), [])
  const [products, setProducts] = useState<Product[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [periode, setPeriode] = useState(currentPeriode())
  const [wilayah, setWilayah] = useState('')
  const [existing, setExisting] = useState<Record<string, Forecast>>({})
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // load FG products + known regions once
  useEffect(() => {
    let active = true
    const load = async () => {
      const [pRes, cRes] = await Promise.all([
        supabase.from('ms_product').select('product_id, product_name, uom').eq('category', 'FG').eq('status', 1).order('product_name'),
        supabase.from('ms_customer').select('wilayah').not('wilayah', 'is', null),
      ])
      if (!active) return
      setProducts((pRes.data as Product[]) ?? [])
      const set = new Set<string>()
      ;(cRes.data as { wilayah: string }[] ?? []).forEach((r) => r.wilayah && set.add(r.wilayah))
      const list = Array.from(set).sort()
      setRegions(list)
      setWilayah((w) => w || list[0] || '')
    }
    load()
    return () => { active = false }
  }, [supabase])

  // load existing forecast whenever periode/wilayah changes (UC-SLS-03 alt 2a: prefill = overwrite)
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!wilayah) { if (active) setLoading(false); return }
      setLoading(true); setMsg(null)
      const { data } = await supabase
        .from('an_sales_forecast')
        .select('forecast_id, product_id, target_qty')
        .eq('periode', periode)
        .eq('wilayah', wilayah)
      if (!active) return
      const map: Record<string, Forecast> = {}
      const t: Record<string, string> = {}
      ;(data as Forecast[] ?? []).forEach((f) => { map[f.product_id] = f; t[f.product_id] = String(f.target_qty) })
      setExisting(map)
      setTargets(t)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [supabase, periode, wilayah])

  const hasExisting = Object.keys(existing).length > 0

  async function handleSave() {
    setMsg(null)
    if (!wilayah) { setMsg({ type: 'err', text: 'Pilih wilayah terlebih dahulu.' }); return }
    // validation: target_qty must be a positive number
    for (const [, v] of Object.entries(targets)) {
      if (v !== '' && !(Number(v) > 0)) {
        setMsg({ type: 'err', text: 'Target kuantitas harus berupa bilangan positif.' }); return
      }
    }
    setSaving(true)

    const toInsert = products
      .filter((p) => targets[p.product_id] && Number(targets[p.product_id]) > 0)
      .map((p) => ({
        product_id: p.product_id, wilayah, periode,
        target_qty: Number(targets[p.product_id]),
        created_by: userId,
      }))

    // Overwrite semantics: clear this period+region then insert the new set.
    const { error: delErr } = await supabase.from('an_sales_forecast').delete().eq('periode', periode).eq('wilayah', wilayah)
    let err = delErr
    if (!err && toInsert.length) {
      ;({ error: err } = await supabase.from('an_sales_forecast').insert(toInsert))
    }
    setSaving(false)
    if (err) { setMsg({ type: 'err', text: err.message }); return }
    setMsg({ type: 'ok', text: `Forecast periode ${periode} · ${wilayah} berhasil disimpan.` })

    // reload existing
    const { data } = await supabase.from('an_sales_forecast').select('forecast_id, product_id, target_qty').eq('periode', periode).eq('wilayah', wilayah)
    const map: Record<string, Forecast> = {}
    ;(data as Forecast[] ?? []).forEach((f) => { map[f.product_id] = f })
    setExisting(map)
  }

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing', href: '/snm' },
        { label: 'Marketing', href: '/snm/marketing' },
        { label: 'Sales Forecast' },
      ]}
    >
      <div className="space-y-6 max-w-[1100px] mx-auto">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Planning</p>
          <ModuleHeader title="Sales Forecast" />
          <p className="text-slate-500 -mt-4 text-sm">Tetapkan target kuantitas penjualan per item, wilayah, dan periode.</p>
        </div>

        {/* Filter */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Periode</label>
              <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-md text-sm bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Wilayah</label>
              <input list="snm-regions" value={wilayah} onChange={(e) => setWilayah(e.target.value)} placeholder="Pilih / ketik wilayah" className="h-10 px-3 border border-slate-200 rounded-md text-sm bg-white w-56" />
              <datalist id="snm-regions">
                {regions.map((r) => <option key={r} value={r} />)}
              </datalist>
            </div>
            {hasExisting && (
              <span className="text-xs text-amber-600 flex items-center gap-1.5 pb-2.5">
                <Warning className="w-4 h-4" weight="fill" /> Data periode ini sudah ada — menyimpan akan menimpa (overwrite).
              </span>
            )}
          </CardContent>
        </Card>

        {/* Targets table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 font-medium">Produk</th>
                  <th className="px-6 py-3.5 font-medium">Kode</th>
                  <th className="px-6 py-3.5 font-medium text-right w-56">Target Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={3} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-16 text-center text-slate-400">
                    <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Belum ada produk Finished Good</p>
                  </td></tr>
                ) : products.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3 font-medium text-slate-900">{p.product_name}</td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{p.product_id}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number" value={targets[p.product_id] ?? ''}
                          onChange={(e) => setTargets({ ...targets, [p.product_id]: e.target.value })}
                          placeholder="0" className="h-9 w-32 border-slate-200 text-right"
                        />
                        <span className="text-xs text-slate-400 w-10">{p.uom}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {msg && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${msg.type === 'ok' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {msg.type === 'ok' ? <CheckCircle className="w-4 h-4" weight="fill" /> : <Warning className="w-4 h-4" weight="fill" />}
            {msg.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || loading} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-6 gap-2">
            <FloppyDisk className="w-4 h-4" weight="bold" /> {saving ? 'Menyimpan…' : 'Simpan Forecast'}
          </Button>
        </div>
      </div>
    </ModuleLayout>
  )
}
