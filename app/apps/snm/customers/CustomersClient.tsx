'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus, MagnifyingGlass, X, PencilSimple, Eye, Prohibit, CheckCircle,
  Users, Warning,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'

type Customer = {
  id: string
  cust_code: string
  cust_name: string
  category: 'MODERN_TRADE' | 'GENERAL_TRADE' | 'AGEN_DISTRIBUTOR'
  address: string | null
  wilayah: string | null
  credit_limit: number
  payment_term: 'COD' | 'NET_7' | 'NET_14' | 'NET_30' | 'NET_45'
  is_active: boolean
  outstanding_receivable: number
  available_credit: number
}

const CATEGORY_LABEL: Record<string, string> = {
  MODERN_TRADE: 'Modern Trade',
  GENERAL_TRADE: 'General Trade',
  AGEN_DISTRIBUTOR: 'Agen Distributor',
}
const CATEGORY_COLORS: Record<string, string> = {
  MODERN_TRADE: 'bg-blue-50 text-blue-700',
  GENERAL_TRADE: 'bg-amber-50 text-amber-700',
  AGEN_DISTRIBUTOR: 'bg-purple-50 text-purple-700',
}
const PAYMENT_TERMS = ['COD', 'NET_7', 'NET_14', 'NET_30', 'NET_45'] as const
const CATEGORIES = ['MODERN_TRADE', 'GENERAL_TRADE', 'AGEN_DISTRIBUTOR'] as const

const rupiah = (n: number) =>
  'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

type FormState = {
  cust_name: string
  category: Customer['category']
  address: string
  wilayah: string
  credit_limit: string
  payment_term: Customer['payment_term']
  is_active: boolean
}

const emptyForm: FormState = {
  cust_name: '',
  category: 'GENERAL_TRADE',
  address: '',
  wilayah: '',
  credit_limit: '',
  payment_term: 'NET_30',
  is_active: true,
}

