'use client'

import { useEffect, useMemo, useState } from 'react'
import { Target, Warning, CheckCircle, FloppyDisk } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; sku: string; name: string; unit: string }
type Forecast = { id: string; product_id: string; target_qty: number }

const currentPeriode = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function ForecastClient() {
  const supabase = useMemo(() => createClient(), [])
  const [products, setProducts] = useState<Product[]>([])
  const [periode, setPeriode] = useState(currentPeriode())
  const [wilayah, setWilayah] = useState('')
  const [existing, setExisting] = useState<Record<string, Forecast>>({})
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // load FG products once
  useEffect(() => {
    let active = true
    const load = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, sku, name, unit')
        .eq('is_active', true).eq('type', 'FINISHED_GOOD').order('name')
      if (active) setProducts((data as Product[]) ?? [])
    }
    load()
    return () => { active = false }
  }, [supabase])

  // load existing forecast whenever periode/wilayah changes (UC-SLS-03 alt 2a: prefill = overwrite)
  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true); setMsg(null)
      const { data } = await supabase
        .from('an_sales_forecast')
        .select('id, product_id, target_qty')
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
    // validasi: target_qty harus bilangan positif
    const entries = Object.entries(targets)
    for (const [, v] of entries) {
      if (v !== '' && !(Number(v) > 0)) {
        setMsg({ type: 'err', text: 'Target kuantitas harus berupa bilangan positif.' }); return
      }
    }
    setSaving(true)
    const { data: auth } = await supabase.auth.getUser()

    const toUpsert = products
      .filter((p) => targets[p.id] && Number(targets[p.id]) > 0)
      .map((p) => ({
        product_id: p.id, wilayah, periode,
        target_qty: Number(targets[p.id]),
        created_by: auth.user?.id ?? null,
      }))

    // produk yang sebelumnya ada target tapi sekarang dikosongkan -> hapus
    const toDelete = Object.values(existing)
      .filter((f) => !targets[f.product_id] || Number(targets[f.product_id]) <= 0)
      .map((f) => f.id)

    let err
    if (toUpsert.length) {
      ;({ error: err } = await supabase.from('an_sales_forecast').upsert(toUpsert, { onConflict: 'product_id,wilayah,periode' }))
    }
    if (!err && toDelete.length) {
      ;({ error: err } = await supabase.from('an_sales_forecast').delete().in('id', toDelete))
    }
    setSaving(false)
    if (err) { setMsg({ type: 'err', text: err.message }); return }
    setMsg({ type: 'ok', text: `Forecast periode ${periode}${wilayah ? ` · ${wilayah}` : ''} berhasil disimpan.` })
    // reload existing
    const { data } = await supabase.from('an_sales_forecast').select('id, product_id, target_qty').eq('periode', periode).eq('wilayah', wilayah)
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
        { label: 'Sales & Marketing', href: '/apps/snm' },
        { label: 'Marketing', href: '/apps/snm/marketing' },
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Wilayah (opsional)</label>
              <Input value={wilayah} onChange={(e) => setWilayah(e.target.value)} placeholder="Semua / e.g. DKI Jakarta" className="h-10 border-slate-200 w-56" />
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
                  <th className="px-6 py-3.5 font-medium">SKU</th>
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
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{p.sku}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number" value={targets[p.id] ?? ''}
                          onChange={(e) => setTargets({ ...targets, [p.id]: e.target.value })}
                          placeholder="0" className="h-9 w-32 border-slate-200 text-right"
                        />
                        <span className="text-xs text-slate-400 w-10">{p.unit}</span>
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
