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
  Briefcase
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 pb-12 animate-[fadeIn_0.4s_ease-out]">
      {/* Header & Role Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Coins className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Treasury Management</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">PT. Mayora Indah Tbk · Kas & Bank, Arus Transaksi, & Eksekusi Pengeluaran</p>
          </div>
        </div>

        {/* Role Switcher (Mock Mode ONLY) */}
        <div className="flex items-center gap-2 border-2 border-black bg-slate-50 p-2 rounded-lg">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Simulasi Role:
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setUserRole('MANAGEMENT')}
              className={`px-3 py-1.5 text-xs font-black rounded border transition-all ${userRole === 'MANAGEMENT' ? 'bg-red-600 text-white border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border-slate-200 text-slate-600 hover:text-black'}`}
            >
              MANAGEMENT (Approval)
            </button>
            <button
              onClick={() => setUserRole('TREASURY')}
              className={`px-3 py-1.5 text-xs font-black rounded border transition-all ${userRole === 'TREASURY' ? 'bg-emerald-600 text-white border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border-slate-200 text-slate-600 hover:text-black'}`}
            >
              TREASURY (Eksekusi)
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 transition-all ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-500' : 'bg-red-50 text-red-900 border-red-500'}`}>
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold">{notif.message}</span>
        </div>
      )}

      {/* Cash & Bank Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saldo Kas Utama (1001)</p>
            <p className="text-2xl font-black text-black font-mono">{formatRupiah(kasUtama)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200"><Wallet className="w-5 h-5 text-slate-600" /></div>
        </div>

        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bank Mandiri Corp (1002)</p>
            <p className="text-2xl font-black text-blue-700 font-mono">{formatRupiah(bankMandiri)}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100"><Briefcase className="w-5 h-5 text-blue-600" /></div>
        </div>

        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bank BCA Operasional (1003)</p>
            <p className="text-2xl font-black text-emerald-700 font-mono">{formatRupiah(bankBCA)}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100"><Coins className="w-5 h-5 text-emerald-600" /></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-black bg-slate-100 p-1.5 rounded-xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] gap-2">
        <button 
          onClick={() => setActiveTab('approvals')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'approvals' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <ShieldCheck className="w-4 h-4" /> Persetujuan Pembayaran & Eksekusi
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Coins className="w-4 h-4" /> Buku Kas (Arus Kas Keluar/Masuk)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'approvals' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Approval Table */}
          <div className="xl:col-span-2 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <h2 className="text-lg font-bold border-b pb-3 border-slate-200 uppercase tracking-tight">
              Daftar Permintaan Pembayaran Pembelian (AP)
            </h2>

            <div className="overflow-x-auto">
              <Table className="border-2 border-black">
                <TableHeader className="bg-slate-100 border-b-2 border-black">
                  <TableRow>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-28">No Pengajuan</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black">Supplier / Faktur</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-24">Metode</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-right w-36">Jumlah Diajukan</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-36">Status</TableHead>
                    <TableHead className="font-bold text-black text-center w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permintaanList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 font-bold text-slate-400">
                        Tidak ada pengajuan pembayaran terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    permintaanList.map((p) => (
                      <TableRow key={p.id_permintaan} className="border-b border-slate-200 hover:bg-slate-50/50 animate-[fadeIn_0.3s_ease-out]">
                        <TableCell className="font-mono font-bold border-r-2 border-black text-center text-xs">{p.no_permintaan}</TableCell>
                        <TableCell className="border-r-2 border-black text-xs">
                          <p className="font-bold text-black">{p.tr_hutang?.supplier_name || 'Supplier'}</p>
                          <p className="font-semibold text-slate-400 font-mono">Invoice: {p.tr_hutang?.no_invoice || '—'}</p>
                          <p className="text-slate-500 font-medium italic mt-0.5">Keterangan: {p.keterangan}</p>
                          {p.rejection_reason && (
                            <p className="text-red-600 font-bold mt-1">Alasan Penolakan: {p.rejection_reason}</p>
                          )}
                        </TableCell>
                        <TableCell className="border-r-2 border-black text-center text-xs font-bold">{p.metode_pembayaran}</TableCell>
                        <TableCell className="border-r-2 border-black text-right font-mono text-xs font-bold">
                          {formatRupiah(p.jumlah_bayar)}
                        </TableCell>
                        <TableCell className="border-r-2 border-black text-center">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded font-extrabold border uppercase ${p.status === 'TEREKSEKUSI' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : p.status === 'DISETUJUI' ? 'bg-blue-100 text-blue-800 border-blue-300' : p.status === 'DITOLAK' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                            {p.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {/* MANAGEMENT WORKFLOW */}
                          {userRole === 'MANAGEMENT' && p.status === 'MENUNGGU_PERSETUJUAN' && (
                            <div className="flex flex-col gap-1">
                              <Button 
                                onClick={() => handleApprove(p.id_permintaan)} 
                                className="h-7 border border-black bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px]"
                              >
                                Setujui
                              </Button>
                              <Button 
                                onClick={() => setRejectingPmt(p)} 
                                className="h-7 border border-black bg-white hover:bg-red-50 text-red-600 font-bold text-[10px]"
                              >
                                Tolak
                              </Button>
                            </div>
                          )}

                          {/* TREASURY WORKFLOW */}
                          {userRole === 'TREASURY' && p.status === 'DISETUJUI' && (
                            <Button 
                              onClick={() => {
                                setExecutingPmt(p)
                                setSelectedRekeningBayar(0)
                              }} 
                              className="h-7 w-full border border-black bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px]"
                            >
                              Bayar (Kas)
                            </Button>
                          )}

                          {p.status === 'TEREKSEKUSI' && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase italic">Lunas Terbayar</span>
                          )}

                          {p.status === 'DITOLAK' && (
                            <span className="text-[10px] font-bold text-red-400 uppercase italic">Ditolak</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Action Panels (Reject/Execute) */}
          <div className="xl:col-span-1 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
            
            {/* Rejection Form (Management) */}
            {rejectingPmt && (
              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" /> Tolak Pengajuan Pembayaran
                </h2>
                <div className="bg-red-50 p-4 border border-red-200 rounded-lg space-y-1 text-xs">
                  <p className="font-bold">No Pengajuan: {rejectingPmt.no_permintaan}</p>
                  <p className="font-semibold text-slate-700">Jumlah: {formatRupiah(rejectingPmt.jumlah_bayar)}</p>
                  <p className="text-slate-500">Supplier: {rejectingPmt.tr_hutang?.supplier_name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Alasan Penolakan</label>
                  <textarea 
                    value={alasanTolak} 
                    onChange={(e) => setAlasanTolak(e.target.value)} 
                    className="w-full min-h-[80px] p-2.5 text-xs font-semibold border-2 border-black rounded-lg mt-1 focus:outline-none"
                    placeholder="Masukkan alasan menolak pengajuan pembayaran ini..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setRejectingPmt(null)} className="flex-1 border-2 border-black bg-white hover:bg-slate-50 text-black font-bold py-2 text-xs rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1 border-2 border-black bg-red-600 hover:bg-red-700 text-white font-bold py-2 text-xs rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    Kirim Penolakan
                  </Button>
                </div>
              </form>
            )}

            {/* Execution Form (Treasury) */}
            {executingPmt && (
              <form onSubmit={handleExecuteSubmit} className="space-y-4">
                <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2 text-emerald-600">
                  <Play className="w-5 h-5 fill-emerald-600" /> Eksekusi Pengeluaran Kas
                </h2>
                <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-lg space-y-1 text-xs">
                  <p className="font-bold">No Pengajuan: {executingPmt.no_permintaan}</p>
                  <p className="font-semibold text-slate-700">Jumlah: {formatRupiah(executingPmt.jumlah_bayar)}</p>
                  <p className="text-slate-500">Supplier: {executingPmt.tr_hutang?.supplier_name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Rekening Kas/Bank Pembayar</label>
                  <select
                    value={selectedRekeningBayar}
                    onChange={(e) => setSelectedRekeningBayar(Number(e.target.value))}
                    className="w-full text-xs font-bold p-2.5 border-2 border-black rounded-lg mt-1 focus:outline-none"
                    required
                  >
                    <option value={0}>-- PILIH SUMBER REKENING --</option>
                    {rekeningList.map((r) => (
                      <option key={r.id_akun} value={r.id_akun}>{r.kode_akun} - {r.nama_akun} (Saldo: {formatRupiah(r.saldo_berjalan)})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setExecutingPmt(null)} className="flex-1 border-2 border-black bg-white hover:bg-slate-50 text-black font-bold py-2 text-xs rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1 border-2 border-black bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 text-xs rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    Bayar Sekarang
                  </Button>
                </div>
              </form>
            )}

            {!rejectingPmt && !executingPmt && (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg space-y-3">
                <ShieldCheck className="w-12 h-12 text-slate-300" />
                <p className="text-xs font-bold text-slate-500 max-w-[200px] uppercase tracking-wider">
                  Mekanisme RBAC Aktif:
                </p>
                <p className="text-xs text-slate-400 max-w-[220px]">
                  {userRole === 'MANAGEMENT' 
                    ? 'Sebagai Management, Anda memiliki akses untuk menyetujui (Approve) atau menolak (Reject) permintaan pembayaran.' 
                    : 'Sebagai Treasury, Anda memiliki akses untuk mengeksekusi pembayaran kas yang sudah disetujui oleh Management.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
          <h2 className="text-lg font-bold border-b pb-3 border-slate-200 uppercase tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" /> Buku Kas & Aliran Transaksi Operasional
          </h2>

          <div className="overflow-x-auto">
            <Table className="border-2 border-black">
              <TableHeader className="bg-slate-100 border-b-2 border-black">
                <TableRow>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-36">No Transaksi</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-24">Tanggal</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-24">Tipe</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black">Keterangan Arus Kas</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-32">Ref Dokumen</TableHead>
                  <TableHead className="font-bold text-black text-right w-44">Jumlah Kas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyKasList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 font-bold text-slate-400">
                      Belum ada transaksi kas tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyKasList.map((t) => (
                    <TableRow key={t.id_transaksi_kas} className="border-b border-slate-200 hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold border-r-2 border-black text-center text-xs">{t.no_transaksi}</TableCell>
                      <TableCell className="border-r-2 border-black text-center text-xs font-semibold">
                        {new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="border-r-2 border-black text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border uppercase ${t.tipe === 'MASUK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {t.tipe === 'MASUK' ? 'INFLOW' : 'OUTFLOW'}
                        </span>
                      </TableCell>
                      <TableCell className="border-r-2 border-black text-xs font-bold text-slate-800">{t.keterangan}</TableCell>
                      <TableCell className="border-r-2 border-black text-center font-mono text-xs text-slate-400 font-semibold">{t.reference_id || '—'}</TableCell>
                      <TableCell className={`text-right font-mono font-bold text-sm ${t.tipe === 'MASUK' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.tipe === 'MASUK' ? '+' : '-'} {formatRupiah(t.jumlah)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
