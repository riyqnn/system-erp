'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  User, EnvelopeSimple, IdentificationBadge, Buildings, Shield, Phone,
  PencilSimple, FloppyDisk, X, Check, Warning, LockKey, CalendarBlank, Note,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const AVATAR_STYLES = ['adventurer', 'lorelei', 'micah', 'bottts'] as const

function dicebear(seed: string, style: string, size = 96): string {
  const safe = (AVATAR_STYLES as readonly string[]).includes(style) ? style : 'adventurer'
  return `https://api.dicebear.com/9.x/${safe}/svg?seed=${encodeURIComponent(seed)}&size=${size}`
}

type AppUser = {
  user_id: number
  username: string
  full_name: string | null
  email: string | null
  role: string
  created_at: string
}

type Profile = {
  avatar_url: string | null
  avatar_style: string
  department: string | null
  phone: string | null
  bio: string | null
}

type Toast = { type: 'ok' | 'err'; text: string }

export function ProfileClient({ user, initialProfile }: { user: AppUser; initialProfile: Profile }) {
  const [fullName, setFullName] = useState(user.full_name ?? '')
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Profile & { full_name: string }>({ ...initialProfile, full_name: user.full_name ?? '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const avatarUrl = profile.avatar_url || dicebear(user.username, profile.avatar_style)

  function startEdit() {
    setForm({ ...profile, full_name: fullName })
    setToast(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setToast(null)
  }

  async function save() {
    if (!form.full_name.trim()) { setToast({ type: 'err', text: 'Nama lengkap tidak boleh kosong.' }); return }
    setSaving(true); setToast(null)
    const payload = {
      full_name:    form.full_name.trim(),
      avatar_style: form.avatar_style,
      avatar_url:   null, // use the selected dicebear style (dynamic by username seed)
      department:   form.department?.trim() || null,
      phone:        form.phone?.trim() || null,
      bio:          form.bio?.trim() || null,
    }
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setToast({ type: 'err', text: j.error || 'Gagal menyimpan profil.' })
      return
    }
    setFullName(payload.full_name)
    setProfile({
      avatar_url: null,
      avatar_style: payload.avatar_style,
      department: payload.department,
      phone: payload.phone,
      bio: payload.bio,
    })
    setEditing(false)
    setToast({ type: 'ok', text: 'Profil berhasil diperbarui.' })
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500 mt-1">Kelola informasi pribadi dan data profil Anda.</p>
        </div>
        {!editing && (
          <Button variant="outline" onClick={startEdit} className="gap-2 shrink-0">
            <PencilSimple weight="bold" className="w-4 h-4" /> Edit Profil
          </Button>
        )}
      </div>

      {toast && (
        <div className={`mb-6 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${toast.type === 'ok' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {toast.type === 'ok' ? <Check className="w-4 h-4" weight="bold" /> : <Warning className="w-4 h-4" weight="fill" />}
          {toast.text}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600" />

        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-12 mb-8">
            <div className="relative">
              <Image unoptimized
                src={editing ? dicebear(user.username, form.avatar_style) : avatarUrl}
                alt={fullName || user.username}
                width={96} height={96}
                className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white"
              />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold text-slate-900">{fullName || user.username}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                {user.role}
              </span>
            </div>
          </div>

          {/* Avatar style picker (edit mode only) */}
          {editing && (
            <div className="mb-8">
              <Label className="text-slate-700">Pilih Avatar</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {AVATAR_STYLES.map((style) => {
                  const active = form.avatar_style === style
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, avatar_style: style }))}
                      className={`relative rounded-full p-0.5 transition-all ${active ? 'ring-2 ring-blue-600' : 'ring-1 ring-slate-200 hover:ring-slate-300'}`}
                      title={style}
                    >
                      <Image unoptimized src={dicebear(user.username, style, 56)} alt={style} width={56} height={56} className="w-14 h-14 rounded-full bg-white" />
                      {active && (
                        <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-0.5">
                          <Check weight="bold" className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Account Information */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Account Information</h3>

              <Field icon={<IdentificationBadge weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />} label="Username">
                <p className="text-slate-900 mt-0.5">{user.username}</p>
                {editing && <p className="text-xs text-slate-400 mt-0.5">Username tidak dapat diubah.</p>}
              </Field>

              <Field icon={<User weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />} label="Nama Lengkap">
                {editing ? (
                  <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Nama lengkap" className="mt-1 max-w-xs" />
                ) : (
                  <p className="text-slate-900 mt-0.5">{fullName || '-'}</p>
                )}
              </Field>

              <Field icon={<EnvelopeSimple weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />} label="Email Address">
                <p className="text-slate-900 mt-0.5">{user.email ?? '-'}</p>
                {editing && <p className="text-xs text-slate-400 mt-0.5">Email dikelola oleh admin & terkait login.</p>}
              </Field>

              <Field icon={<Shield weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />} label="System Role">
                <p className="text-slate-900 mt-0.5">{user.role}</p>
              </Field>

              <Field icon={<CalendarBlank weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />} label="Bergabung Sejak">
                <p className="text-slate-900 mt-0.5">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </p>
              </Field>
            </div>

            {/* Company Information */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Company Information</h3>

              <Field icon={<Buildings weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />} label="Department">
                {editing ? (
                  <Input value={form.department ?? ''} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="cth. Sales & Marketing" className="mt-1 max-w-xs" />
                ) : (
                  <p className="text-slate-900 mt-0.5">{profile.department ?? '-'}</p>
                )}
              </Field>

              <Field icon={<Phone weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />} label="Phone Number">
                {editing ? (
                  <Input value={form.phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="cth. 0812xxxx" className="mt-1 max-w-xs" />
                ) : (
                  <p className="text-slate-900 mt-0.5">{profile.phone ?? '-'}</p>
                )}
              </Field>

              <Field icon={<Note weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />} label="Bio">
                {editing ? (
                  <textarea
                    value={form.bio ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Ceritakan sedikit tentang Anda…"
                    rows={3}
                    className="mt-1 w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-400"
                  />
                ) : (
                  <p className="text-slate-900 mt-0.5 whitespace-pre-wrap">{profile.bio ?? '-'}</p>
                )}
              </Field>
            </div>
          </div>

          {editing && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={cancelEdit} disabled={saving} className="gap-2">
                <X weight="bold" className="w-4 h-4" /> Batal
              </Button>
              <Button onClick={save} disabled={saving} className="gap-2">
                <FloppyDisk weight="bold" className="w-4 h-4" /> {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordCard />
    </div>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-slate-500 font-medium">{label}</p>
        {children}
      </div>
    </div>
  )
}

function ChangePasswordCard() {
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  function reset() {
    setCur(''); setNext(''); setConfirm(''); setToast(null)
  }

  async function submit() {
    setToast(null)
    if (next !== confirm) { setToast({ type: 'err', text: 'Konfirmasi password tidak cocok.' }); return }
    if (next.length < 6) { setToast({ type: 'err', text: 'Password baru minimal 6 karakter.' }); return }
    setSaving(true)
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: cur, new_password: next }),
    })
    setSaving(false)
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setToast({ type: 'err', text: j.error || 'Gagal mengubah password.' }); return }
    setToast({ type: 'ok', text: 'Password berhasil diubah.' })
    setCur(''); setNext(''); setConfirm('')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mt-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LockKey weight="fill" className="w-5 h-5 text-slate-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Ganti Password</h2>
            <p className="text-xs text-slate-500 mt-0.5">Perbarui password akun Anda secara berkala.</p>
          </div>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => { reset(); setOpen(true) }} className="gap-2 shrink-0">
            <PencilSimple weight="bold" className="w-4 h-4" /> Ubah
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-6 space-y-4 max-w-sm">
          {toast && (
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${toast.type === 'ok' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {toast.type === 'ok' ? <Check className="w-4 h-4" weight="bold" /> : <Warning className="w-4 h-4" weight="fill" />}
              {toast.text}
            </div>
          )}
          <div>
            <Label className="text-slate-700">Password Lama</Label>
            <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className="mt-1" autoComplete="current-password" />
          </div>
          <div>
            <Label className="text-slate-700">Password Baru</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1" autoComplete="new-password" />
          </div>
          <div>
            <Label className="text-slate-700">Konfirmasi Password Baru</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" autoComplete="new-password" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setOpen(false); reset() }} disabled={saving} className="gap-2">
              <X weight="bold" className="w-4 h-4" /> Batal
            </Button>
            <Button onClick={submit} disabled={saving || !cur || !next || !confirm} className="gap-2">
              <FloppyDisk weight="bold" className="w-4 h-4" /> {saving ? 'Menyimpan…' : 'Simpan Password'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
