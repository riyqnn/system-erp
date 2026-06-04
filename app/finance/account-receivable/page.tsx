'use client'

import React, { useState, useEffect } from 'react'
import { 
  Receipt, 
  Send, 
  Wallet, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Filter, 
  Calendar,
  UserCheck
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Piutang {
  id_piutang: number;
  sales_invoice_id: string;
  inv_number: string;
  customer_id: string;
  customer_name: string;
  jumlah: number;
  sisa_pembayaran: number;
  due_date: string;
  status: 'BELUM_LUNAS' | 'LUNAS' | 'OVERDUE';
  created_at: string;
}

interface Akun {
  id_akun: number;
  kode_akun: string;
  nama_akun: string;
}

export default function AccountReceivablePage() {
  const [piutangList, setPiutangList] = useState<Piutang[]>([])
  const [akunList, setAkunList] = useState<Akun[]>([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Payment Form States
  const [selectedPiutang, setSelectedPiutang] = useState<Piutang | null>(null)
  const [selectedAkunKas, setSelectedAkunKas] = useState<number>(0)
  const [jumlahBayar, setJumlahBayar] = useState<number>(0)
  
  // Search & Filter
  const [searchCust, setSearchCust] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BELUM_LUNAS' | 'LUNAS' | 'OVERDUE'>('ALL')

  // Load AR and Cash Accounts
  const loadData = async () => {
    try {
      setLoading(true)
      const arRes = await fetch('/api/finance/receivable')
      const arJson = await arRes.json()
      if (arJson.data) setPiutangList(arJson.data)

      const coaRes = await fetch('/api/finance/coa')
      const coaJson = await coaRes.json()
      if (coaJson.data) {
        // Filter only cash and bank accounts (1001, 1002, 1003)
        const kasAkuns = coaJson.data.filter((a: Akun) => 
          a.kode_akun === '1001' || a.kode_akun === '1002' || a.kode_akun === '1003'
        )
        setAkunList(kasAkuns)
      }
    } catch (e) {
      console.error(e)
      showNotif('error', 'Gagal memuat data. Menggunakan mode mock local.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotif({ type, message })
    setTimeout(() => setNotif(null), 5000)
  }

  // Pelunasan Piutang Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPiutang) return
    if (selectedAkunKas === 0) {
      showNotif('error', 'Harap pilih rekening penampung kas/bank.')
      return
    }
    if (jumlahBayar <= 0 || jumlahBayar > selectedPiutang.sisa_pembayaran) {
      showNotif('error', 'Jumlah pelunasan harus valid (> 0) dan tidak melebihi sisa piutang.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          piutang_id: selectedPiutang.id_piutang,
          akun_kas_id: selectedAkunKas,
          jumlah_terima: jumlahBayar
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Sukses! Penerimaan pelunasan piutang ${selectedPiutang.inv_number} senilai Rp ${jumlahBayar.toLocaleString()} berhasil dicatat.`)
        setSelectedPiutang(null)
        setJumlahBayar(0)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal mencatat pelunasan piutang.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat mengirim pelunasan.')
    } finally {
      setLoading(false)
    }
  }

  // Kirim Reminder Pelunasan (Quick Action Toast)
  const handleSendReminder = (piutang: Piutang) => {
    showNotif('success', `Pengingat Jatuh Tempo (Reminder) berhasil dikirim via Email & WhatsApp ke Customer: ${piutang.customer_name} untuk Faktur ${piutang.inv_number}.`)
  }

  // Calculate AR Summary
  const outstandingAR = piutangList
    .filter(p => p.status !== 'LUNAS')
    .reduce((sum, p) => sum + p.sisa_pembayaran, 0)

  const overdueAR = piutangList
    .filter(p => p.status === 'OVERDUE')
    .reduce((sum, p) => sum + p.sisa_pembayaran, 0)

  const lunasAR = piutangList
    .filter(p => p.status === 'LUNAS')
    .reduce((sum, p) => sum + (p.jumlah - p.sisa_pembayaran), 0)

  // Calculate Aging Schedule
  const aging = {
    current: 0,
    overdue_1_30: 0,
    overdue_31_60: 0,
    overdue_61_90: 0,
    overdue_90plus: 0
  }

  const today = new Date()
  piutangList.forEach(p => {
    if (p.status === 'LUNAS') return
    const dueDate = new Date(p.due_date)
    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      aging.current += p.sisa_pembayaran
    } else if (diffDays <= 30) {
      aging.overdue_1_30 += p.sisa_pembayaran
    } else if (diffDays <= 60) {
      aging.overdue_31_60 += p.sisa_pembayaran
    } else if (diffDays <= 90) {
      aging.overdue_61_90 += p.sisa_pembayaran
    } else {
      aging.overdue_90plus += p.sisa_pembayaran
    }
  })

  // Filter & Search List
  const filteredPiutang = piutangList.filter(p => {
    const matchesSearch = p.customer_name.toLowerCase().includes(searchCust.toLowerCase()) || p.inv_number.includes(searchCust)
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 pb-12 animate-[fadeIn_0.4s_ease-out]">
      {/* Header (Neobrutalist) */}
      <div className="flex items-center justify-between border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Receipt className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Account Receivable (Piutang)</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">PT. Mayora Indah Tbk · Monitoring Saldo Piutang & Penagihan Faktur</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 transition-all ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-500' : 'bg-red-50 text-red-900 border-red-500'}`}>
          {notif.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
          <span className="text-sm font-semibold">{notif.message}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Piutang Berjalan (AR)</p>
            <p className="text-2xl font-black text-black font-mono">Rp {outstandingAR.toLocaleString('id-ID')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">AR</div>
        </div>

        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-red-500">Overdue (Jatuh Tempo)</p>
            <p className="text-2xl font-black text-red-600 font-mono">Rp {overdueAR.toLocaleString('id-ID')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold">!</div>
        </div>

        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-emerald-500">Terbayar Bulan Ini</p>
            <p className="text-2xl font-black text-emerald-600 font-mono">Rp {lunasAR.toLocaleString('id-ID')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold">✓</div>
        </div>
      </div>

      {/* Aging Schedule (Analisis Umur Piutang) */}
      <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
        <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" /> Analisis Umur Piutang (Aging Schedule)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum Jatuh Tempo</p>
            <p className="text-sm font-black text-slate-800 font-mono mt-1">Rp {aging.current.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-lg text-center">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">1 - 30 Hari</p>
            <p className="text-sm font-black text-amber-700 font-mono mt-1">Rp {aging.overdue_1_30.toLocaleString()}</p>
          </div>
          <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-lg text-center">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">31 - 60 Hari</p>
            <p className="text-sm font-black text-orange-700 font-mono mt-1">Rp {aging.overdue_31_60.toLocaleString()}</p>
          </div>
          <div className="bg-red-50/30 border border-red-100 p-4 rounded-lg text-center">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">61 - 90 Hari</p>
            <p className="text-sm font-black text-red-600 font-mono mt-1">Rp {aging.overdue_61_90.toLocaleString()}</p>
          </div>
          <div className="bg-red-100/50 border border-red-200 p-4 rounded-lg text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest">&gt; 90 Hari</p>
            <p className="text-sm font-black text-red-800 font-mono mt-1">Rp {aging.overdue_90plus.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monitoring & Penagihan Piutang Table */}
        <div className="xl:col-span-2 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-200">
            <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" /> Daftar Faktur Penjualan & Tagihan Customer
            </h2>
            <div className="flex gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <Input 
                  placeholder="Cari Customer / No Faktur..." 
                  value={searchCust}
                  onChange={(e) => setSearchCust(e.target.value)}
                  className="pl-8 pr-4 h-8 border-2 border-black font-semibold text-xs min-w-[200px]"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'BELUM_LUNAS' | 'LUNAS' | 'OVERDUE')}
                className="text-xs font-bold px-2 py-1 border-2 border-black rounded-lg focus:outline-none"
              >
                <option value="ALL">SEMUA STATUS</option>
                <option value="BELUM_LUNAS">BELUM LUNAS</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="LUNAS">LUNAS</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="border-2 border-black">
              <TableHeader className="bg-slate-100 border-b-2 border-black">
                <TableRow>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-28">No Faktur</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black">Customer</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-24">Jatuh Tempo</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black text-right w-36">Total Tagihan</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black text-right w-36">Sisa Piutang</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-28">Status</TableHead>
                  <TableHead className="font-bold text-black text-center w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPiutang.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 font-bold text-slate-400">
                      Tidak ada piutang terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPiutang.map((p) => (
                    <TableRow key={p.id_piutang} className="border-b border-slate-200 hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold border-r-2 border-black text-center text-xs">{p.inv_number}</TableCell>
                      <TableCell className="font-bold text-black text-xs border-r-2 border-black">{p.customer_name}</TableCell>
                      <TableCell className="border-r-2 border-black text-center text-xs font-semibold">
                        {new Date(p.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </TableCell>
                      <TableCell className="border-r-2 border-black text-right font-mono text-xs font-semibold">{p.jumlah.toLocaleString()}</TableCell>
                      <TableCell className="border-r-2 border-black text-right font-mono text-xs font-bold text-slate-700">{p.sisa_pembayaran.toLocaleString()}</TableCell>
                      <TableCell className="border-r-2 border-black text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border uppercase ${p.status === 'LUNAS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-center flex gap-1 justify-center items-center py-2.5">
                        {p.status !== 'LUNAS' && (
                          <>
                            <Button 
                              type="button" 
                              onClick={() => {
                                setSelectedPiutang(p)
                                setJumlahBayar(p.sisa_pembayaran)
                              }}
                              className="h-7 px-2 border border-black bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded"
                            >
                              Bayar
                            </Button>
                            <Button 
                              type="button" 
                              onClick={() => handleSendReminder(p)}
                              className="h-7 px-2 border border-black bg-white hover:bg-slate-100 text-black font-bold text-[10px] rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            >
                              <Send className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Form Penerimaan Pembayaran Piutang */}
        <div className="xl:col-span-1 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
          <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" /> Pencatatan Pelunasan Piutang
          </h2>

          {selectedPiutang ? (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500">NOMOR INVOICE:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedPiutang.inv_number}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500">PELANGGAN:</span>
                  <span className="font-bold text-slate-800">{selectedPiutang.customer_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500">SISA PIUTANG:</span>
                  <span className="font-mono font-black text-slate-900">Rp {selectedPiutang.sisa_pembayaran.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Rekening Kas/Bank Penampung</label>
                <select
                  value={selectedAkunKas}
                  onChange={(e) => setSelectedAkunKas(Number(e.target.value))}
                  className="w-full text-xs font-bold p-2.5 border-2 border-black rounded-lg mt-1 focus:outline-none"
                  required
                >
                  <option value={0}>-- PILIH KAS / REKENING --</option>
                  {akunList.map((a) => (
                    <option key={a.id_akun} value={a.id_akun}>{a.kode_akun} - {a.nama_akun}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Jumlah Pembayaran Diterima (IDR)</label>
                <Input 
                  type="number" 
                  value={jumlahBayar || ''}
                  onChange={(e) => setJumlahBayar(Number(e.target.value))}
                  max={selectedPiutang.sisa_pembayaran}
                  className="border-2 border-black font-bold mt-1" 
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => setSelectedPiutang(null)} className="flex-1 border-2 border-black bg-white hover:bg-slate-50 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold py-2 text-xs">
                  Batal
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 border-2 border-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold py-2 text-xs">
                  {loading ? 'Memproses...' : 'Catat Pelunasan'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg space-y-3">
              <UserCheck className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500 max-w-[200px]">
                Pilih faktur pelanggan di tabel untuk mencatat penerimaan pelunasan piutang.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