export function CustomersClient() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('All')
  const [error, setError] = useState<string | null>(null)

  const [detail, setDetail] = useState<Customer | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('v_customer_credit')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows((data as Customer[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = rows.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      c.cust_name.toLowerCase().includes(q) ||
      c.cust_code.toLowerCase().includes(q) ||
      (c.wilayah ?? '').toLowerCase().includes(q)
    const matchCat = catFilter === 'All' || c.category === catFilter
    return matchSearch && matchCat
  })

  const activeCount = rows.filter((c) => c.is_active).length
  const overLimit = rows.filter((c) => c.available_credit < 0).length

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }
  function openEdit(c: Customer) {
    setEditing(c)
    setForm({
      cust_name: c.cust_name,
      category: c.category,
      address: c.address ?? '',
      wilayah: c.wilayah ?? '',
      credit_limit: String(c.credit_limit ?? 0),
      payment_term: c.payment_term,
      is_active: c.is_active,
    })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSave() {
    setFormError(null)
    if (!form.cust_name.trim()) { setFormError('Nama customer wajib diisi.'); return }
    const credit = Number(form.credit_limit)
    if (!(credit > 0)) { setFormError('Credit limit harus bernilai positif.'); return } // UC-01 6a

    setSaving(true)
    const payload = {
      cust_name: form.cust_name.trim(),
      category: form.category,
      address: form.address.trim() || null,
      wilayah: form.wilayah.trim() || null,
      credit_limit: credit,
      payment_term: form.payment_term,
      is_active: form.is_active,
    }

    let err
    if (editing) {
      ;({ error: err } = await supabase.from('customers').update(payload).eq('id', editing.id))
    } else {
      const { data: auth } = await supabase.auth.getUser()
      ;({ error: err } = await supabase
        .from('customers')
        .insert({ ...payload, created_by: auth.user?.id ?? null }))
    }
    setSaving(false)
    if (err) { setFormError(err.message); return }
    setShowForm(false)
    await load()
  }

  // UC-01 alt 3b: tolak nonaktif kalau ada SO aktif
  async function toggleActive(c: Customer) {
    if (c.is_active) {
      const { count } = await supabase
        .from('sales_orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', c.id)
        .in('approval_status', ['DRAFT', 'WAITING_APPROVAL', 'APPROVED'])
      if ((count ?? 0) > 0) {
        alert('Customer tidak dapat dinonaktifkan karena masih memiliki Sales Order aktif.')
        return
      }
    }
    const { error } = await supabase
      .from('customers')
      .update({ is_active: !c.is_active })
      .eq('id', c.id)
    if (error) { alert(error.message); return }
    await load()
    if (detail?.id === c.id) setDetail({ ...detail, is_active: !c.is_active })
  }

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing', href: '/apps/snm' },
        { label: 'Customers' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Master Data</p>
            <ModuleHeader title="Master Customer" />
            <p className="text-slate-500 -mt-4 text-sm">
              {rows.length} customer · <span className="text-green-600 font-medium">{activeCount} aktif</span>
              {overLimit > 0 && (
                <> · <span className="text-[#dc2626] font-medium">{overLimit} lewat credit limit</span></>
              )}
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2">
            <Plus className="w-4 h-4" weight="bold" /> Tambah Customer
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari nama, kode, atau wilayah..."
              className="pl-9 h-10 border-slate-200 bg-white text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['All', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  catFilter === cat
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat === 'All' ? 'Semua' : CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Warning className="w-4 h-4" weight="fill" /> {error}
          </div>
        )}

        {/* Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 font-medium">Kode</th>
                    <th className="px-6 py-3.5 font-medium">Customer</th>
                    <th className="px-6 py-3.5 font-medium">Kategori</th>
                    <th className="px-6 py-3.5 font-medium">Wilayah</th>
                    <th className="px-6 py-3.5 font-medium text-right">Credit Limit</th>
                    <th className="px-6 py-3.5 font-medium text-right">Sisa Kredit</th>
                    <th className="px-6 py-3.5 font-medium">Term</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada customer</p>
                      <p className="text-xs mt-1">Klik “Tambah Customer” untuk mendaftarkan pelanggan B2B baru</p>
                    </td></tr>
                  ) : filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono font-semibold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">{c.cust_code}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{c.cust_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${CATEGORY_COLORS[c.category]}`}>
                          {CATEGORY_LABEL[c.category]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{c.wilayah || '—'}</td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-900">{rupiah(c.credit_limit)}</td>
                      <td className={`px-6 py-4 text-right tabular-nums font-medium ${c.available_credit < 0 ? 'text-[#dc2626]' : 'text-green-600'}`}>
                        {rupiah(c.available_credit)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{c.payment_term.replace('_', ' ')}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" onClick={() => setDetail(c)} title="Lihat detail kredit">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" onClick={() => openEdit(c)} title="Edit">
                            <PencilSimple className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-[#dc2626] hover:bg-red-50" onClick={() => toggleActive(c)} title={c.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                            {c.is_active ? <Prohibit className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail drawer — UC-SLS-02 (read-only credit info) */}
      {detail && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setDetail(null)} />
          <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono">{detail.cust_code}</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{detail.cust_name}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Kategori', value: CATEGORY_LABEL[detail.category] },
                  { label: 'Wilayah', value: detail.wilayah || '—' },
                  { label: 'Payment Term', value: detail.payment_term.replace('_', ' ') },
                  { label: 'Status', value: detail.is_active ? 'Aktif' : 'Nonaktif' },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{f.value}</p>
                  </div>
                ))}
              </div>
              {detail.address && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">Alamat</p>
                  <p className="text-sm text-slate-700 mt-1">{detail.address}</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Informasi Kredit (read-only)</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Credit Limit</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{rupiah(detail.credit_limit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Saldo Piutang Berjalan</span>
                  <span className="font-semibold text-amber-600 tabular-nums">{rupiah(detail.outstanding_receivable)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-3">
                  <span className="text-slate-500">Sisa Kredit Tersedia</span>
                  <span className={`font-bold tabular-nums ${detail.available_credit < 0 ? 'text-[#dc2626]' : 'text-green-600'}`}>
                    {rupiah(detail.available_credit)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${detail.available_credit < 0 ? 'bg-[#dc2626]' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, (detail.outstanding_receivable / (detail.credit_limit || 1)) * 100))}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Penetapan credit limit adalah domain modul Finance. Halaman ini hanya referensi pembuatan Sales Order.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100">
              <Button variant="outline" className="w-full h-10 border-slate-200" onClick={() => { openEdit(detail); setDetail(null) }}>
                <PencilSimple className="w-4 h-4 mr-2" /> Edit Customer
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create / Edit modal — UC-SLS-01 */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Customer' : 'Tambah Customer Baru'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <Field label="Nama Customer / Perusahaan">
                  <Input value={form.cust_name} onChange={(e) => setForm({ ...form, cust_name: e.target.value })} placeholder="e.g. PT Indomarco Prismatama" className="h-10 border-slate-200" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Kategori">
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Customer['category'] })} className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                    </select>
                  </Field>
                  <Field label="Payment Term">
                    <select value={form.payment_term} onChange={(e) => setForm({ ...form, payment_term: e.target.value as Customer['payment_term'] })} className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                      {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Wilayah Distribusi">
                  <Input value={form.wilayah} onChange={(e) => setForm({ ...form, wilayah: e.target.value })} placeholder="e.g. DKI Jakarta" className="h-10 border-slate-200" />
                </Field>
                <Field label="Credit Limit (Rp)">
                  <Input type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} placeholder="e.g. 500000000" className="h-10 border-slate-200" />
                </Field>
                <Field label="Alamat">
                  <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} placeholder="Alamat lengkap customer" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
                </Field>
                {editing && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                    Customer aktif
                  </label>
                )}
                {formError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <Warning className="w-4 h-4" weight="fill" /> {formError}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
                <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" onClick={handleSave} disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
