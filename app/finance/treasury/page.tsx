'use client'

import React, { useState, useEffect } from 'react'
import { 
  Coins, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle, 
  XCircle, 
  Play, 
  Search, 
  Filter, 
  ShieldCheck,
  Briefcase,
  X,
  Check,
  ChevronRight,
  Download
} from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface PermintaanPembayaran {
  id_permintaan: number;
  no_permintaan: string;
  hutang_id: number;
  jumlah_bayar: number;
  metode_pembayaran: 'TRANSFER' | 'KAS_KECIL' | 'GIRO';
  keterangan: string;
  status: 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK' | 'TEREKSEKUSI';
  created_at: string;
  rejection_reason?: string;
  tr_hutang?: {
    no_invoice: string;
    supplier_name: string;
  };
}

interface TransaksiKas {
  id_transaksi_kas: number;
  no_transaksi: string;
  tipe: 'MASUK' | 'KELUAR';
  tanggal: string;
  jumlah: number;
  keterangan: string;
  akun_kas_id: number;
  akun_lawan_id: number;
  reference_id?: string;
}

interface Akun {
  id_akun: number;
  kode_akun: string;
  nama_akun: string;
  saldo_berjalan: number;
}

function GlassCard({
  children,
  className = "",
  hover = false,
  onMouseEnter,
  onMouseLeave,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      className={`
        bg-white/95 backdrop-blur-md
        border border-slate-100
        shadow-[0_4px_20px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]
        rounded-3xl overflow-hidden
        ${hover ? "hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5" : ""}
        transition-all duration-300 ease-out
        ${className}
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'history'>('approvals')
  
  // Mock Role Switcher for evaluation: MANAGEMENT vs TREASURY
  const [userRole, setUserRole] = useState<'MANAGEMENT' | 'TREASURY'>('MANAGEMENT')
  
  const [permintaanList, setPermintaanList] = useState<PermintaanPembayaran[]>([])
  const [historyKasList, setHistoryKasList] = useState<TransaksiKas[]>([])
  const [rekeningList, setRekeningList] = useState<Akun[]>([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Rejection Dialog State
  const [rejectingPmt, setRejectingPmt] = useState<PermintaanPembayaran | null>(null)
  const [alasanTolak, setAlasanTolak] = useState('')

  // Execution State
  const [executingPmt, setExecutingPmt] = useState<PermintaanPembayaran | null>(null)
  const [selectedRekeningBayar, setSelectedRekeningBayar] = useState<number>(0)

  // Load Treasury Data
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get COA (Rekening Kas/Bank)
      const coaRes = await fetch(`/api/finance/coa?mock_role=${userRole}`)
      const coaJson = await coaRes.json()
      if (coaJson.data) {
        const cashRekening = coaJson.data.filter((a: Akun) => 
          a.kode_akun === '1001' || a.kode_akun === '1002' || a.kode_akun === '1003'
        )
        setRekeningList(cashRekening)
      }

      // Get Payment Requests
      const pmtRes = await fetch(`/api/finance/treasury?mock_role=${userRole}`)
      const pmtJson = await pmtRes.json()
      if (pmtJson.data) setPermintaanList(pmtJson.data)

      // Get Cash Flow History
      const histRes = await fetch(`/api/finance/treasury?mode=history&mock_role=${userRole}`)
      const histJson = await histRes.json()
      if (histJson.data) setHistoryKasList(histJson.data)

    } catch (e) {
      console.error(e)
      showNotif('error', 'Gagal memuat data. Menjalankan mode mock offline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userRole])

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotif({ type, message })
    setTimeout(() => setNotif(null), 5000)
  }

  // Management Approve Action
  const handleApprove = async (pmtId: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/finance/treasury?mock_role=${userRole}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          permintaan_id: pmtId,
          status: 'DISETUJUI'
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Pengajuan pembayaran disetujui! Status permintaan kini disetujui.`)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal menyetujui pengajuan.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat menyetujui pengajuan.')
    } finally {
      setLoading(false)
    }
  }

  // Management Reject Action
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingPmt) return
    if (!alasanTolak.trim()) {
      showNotif('error', 'Alasan penolakan wajib diisi.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/finance/treasury?mock_role=${userRole}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          permintaan_id: rejectingPmt.id_permintaan,
          status: 'DITOLAK',
          alasan: alasanTolak
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Pengajuan pembayaran ditolak. Status berhasil diperbarui.`)
        setRejectingPmt(null)
        setAlasanTolak('')
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal menolak pengajuan.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat menolak pengajuan.')
    } finally {
      setLoading(false)
    }
  }

  // Treasury Execute Action
  const handleExecuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!executingPmt) return
    if (selectedRekeningBayar === 0) {
      showNotif('error', 'Pilih rekening kas/bank pembayar.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/finance/treasury?mock_role=${userRole}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          permintaan_id: executingPmt.id_permintaan,
          akun_kas_id: selectedRekeningBayar
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Eksekusi Pembayaran Sukses! Rekening kas terdebet dan entri jurnal Buku Besar otomatis tercatat.`)
        setExecutingPmt(null)
        setSelectedRekeningBayar(0)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal mengeksekusi pembayaran.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat eksekusi kas.')
    } finally {
      setLoading(false)
    }
  }

  // Get Cash / Bank Rekening Info
  const kasUtama = rekeningList.find(r => r.kode_akun === '1001')?.saldo_berjalan || 0
  const bankMandiri = rekeningList.find(r => r.kode_akun === '1002')?.saldo_berjalan || 0
  const bankBCA = rekeningList.find(r => r.kode_akun === '1003')?.saldo_berjalan || 0

  // Format currency
  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID')
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-6 pb-12">
      
      {/* Header & Role Switcher Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pt-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-red-600" style={{ width: '4px', backgroundColor: '#dc2626' }} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: '#dc2626' }}>
                Finance Module
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                Treasury Management
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Kas & Bank, Arus Transaksi, & Eksekusi Pengeluaran
          </p>
        </div>

        {/* Role Switcher (Simulasi) */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 self-start md:self-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Simulasi:
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setUserRole('MANAGEMENT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                userRole === 'MANAGEMENT' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Management
            </button>
            <button
              onClick={() => setUserRole('TREASURY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                userRole === 'TREASURY' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Treasury Officer
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold">{notif.message}</span>
        </div>
      )}

      {/* Cash & Bank Balances KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Kas Utama (1001)</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-800 mt-2 font-mono">
                {formatRupiah(kasUtama)}
              </p>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Briefcase className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Mandiri Corp (1002)</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-blue-700 mt-2 font-mono">
                {formatRupiah(bankMandiri)}
              </p>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Coins className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank BCA Operasional (1003)</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-emerald-700 mt-2 font-mono">
                {formatRupiah(bankBCA)}
              </p>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Tabs & Table Panel */}
      <GlassCard>
        
        {/* Tabs Bar */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/50 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('approvals')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'approvals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Persetujuan & Eksekusi
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Buku Kas (Inflow & Outflow)
            </button>
          </div>

          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1.5">
            Role Aktif: <span className="font-bold text-slate-600">{userRole}</span>
          </span>
        </div>

        {/* Tab 1: Persetujuan Pembayaran & Eksekusi */}
        {activeTab === 'approvals' && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/20">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-28 text-center">No Pengajuan</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Supplier / Faktur</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-28">Metode</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right w-36">Jumlah Diajukan</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-36">Status</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs text-slate-700">
                {permintaanList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 font-semibold text-slate-400">
                      Tidak ada pengajuan pembayaran terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  permintaanList.map((p) => {
                    const statusConfig = {
                      TEREKSEKUSI: { label: "TEREKSEKUSI", bg: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
                      DISETUJUI: { label: "DISETUJUI", bg: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
                      DITOLAK: { label: "DITOLAK", bg: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500" },
                      MENUNGGU_PERSETUJUAN: { label: "PENDING", bg: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" }
                    };
                    const s = statusConfig[p.status] || { label: p.status, bg: "bg-slate-50 text-slate-500 border-slate-100", dot: "bg-slate-400" };

                    return (
                      <TableRow key={p.id_permintaan} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                        <TableCell className="font-mono font-bold text-slate-800 px-6 py-4 text-center">{p.no_permintaan}</TableCell>
                        <TableCell className="px-6 py-4 space-y-1">
                          <p className="font-bold text-slate-800">{p.tr_hutang?.supplier_name || 'Supplier'}</p>
                          <p className="font-semibold text-slate-400 font-mono text-[10px]">Invoice: {p.tr_hutang?.no_invoice || '—'}</p>
                          <p className="text-slate-500 font-medium italic text-[10px]">Keterangan: {p.keterangan}</p>
                          {p.rejection_reason && (
                            <p className="text-red-600 font-bold text-[10px]">Alasan Penolakan: {p.rejection_reason}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-700 px-6 py-4">{p.metode_pembayaran}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-800 px-6 py-4">{formatRupiah(p.jumlah_bayar)}</TableCell>
                        <TableCell className="text-center px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-center px-6 py-4">
                          <div className="flex gap-1.5 justify-center">
                            {/* MANAGEMENT WORKFLOW */}
                            {userRole === 'MANAGEMENT' && p.status === 'MENUNGGU_PERSETUJUAN' && (
                              <>
                                <button 
                                  onClick={() => handleApprove(p.id_permintaan)} 
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold transition-colors cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => setRejectingPmt(p)} 
                                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* TREASURY WORKFLOW */}
                            {userRole === 'TREASURY' && p.status === 'DISETUJUI' && (
                              <button 
                                onClick={() => {
                                  setExecutingPmt(p)
                                  setSelectedRekeningBayar(0)
                                }} 
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer"
                              >
                                Bayar (Kas)
                              </button>
                            )}

                            {p.status === 'TEREKSEKUSI' && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase italic">Lunas</span>
                            )}

                            {p.status === 'DITOLAK' && (
                              <span className="text-[10px] font-bold text-red-400 uppercase italic">Ditolak</span>
                            )}

                            {p.status === 'DISETUJUI' && userRole === 'MANAGEMENT' && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase italic">Approved</span>
                            )}

                            {p.status === 'MENUNGGU_PERSETUJUAN' && userRole === 'TREASURY' && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase italic">Pending Appr.</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tab 2: Buku Kas */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/20">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-36 text-center">No Transaksi</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-28">Tanggal</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-24">Tipe</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Keterangan Arus Kas</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-32">Ref Dokumen</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right w-44">Jumlah Kas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs text-slate-700">
                {historyKasList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 font-semibold text-slate-400">
                      Belum ada transaksi kas tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyKasList.map((t) => (
                    <TableRow key={t.id_transaksi_kas} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                      <TableCell className="font-mono font-bold text-slate-800 px-6 py-4 text-center">{t.no_transaksi}</TableCell>
                      <TableCell className="text-center font-medium text-slate-500 px-6 py-4">
                        {new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-center px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${t.tipe === 'MASUK' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          {t.tipe === 'MASUK' ? 'INFLOW' : 'OUTFLOW'}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 px-6 py-4">{t.keterangan}</TableCell>
                      <TableCell className="text-center font-mono font-semibold text-slate-400 px-6 py-4">{t.reference_id || '—'}</TableCell>
                      <TableCell className={`text-right font-mono font-bold text-sm px-6 py-4 ${t.tipe === 'MASUK' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.tipe === 'MASUK' ? '+' : '-'} {formatRupiah(t.jumlah)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

      </GlassCard>

      {/* =====================================================================
          OVERLAY MODALS
          ===================================================================== */}

      {/* 1. REJECTION FORM DIALOG */}
      {rejectingPmt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Tolak Pengajuan Pembayaran
              </h3>
              <button 
                onClick={() => setRejectingPmt(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-1 text-xs">
                <p className="font-bold text-slate-800">No Pengajuan: {rejectingPmt.no_permintaan}</p>
                <p className="font-semibold text-slate-700">Jumlah: {formatRupiah(rejectingPmt.jumlah_bayar)}</p>
                <p className="text-slate-500">Supplier: {rejectingPmt.tr_hutang?.supplier_name}</p>
              </div>
              
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Alasan Penolakan</label>
                <textarea 
                  value={alasanTolak} 
                  onChange={(e) => setAlasanTolak(e.target.value)} 
                  className="w-full min-h-[80px] p-3 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 mt-1"
                  placeholder="Masukkan alasan menolak pengajuan pembayaran ini..."
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setRejectingPmt(null)} 
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
                >
                  Tolak Pengajuan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EXECUTION FORM DIALOG */}
      {executingPmt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-emerald-600 flex items-center gap-2">
                <Play className="w-5 h-5 fill-emerald-600 text-emerald-600" /> Eksekusi Pengeluaran Kas
              </h3>
              <button 
                onClick={() => setExecutingPmt(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteSubmit} className="p-6 space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-1 text-xs">
                <p className="font-bold text-slate-800">No Pengajuan: {executingPmt.no_permintaan}</p>
                <p className="font-semibold text-slate-700">Jumlah: {formatRupiah(executingPmt.jumlah_bayar)}</p>
                <p className="text-slate-500">Supplier: {executingPmt.tr_hutang?.supplier_name}</p>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Rekening Kas/Bank Pembayar</label>
                <select
                  value={selectedRekeningBayar}
                  onChange={(e) => setSelectedRekeningBayar(Number(e.target.value))}
                  className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:border-slate-300 bg-white"
                  required
                >
                  <option value={0}>-- PILIH SUMBER REKENING --</option>
                  {rekeningList.map((r) => (
                    <option key={r.id_akun} value={r.id_akun}>{r.kode_akun} - {r.nama_akun} (Saldo: {formatRupiah(r.saldo_berjalan)})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setExecutingPmt(null)} 
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-md"
                >
                  Bayar Sekarang
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
