/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client'

import React, { useState, useEffect } from 'react'
import {
  Book,
  List,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  ArrowRightLeft,
  DollarSign,
  X,
  PlusCircle,
  FileText,
  Lock,
  Unlock,
  Send,
  History,
  UserCheck,
  RefreshCw,
  Download,
  Check,
  FileQuestion
} from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'


const BRAND_RED = '#dc2626'

interface Akun {
  id_akun: number;
  kode_akun: string;
  nama_akun: string;
  kategori: 'ASET' | 'KEWAJIBAN' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN';
  saldo_normal: 'DEBET' | 'KREDIT';
  saldo_berjalan: number;
}

interface JurnalDetail {
  akun_id: number;
  kode_akun?: string;
  nama_akun?: string;
  debet: number;
  kredit: number;
}

interface Jurnal {
  id_jurnal: number;
  no_jurnal: string;
  tanggal: string;
  keterangan: string;
  status: 'DRAFT' | 'POSTED';
  tr_jurnal_detail: JurnalDetail[];
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

export default function GeneralLedgerPage() {
  const [akunList, setAkunList] = useState<Akun[]>([])
  const [jurnalList, setJurnalList] = useState<Jurnal[]>([])

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [totalJurnal, setTotalJurnal] = useState(0)

  // State Form Jurnal Baru
  const [tanggalJurnal, setTanggalJurnal] = useState(new Date().toISOString().substring(0, 10))
  const [keteranganJurnal, setKeteranganJurnal] = useState('')
  const [refNumber, setRefNumber] = useState('JE-2026-0004')
  const [currency, setCurrency] = useState('IDR')
  const [formDetails, setFormDetails] = useState<JurnalDetail[]>([
    { akun_id: 0, debet: 0, kredit: 0 },
    { akun_id: 0, debet: 0, kredit: 0 }
  ])

  // Filter & Search
  const [searchCoa, setSearchCoa] = useState('')
  const [filterKategori, setFilterKategori] = useState<string>('ALL')

  // Notification States
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Layout View States 
  const [selectedReportType, setSelectedReportType] = useState<'neraca' | 'labarugi' | 'trial'>('neraca')
  const [reportPeriod, setReportPeriod] = useState('June 2026')
  const [costCenter, setCostCenter] = useState('Consolidated (All)')
  const [showReportPreview, setShowReportPreview] = useState(true)
  const [showHistory, setShowHistory] = useState(true)
  const [showCoa, setShowCoa] = useState(false)

  // Simulated Role Switcher
  const [userRole, setUserRole] = useState<'GL_OFFICER' | 'MANAGEMENT'>('GL_OFFICER')

  const handleUpdateRole = (role: 'GL_OFFICER' | 'MANAGEMENT') => {
    setUserRole(role)
    localStorage.setItem('gl_user_role', role)
  }

  // Financial Report Lifecycle States
  const [reportStatus, setReportStatus] = useState<'DRAFT' | 'FINALIZED' | 'DISTRIBUTED'>('DRAFT')
  const [decisionNote, setDecisionNote] = useState('')
  const [finalizedAt, setFinalizedAt] = useState<string | null>(null)
  const [distributedAt, setDistributedAt] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const savedRole = localStorage.getItem('gl_user_role')
    const savedStatus = localStorage.getItem('gl_report_status')
    const savedNote = localStorage.getItem('gl_report_decision_note')
    const savedFinalizedAt = localStorage.getItem('gl_report_finalized_at')
    const savedDistributedAt = localStorage.getItem('gl_report_distributed_at')

    if (savedRole === 'GL_OFFICER' || savedRole === 'MANAGEMENT') setUserRole(savedRole)
    if (savedStatus === 'DRAFT' || savedStatus === 'FINALIZED' || savedStatus === 'DISTRIBUTED') setReportStatus(savedStatus)
    if (savedNote) setDecisionNote(savedNote)
    if (savedFinalizedAt) setFinalizedAt(savedFinalizedAt)
    if (savedDistributedAt) setDistributedAt(savedDistributedAt)
  }, [])

  const handleUpdateStatus = (newStatus: 'DRAFT' | 'FINALIZED' | 'DISTRIBUTED') => {
    setReportStatus(newStatus)
    localStorage.setItem('gl_report_status', newStatus)

    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    if (newStatus === 'FINALIZED') {
      setFinalizedAt(nowStr)
      localStorage.setItem('gl_report_finalized_at', nowStr)
    } else if (newStatus === 'DISTRIBUTED') {
      setDistributedAt(nowStr)
      localStorage.setItem('gl_report_distributed_at', nowStr)
    } else if (newStatus === 'DRAFT') {
      setFinalizedAt(null)
      setDistributedAt(null)
      localStorage.removeItem('gl_report_finalized_at')
      localStorage.removeItem('gl_report_distributed_at')
    }
  }

  const handleUpdateDecisionNote = (note: string) => {
    setDecisionNote(note)
    localStorage.setItem('gl_report_decision_note', note)
  }

  const handleResetReport = async () => {
    if (loading) return
    handleUpdateStatus('DRAFT')
    handleUpdateDecisionNote('')
    try {
      setLoading(true)
      const res = await fetch('/api/finance/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      })
      if (res.ok) {
        showNotif('success', 'Status laporan berhasil direset. Saldo Neraca kembali seimbang dan entri jurnal uji coba dibersihkan.')
        setCurrentPage(1)
        loadData()
      } else {
        showNotif('error', 'Gagal mereset jurnal uji coba.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat mereset jurnal.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch Data
  const loadData = async () => {
    try {
      setLoading(true)
      const ts = Date.now()
      // Fetch COA
      const coaRes = await fetch(`/api/finance/coa?t=${ts}`, { cache: 'no-store' })
      const coaJson = await coaRes.json()
      if (coaJson.data) setAkunList(coaJson.data)
 
      // Fetch Jurnal
      const jrRes = await fetch(`/api/finance/journal?page=${currentPage}&limit=10&t=${ts}`, { cache: 'no-store' })
      const jrJson = await jrRes.json()
      if (jrJson.data) {
        setJurnalList(jrJson.data)
        setTotalJurnal(jrJson.total || 0)
      }
    } catch (e) {
      console.error(e)
      showNotif('error', 'Gagal memuat data dari API. Menjalankan mode mock.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentPage])

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotif({ type, message })
    setTimeout(() => setNotif(null), 5000)
  }

  // Handle Form Change
  const handleDetailChange = (index: number, field: 'akun_id' | 'debet' | 'kredit', value: string | number) => {
    const updated = [...formDetails]
    if (field === 'akun_id') {
      updated[index].akun_id = Number(value)
    } else {
      updated[index][field] = Number(value)
      // Jurnal detail rule: jika debet diisi, kredit harus 0, dan sebaliknya
      if (field === 'debet' && Number(value) > 0) {
        updated[index].kredit = 0
      } else if (field === 'kredit' && Number(value) > 0) {
        updated[index].debet = 0
      }
    }
    setFormDetails(updated)
  }

  const addFormRow = () => {
    setFormDetails([...formDetails, { akun_id: 0, debet: 0, kredit: 0 }])
  }

  const removeFormRow = (index: number) => {
    if (formDetails.length <= 2) {
      showNotif('error', 'Entri jurnal minimal membutuhkan 2 baris detail.')
      return
    }
    setFormDetails(formDetails.filter((_, i) => i !== index))
  }

  // Calculate totals for verification
  const totalDebet = formDetails.reduce((sum, d) => sum + d.debet, 0)
  const totalKredit = formDetails.reduce((sum, d) => sum + d.kredit, 0)
  const isBalance = Math.abs(totalDebet - totalKredit) < 0.01 && totalDebet > 0

  // Post Jurnal
  const handlePostJurnal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (reportStatus !== 'DRAFT') {
      showNotif('error', 'Tidak dapat memposting jurnal. Laporan keuangan periode berjalan telah difinalisasi atau didistribusikan.')
      return
    }
    if (!isBalance) {
      showNotif('error', 'Jurnal tidak balance! Total Debet dan Kredit harus sama dan lebih besar dari 0.')
      return
    }
    if (formDetails.some(d => d.akun_id === 0)) {
      showNotif('error', 'Harap pilih akun untuk setiap baris jurnal.')
      return
    }
    if (!keteranganJurnal.trim()) {
      showNotif('error', 'Keterangan jurnal wajib diisi.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: tanggalJurnal,
          keterangan: keteranganJurnal,
          details: formDetails
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', 'Entri jurnal berhasil diposting.')
        setKeteranganJurnal('')
        setFormDetails([
          { akun_id: 0, debet: 0, kredit: 0 },
          { akun_id: 0, debet: 0, kredit: 0 }
        ])
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal memposting jurnal.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat menyimpan jurnal.')
    } finally {
      setLoading(false)
    }
  }

  // Filter COA list
  const filteredAkun = akunList.filter(akun => {
    const matchesSearch = akun.kode_akun.includes(searchCoa) || akun.nama_akun.toLowerCase().includes(searchCoa.toLowerCase())
    const matchesKategori = filterKategori === 'ALL' || akun.kategori === filterKategori
    return matchesSearch && matchesKategori
  })

  // Format currency
  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID')
  }

  // =====================================================================
  // CALCULATE FINANCIAL REPORTS
  // =====================================================================
  // 1. NERACA
  const asetList = akunList.filter(a => a.kategori === 'ASET')
  const kewajibanList = akunList.filter(a => a.kategori === 'KEWAJIBAN')
  const ekuitasList = akunList.filter(a => a.kategori === 'EKUITAS')

  const totalAset = asetList.reduce((sum, a) => sum + (a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan), 0)
  const totalKewajiban = kewajibanList.reduce((sum, a) => sum + (a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan), 0)
  const totalEkuitas = ekuitasList.reduce((sum, a) => sum + (a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan), 0)

  // 2. LABA RUGI
  const pendapatanList = akunList.filter(a => a.kategori === 'PENDAPATAN')
  const bebanList = akunList.filter(a => a.kategori === 'BEBAN')

  const totalPendapatan = pendapatanList.reduce((sum, a) => sum + (a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan), 0)
  const totalBeban = bebanList.reduce((sum, a) => sum + (a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan), 0)
  const labaRugiBersih = totalPendapatan - totalBeban

  // Adjust ekuitas in neraca with net profit
  const totalPasiva = totalKewajiban + totalEkuitas + labaRugiBersih

  // 3. TRIAL BALANCE
  const trialList = akunList.map(a => {
    const isDebet = a.saldo_normal === 'DEBET'
    return {
      id_akun: a.id_akun,
      kode_akun: a.kode_akun,
      nama_akun: a.nama_akun,
      debet: isDebet ? a.saldo_berjalan : 0,
      kredit: !isDebet ? a.saldo_berjalan : 0
    }
  })
  const totalTrialDebet = trialList.reduce((sum, a) => sum + a.debet, 0)
  const totalTrialKredit = trialList.reduce((sum, a) => sum + a.kredit, 0)

  // Format amount based on currency selection
  const formatAmount = (val: number) => {
    if (currency === 'USD') {
      return '$' + (val / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return 'Rp ' + val.toLocaleString('id-ID')
  }

const handleGeneratePDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showNotif('error', 'Gagal membuka jendela cetak. Pastikan pop-up diizinkan di browser Anda.')
      return
    }

    let reportTitle = ''
    let reportHtml = ''

    if (selectedReportType === 'neraca') {
      reportTitle = 'BALANCE SHEET (NERACA)'
      reportHtml = `
        <div style="display: flex; gap: 40px; margin-top: 20px;">
          <!-- Assets -->
          <div style="flex: 1;">
            <h3 style="border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 12px; font-size: 14px; color: #1e293b;">AKTIVA (ASET)</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="border-bottom: 1px solid #cbd5e1; text-align: left; color: #64748b;">
                  <th style="padding: 6px 0;">Kode</th>
                  <th style="padding: 6px 0;">Nama Akun</th>
                  <th style="padding: 6px 0; text-align: right;">Saldo</th>
                </tr>
              </thead>
              <tbody>
                ${asetList.map(a => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 0; font-family: monospace;">${a.kode_akun}</td>
                    <td style="padding: 8px 0; font-weight: 600; color: #334155;">${a.nama_akun}</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; font-family: monospace;">
                      ${formatAmount(a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top: 20px; border-top: 2px solid #94a3b8; border-bottom: 2px double #94a3b8; padding: 10px 0; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; color: #0f172a;">
              <span>TOTAL AKTIVA / ASET</span>
              <span style="font-family: monospace;">${formatAmount(totalAset)}</span>
            </div>
          </div>

          <!-- Pasiva -->
          <div style="flex: 1;">
            <h3 style="border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 12px; font-size: 14px; color: #1e293b;">PASIVA (KEWAJIBAN & EKUITAS)</h3>
            
            <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-top: 0; margin-bottom: 8px;">1. Kewajiban (Hutang)</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px;">
              <tbody>
                ${kewajibanList.map(a => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 0; font-family: monospace; width: 60px;">${a.kode_akun}</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #334155;">${a.nama_akun}</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold; font-family: monospace;">
                      ${formatAmount(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">2. Ekuitas (Modal)</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <tbody>
                ${ekuitasList.map(a => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 0; font-family: monospace; width: 60px;">${a.kode_akun}</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #334155;">${a.nama_akun}</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold; font-family: monospace;">
                      ${formatAmount(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                    </td>
                  </tr>
                `).join('')}
                <tr style="background-color: #f8fafc; font-weight: bold;">
                  <td style="padding: 8px; border: 1px solid #e2e8f0;" colspan="2">Laba Bersih Tahun Berjalan</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace;">
                    ${formatAmount(labaRugiBersih)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 20px; border-top: 2px solid #94a3b8; border-bottom: 2px double #94a3b8; padding: 10px 0; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; color: #0f172a;">
              <span>TOTAL PASIVA</span>
              <span style="font-family: monospace;">${formatAmount(totalPasiva)}</span>
            </div>
          </div>
        </div>
      `
    } else if (selectedReportType === 'labarugi') {
      reportTitle = 'PROFIT & LOSS STATEMENT (LAPORAN LABA RUGI)'
      reportHtml = `
        <div style="margin-top: 20px; font-size: 12px; color: #334155;">
          <!-- Revenues -->
          <div style="margin-bottom: 25px;">
            <h3 style="border-bottom: 1.5px solid #64748b; padding-bottom: 6px; margin-bottom: 10px; font-size: 13px; color: #1e293b; text-transform: uppercase;">I. Pendapatan Operasional</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                ${pendapatanList.map(a => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 0; font-family: monospace; width: 80px;">${a.kode_akun}</td>
                    <td style="padding: 8px 0; font-weight: 600;">${a.nama_akun}</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; font-family: monospace;">
                      ${formatAmount(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                    </td>
                  </tr>
                `).join('')}
                <tr style="font-weight: bold; color: #0f172a;">
                  <td style="padding: 10px 0; border-top: 1.5px solid #cbd5e1;" colspan="2">TOTAL PENDAPATAN</td>
                  <td style="padding: 10px 0; border-top: 1.5px solid #cbd5e1; text-align: right; font-family: monospace;">
                    ${formatAmount(totalPendapatan)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Expenses -->
          <div style="margin-bottom: 25px;">
            <h3 style="border-bottom: 1.5px solid #64748b; padding-bottom: 6px; margin-bottom: 10px; font-size: 13px; color: #1e293b; text-transform: uppercase;">II. Beban Operasional & Biaya</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                ${bebanList.map(a => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 0; font-family: monospace; width: 80px;">${a.kode_akun}</td>
                    <td style="padding: 8px 0; font-weight: 600;">${a.nama_akun}</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; font-family: monospace;">
                      ${formatAmount(a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan)}
                    </td>
                  </tr>
                `).join('')}
                <tr style="font-weight: bold; color: #0f172a;">
                  <td style="padding: 10px 0; border-top: 1.5px solid #cbd5e1;" colspan="2">TOTAL BEBAN OPERASIONAL</td>
                  <td style="padding: 10px 0; border-top: 1.5px solid #cbd5e1; text-align: right; font-family: monospace;">
                    ${formatAmount(totalBeban)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Net income -->
          <div style="margin-top: 30px; padding: 12px 15px; background-color: ${labaRugiBersih >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${labaRugiBersih >= 0 ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 14px; color: ${labaRugiBersih >= 0 ? '#166534' : '#991b1b'};">
            <span>LABA BERSIH TAHUN BERJALAN</span>
            <span style="font-family: monospace;">${formatAmount(labaRugiBersih)}</span>
          </div>
        </div>
      `
    } else {
      reportTitle = 'TRIAL BALANCE (NERACA SALDO)'
      reportHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569;">
              <th style="padding: 10px; text-align: center; border-right: 1px solid #e2e8f0;">Kode Akun</th>
              <th style="padding: 10px; text-align: left; border-right: 1px solid #e2e8f0;">Nama Akun</th>
              <th style="padding: 10px; text-align: right; border-right: 1px solid #e2e8f0; width: 150px;">Debet</th>
              <th style="padding: 10px; text-align: right; width: 150px;">Kredit</th>
            </tr>
          </thead>
          <tbody>
            ${trialList.map(t => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; text-align: center; font-family: monospace; border-right: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">${t.kode_akun}</td>
                <td style="padding: 8px; font-weight: bold; border-right: 1px solid #e2e8f0; color: #334155;">${t.nama_akun}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; border-right: 1px solid #e2e8f0;">
                  ${t.debet > 0 ? formatAmount(t.debet) : '�'}
                </td>
                <td style="padding: 8px; text-align: right; font-family: monospace;">
                  ${t.kredit > 0 ? formatAmount(t.kredit) : '�'}
                </td>
              </tr>
            `).join('')}
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8; color: #0f172a; font-size: 13px;">
              <td style="padding: 12px; border-right: 1px solid #e2e8f0;" colspan="2">TOTAL NERACA SALDO</td>
              <td style="padding: 12px; text-align: right; font-family: monospace; border-right: 1px solid #e2e8f0;">${formatAmount(totalTrialDebet)}</td>
              <td style="padding: 12px; text-align: right; font-family: monospace;">${formatAmount(totalTrialKredit)}</td>
            </tr>
          </tbody>
        </table>
      `
    }

    const otorisasiHtml = `
      <div style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 20px;">
        <h4 style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-top: 0; margin-bottom: 10px;">Jejak & Status Otorisasi</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #475569;">
          <tr>
            <td style="padding: 4px 0; font-weight: 600; width: 150px;">Status Laporan:</td>
            <td style="padding: 4px 0;"><span style="background-color: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #e2e8f0;">${reportStatus}</span></td>
          </tr>
          ${finalizedAt ? `
            <tr>
              <td style="padding: 4px 0; font-weight: 600;">Difinalisasi Oleh:</td>
              <td style="padding: 4px 0;">Staf GL pada <span style="font-family: monospace;">${finalizedAt}</span></td>
            </tr>
          ` : ''}
          ${distributedAt ? `
            <tr>
              <td style="padding: 4px 0; font-weight: 600;">Disetujui & Rilis:</td>
              <td style="padding: 4px 0;">Pimpinan pada <span style="font-family: monospace;">${distributedAt}</span></td>
            </tr>
          ` : ''}
          ${decisionNote ? `
            <tr>
              <td style="padding: 4px 0; font-weight: 600; vertical-align: top;">Catatan Pimpinan:</td>
              <td style="padding: 4px 0; font-style: italic; color: #334155; line-height: 1.4;">"${decisionNote}"</td>
            </tr>
          ` : ''}
        </table>
      </div>
    `

    const signatureHtml = `
      <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; color: #334155;">
        <div style="text-align: center; width: 200px;">
          <p style="margin-bottom: 50px;">Disiapkan Oleh,</p>
          <p style="border-bottom: 1px solid #334155; padding-bottom: 5px; font-weight: bold;">Staf General Ledger</p>
          <p style="font-size: 10px; color: #64748b; margin-top: 4px;">Departemen Finance</p>
        </div>
        <div style="text-align: center; width: 200px;">
          <p style="margin-bottom: 50px;">Disetujui Oleh,</p>
          <p style="border-bottom: 1px solid #334155; padding-bottom: 5px; font-weight: bold;">Pimpinan Cabang / CFO</p>
          <p style="font-size: 10px; color: #64748b; margin-top: 4px;">PT Mayora Indah Tbk</p>
        </div>
      </div>
    `

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Keuangan - ${reportPeriod}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
            margin: 0;
            padding: 30px;
            background-color: #ffffff;
            line-height: 1.5;
          }
          @media print {
            body { padding: 0; }
            @page { size: A4; margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #dc2626; padding-bottom: 12px; margin-bottom: 25px;">
          <div>
            <h1 style="margin: 0; font-size: 24px; color: #dc2626; font-weight: 800; letter-spacing: 0.05em;">MAYORA</h1>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">PT MAYORA INDAH Tbk & SUBSIDIARIES</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 700;">LAPORAN KEUANGAN</h2>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600;">Periode Ending: ${reportPeriod}</p>
          </div>
        </div>

        <!-- Meta Info -->
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
          <tr>
            <td style="padding: 10px 15px; font-weight: 600; color: #475569; width: 120px;">Laporan</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a;">${reportTitle}</td>
            <td style="padding: 10px 15px; font-weight: 600; color: #475569; width: 120px; text-align: right;">Cost Center</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a; text-align: right;">${costCenter}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: 600; color: #475569;">Mata Uang</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a;">${currency === 'USD' ? 'USD (Dolar AS)' : 'IDR (Rupiah)'}</td>
            <td style="padding: 10px 15px; font-weight: 600; color: #475569; text-align: right;">Tanggal Cetak</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a; text-align: right; font-family: monospace;">${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</td>
          </tr>
        </table>

        <!-- Report Main Body -->
        ${reportHtml}

        <!-- Otorisasi Info -->
        ${otorisasiHtml}

        <!-- Signatures -->
        ${signatureHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(fullHtml)
    printWindow.document.close()
    showNotif('success', `PDF Laporan Keuangan untuk periode ${reportPeriod} berhasil dibuat.`)
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-6 pb-12">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pt-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-red-600" style={{ width: '4px', backgroundColor: '#dc2626' }} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: '#dc2626' }}>
                Finance Module
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                General Ledger & Reporting
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Manage manual journal entries and generate financial statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Simulated Role Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
            <button
              onClick={() => handleUpdateRole('GL_OFFICER')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${userRole === 'GL_OFFICER'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Staf GL
            </button>
            <button
              onClick={() => handleUpdateRole('MANAGEMENT')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${userRole === 'MANAGEMENT'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Pimpinan
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
          {notif.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
          <span className="text-sm font-semibold">{notif.message}</span>
        </div>
      )}

      {/* Main Grid: Create Journal on Left (col-span 2), Financial Reports on Right (col-span 1) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* 1. Left Card: Create Journal Entry */}
        <div className="xl:col-span-2">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 border border-red-100 text-red-600 shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-800">
                Create Journal Entry
              </h2>
            </div>

            <form onSubmit={handlePostJurnal} className="space-y-4">
              {/* Top row fields: Posting Date, Reference Number, Currency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Posting Date
                  </label>
                  <Input
                    type="date"
                    value={tanggalJurnal}
                    onChange={(e) => setTanggalJurnal(e.target.value)}
                    disabled={reportStatus !== 'DRAFT'}
                    className="w-full h-10 px-3.5 text-xs font-semibold border border-slate-200 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-60"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Reference Number
                  </label>
                  <Input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    disabled={reportStatus !== 'DRAFT'}
                    placeholder="e.g. JE-2023-1042"
                    className="w-full h-10 px-3.5 text-xs font-semibold border border-slate-200 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-60"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={reportStatus !== 'DRAFT'}
                    className="w-full h-10 px-3.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none bg-white text-slate-800 disabled:opacity-60"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="IDR">IDR - Indonesian Rupiah</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={keteranganJurnal}
                  onChange={(e) => setKeteranganJurnal(e.target.value)}
                  disabled={reportStatus !== 'DRAFT'}
                  className="w-full min-h-[70px] p-3.5 text-xs font-semibold border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-350 disabled:opacity-60 disabled:bg-slate-50 text-slate-700"
                  placeholder={reportStatus !== 'DRAFT' ? "Jurnal dikunci karena laporan keuangan telah difinalisasi." : "Brief description of the transaction"}
                  required
                />
              </div>

              {/* Account details table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden mt-4 shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="font-semibold text-slate-500 text-xs px-4 py-3">Account</TableHead>
                      <TableHead className="font-semibold text-slate-500 text-xs px-4 py-3 text-right w-40">Debit</TableHead>
                      <TableHead className="font-semibold text-slate-500 text-xs px-4 py-3 text-right w-40">Credit</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs text-slate-700 bg-white">
                    {formDetails.map((detail, index) => (
                      <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/10 transition-colors">
                        <TableCell className="p-2.5">
                          <select
                            value={detail.akun_id}
                            onChange={(e) => handleDetailChange(index, 'akun_id', e.target.value)}
                            disabled={reportStatus !== 'DRAFT'}
                            className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400 bg-white text-slate-800 disabled:opacity-60"
                            required
                          >
                            <option value={0}>Select Account...</option>
                            {akunList.map((a) => (
                              <option key={a.id_akun} value={a.id_akun}>
                                {a.kode_akun} - {a.nama_akun}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="p-2.5">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={detail.debet || ''}
                            onChange={(e) => handleDetailChange(index, 'debet', e.target.value)}
                            disabled={reportStatus !== 'DRAFT'}
                            className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl text-xs font-bold h-9 text-right disabled:opacity-60"
                          />
                        </TableCell>
                        <TableCell className="p-2.5">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={detail.kredit || ''}
                            onChange={(e) => handleDetailChange(index, 'kredit', e.target.value)}
                            disabled={reportStatus !== 'DRAFT'}
                            className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl text-xs font-bold h-9 text-right disabled:opacity-60"
                          />
                        </TableCell>
                        <TableCell className="p-2.5 text-center">
                          {formDetails.length > 2 && reportStatus === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => removeFormRow(index)}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {reportStatus === 'DRAFT' && (
                  <div className="p-3 bg-slate-50/30 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={addFormRow}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1.5 cursor-pointer pl-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Add Line
                    </button>
                  </div>
                )}
              </div>

              {/* Summary and Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-slate-100/85 gap-4">
                <div className="flex gap-4 items-center flex-wrap">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Debit</p>
                    <p className="text-lg font-bold text-slate-800">{formatAmount(totalDebet)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Credit</p>
                    <p className="text-lg font-bold text-slate-800">{formatAmount(totalKredit)}</p>
                  </div>

                  <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

                  <div>
                    {isBalance ? (
                      <div className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" /> Balanced
                      </div>
                    ) : (
                      <div className="bg-red-50 text-red-700 border border-red-200/55 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
                        <X className="w-4 h-4 text-red-600" /> Unbalanced
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || reportStatus !== 'DRAFT'}
                    onClick={() => showNotif('success', 'Draft entri jurnal disimpan.')}
                    className="h-10 px-4 text-xs font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isBalance || loading || reportStatus !== 'DRAFT'}
                    className={`h-10 px-5 text-xs font-semibold text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      reportStatus === 'DRAFT' && isBalance
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-100'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {loading && (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {loading ? 'Processing...' : 'Post Journal'}
                  </Button>
                </div>
              </div>
            </form>
          </GlassCard>
        </div>

        {/* 2. Right Card: Financial Reports */}
        <div className="xl:col-span-1">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 border border-red-100 text-red-600 shadow-sm">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-800">
                Financial Reports
              </h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Report Type
                </label>

                <div className="space-y-2">
                  {/* Balance Sheet */}
                  <div
                    onClick={() => setSelectedReportType('neraca')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-205 ${
                      selectedReportType === 'neraca'
                        ? 'border-red-600 bg-red-50/10 font-bold text-slate-900 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedReportType === 'neraca' ? 'border-red-600 bg-white' : 'border-slate-300 bg-white'
                    }`}>
                      {selectedReportType === 'neraca' && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                    </div>
                    <span className="text-xs">Balance Sheet</span>
                  </div>
 
                  {/* Profit & Loss */}
                  <div
                    onClick={() => setSelectedReportType('labarugi')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-205 ${
                      selectedReportType === 'labarugi'
                        ? 'border-red-600 bg-red-50/10 font-bold text-slate-900 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedReportType === 'labarugi' ? 'border-red-600 bg-white' : 'border-slate-300 bg-white'
                    }`}>
                      {selectedReportType === 'labarugi' && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                    </div>
                    <span className="text-xs">Profit & Loss (Income Statement)</span>
                  </div>
 
                  {/* Trial Balance */}
                  <div
                    onClick={() => setSelectedReportType('trial')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-205 ${
                      selectedReportType === 'trial'
                        ? 'border-red-600 bg-red-50/10 font-bold text-slate-900 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedReportType === 'trial' ? 'border-red-600 bg-white' : 'border-slate-300 bg-white'
                    }`}>
                      {selectedReportType === 'trial' && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                    </div>
                    <span className="text-xs">Trial Balance</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Period Ending
                </label>
                <Input
                  type="text"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  placeholder="e.g. October 2023"
                  className="w-full h-10 px-3.5 text-xs font-semibold border border-slate-200 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Cost Center / Division
                </label>
                <select
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none bg-white text-slate-800"
                >
                  <option value="Consolidated (All)">Consolidated (All)</option>
                  <option value="Divisi Food">Divisi Food</option>
                  <option value="Divisi Beverage">Divisi Beverage</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Generate PDF
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

      </div>

      {/* Generated Report Preview Card (Conditionally shown if requested) */}
      {showReportPreview && (
        <div className="border border-slate-200 bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">
                Report Preview: {selectedReportType === 'neraca'
                  ? 'Neraca (Balance Sheet)'
                  : selectedReportType === 'labarugi'
                    ? 'Laba Rugi (Income Statement)'
                    : 'Neraca Saldo (Trial Balance)'}
              </h2>
              <p className="text-[11px] text-slate-500 font-semibold">
                Periode Ending: <span className="font-mono text-slate-700">{reportPeriod}</span> | Cost Center: <span className="text-slate-700 font-bold">{costCenter}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGeneratePDF}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[10px] font-bold text-red-600 rounded-xl border border-red-200 cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak / Simpan PDF
              </button>
              <button
                onClick={() => handleResetReport()}
                className="px-3 py-1.5 hover:bg-slate-100 text-[10px] font-bold text-slate-500 rounded-xl border border-slate-200 cursor-pointer"
              >
                Reset State
              </button>
              <button
                onClick={() => setShowReportPreview(false)}
                className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-slate-50 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Balance Sheet (Neraca) */}
            {selectedReportType === 'neraca' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side: Assets */}
                <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/10 flex flex-col justify-between min-h-[400px]">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 uppercase text-center tracking-wider">AKTIVA (ASET)</h3>
                    <div className="space-y-2 mt-3 max-h-[350px] overflow-y-auto pr-1">
                      {asetList.map((a) => (
                        <div key={a.id_akun} className="flex justify-between items-center py-2.5 border-b border-slate-100/50 text-xs">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400">{a.kode_akun}</p>
                            <p className="font-semibold text-slate-700">{a.nama_akun}</p>
                          </div>
                          <p className="font-mono font-bold text-slate-800">
                            {formatRupiah(a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 border-t-2 border-slate-300 pt-4 flex justify-between items-center font-bold text-slate-800 text-xs">
                    <span>TOTAL AKTIVA / ASET</span>
                    <span className="font-mono text-sm">{formatRupiah(totalAset)}</span>
                  </div>
                </div>

                {/* Right side: Pasiva */}
                <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/10 flex flex-col justify-between min-h-[400px]">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 uppercase text-center tracking-wider">PASIVA (KEWAJIBAN & EKUITAS)</h3>
                    <div className="mt-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">1. KEWAJIBAN (HUTANG)</h4>
                      <div className="space-y-1 pl-2 border-l border-slate-100">
                        {kewajibanList.map((a) => (
                          <div key={a.id_akun} className="flex justify-between items-center py-2 border-b border-slate-100/50 text-xs">
                            <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                            <span className="font-mono font-bold text-slate-800">
                              {formatRupiah(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">2. EKUITAS (MODAL)</h4>
                      <div className="space-y-1 pl-2 border-l border-slate-100">
                        {ekuitasList.map((a) => (
                          <div key={a.id_akun} className="flex justify-between items-center py-2 border-b border-slate-100/50 text-xs">
                            <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                            <span className="font-mono font-bold text-slate-800">
                              {formatRupiah(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center py-2 border-b border-slate-100/50 text-xs bg-slate-50/50 px-2 rounded-lg mt-1.5 border border-slate-200/50">
                          <span className="font-bold text-slate-700">Laba Bersih Tahun Berjalan</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatRupiah(labaRugiBersih)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t-2 border-slate-300 pt-4 flex justify-between items-center font-bold text-slate-800 text-xs">
                    <span>TOTAL PASIVA</span>
                    <span className="font-mono text-sm">{formatRupiah(totalPasiva)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Laba Rugi (Profit & Loss) */}
            {selectedReportType === 'labarugi' && (
              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/10 space-y-6">
                <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 uppercase text-center tracking-wider">LAPORAN LABA RUGI</h3>
                <div className="space-y-6 text-xs">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">I. PENDAPATAN OPERASIONAL</h4>
                    <div className="space-y-2 pl-4">
                      {pendapatanList.map((a) => (
                        <div key={a.id_akun} className="flex justify-between items-center py-1">
                          <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatRupiah(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center font-bold text-slate-800 border-t border-slate-200 pt-2.5 mt-2">
                        <span>TOTAL PENDAPATAN</span>
                        <span className="font-mono">{formatRupiah(totalPendapatan)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">II. BEBAN OPERASIONAL & BIAYA</h4>
                    <div className="space-y-2 pl-4">
                      {bebanList.map((a) => (
                        <div key={a.id_akun} className="flex justify-between items-center py-1">
                          <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatRupiah(a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center font-bold text-slate-800 border-t border-slate-200 pt-2.5 mt-2">
                        <span>TOTAL BEBAN OPERASIONAL</span>
                        <span className="font-mono">{formatRupiah(totalBeban)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl flex justify-between items-center font-bold text-xs border ${labaRugiBersih >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-950' : 'bg-red-50 border-red-100 text-red-900'}`}>
                    <span className="tracking-wide">LABA BERSIH TAHUN BERJALAN</span>
                    <span className="font-mono text-sm">{formatRupiah(labaRugiBersih)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Trial Balance (Neraca Saldo) */}
            {selectedReportType === 'trial' && (
              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/10 space-y-6">
                <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 uppercase text-center tracking-wider">NERACA SALDO (TRIAL BALANCE)</h3>
                <div className="border border-slate-200/50 rounded-xl overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-b border-slate-100">
                        <TableHead className="font-bold text-slate-500 text-[10px] px-4 py-2.5 text-center">Kode Akun</TableHead>
                        <TableHead className="font-bold text-slate-500 text-[10px] px-4 py-2.5">Nama Akun</TableHead>
                        <TableHead className="font-bold text-slate-500 text-[10px] px-4 py-2.5 text-right w-40">Debet</TableHead>
                        <TableHead className="font-bold text-slate-500 text-[10px] px-4 py-2.5 text-right w-40">Kredit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs text-slate-700">
                      {trialList.map((t) => (
                        <TableRow key={t.id_akun} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="font-mono font-semibold px-4 py-2 text-center text-slate-500">{t.kode_akun}</TableCell>
                          <TableCell className="font-bold px-4 py-2 text-slate-800">{t.nama_akun}</TableCell>
                          <TableCell className="text-right font-mono font-semibold px-4 py-2 text-slate-700">
                            {t.debet > 0 ? formatRupiah(t.debet) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold px-4 py-2 text-slate-700">
                            {t.kredit > 0 ? formatRupiah(t.kredit) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50/80 border-t-2 border-slate-350 font-bold text-slate-800">
                        <TableCell colSpan={2} className="px-4 py-3 uppercase tracking-wider">TOTAL NERACA SALDO</TableCell>
                        <TableCell className="text-right font-mono px-4 py-3">{formatRupiah(totalTrialDebet)}</TableCell>
                        <TableCell className="text-right font-mono px-4 py-3">{formatRupiah(totalTrialKredit)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Otorisasi, History & COA Accordion Cards at the bottom */}
      <div className="space-y-6">

        {/* 1. Laporan Otorisasi & Siklus Approval Accordion */}
        <div className="bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[24px] overflow-hidden">
          <div
            onClick={() => handleUpdateStatus(reportStatus)} // dummy click to trigger state refresh if needed, actually we can just toggle a state or click header
            className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50/80 transition-all"
          >
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-red-600" /> Siklus Otorisasi Laporan Keuangan
            </h3>
            <span className="text-xs font-bold text-slate-400">
              Otorisasi: {reportStatus}
            </span>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left side: Role status & History log */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                  <span className="text-xs font-semibold text-slate-500">Role Simulasi Aktif:</span>
                  <span className="text-xs font-bold text-slate-700">
                    {userRole === 'GL_OFFICER' ? 'Staf GL (Officer)' : 'Pimpinan (Management)'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Laporan Keuangan</label>
                  <div>
                    {reportStatus === 'DRAFT' && (
                      <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/50 uppercase tracking-wide">
                        Draft Laporan
                      </span>
                    )}
                    {reportStatus === 'FINALIZED' && (
                      <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/50 uppercase tracking-wide">
                        Finalized (Siap Review)
                      </span>
                    )}
                    {reportStatus === 'DISTRIBUTED' && (
                      <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 uppercase tracking-wide">
                        Distributed (Resmi)
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="font-semibold text-xs text-slate-600 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-400" />
                    Jejak Otorisasi Bulanan
                  </p>
                  <div className="space-y-2 text-[11px] pl-1">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span>Sistem men-generate Draf Laporan Keuangan otomatis</span>
                    </div>
                    {finalizedAt ? (
                      <div className="flex flex-col text-slate-500 pl-3">
                        <span className="font-medium text-slate-700">✓ Laporan di-finalisasi oleh Staf GL</span>
                        <span className="text-[10px] text-slate-400">{finalizedAt}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 pl-3">
                        <span>— Menunggu Finalisasi oleh Staf GL</span>
                      </div>
                    )}
                    {distributedAt ? (
                      <div className="flex flex-col text-slate-500 pl-3">
                        <span className="font-medium text-emerald-600">✓ Disetujui & didistribusikan oleh Pimpinan</span>
                        <span className="text-[10px] text-slate-400">{distributedAt}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 pl-3">
                        <span>— Menunggu Otorisasi & Distribusi Pimpinan</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side: Decision notes & Action buttons */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Catatan Keputusan Pimpinan
                    </label>
                    {reportStatus === 'DISTRIBUTED' ? (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <textarea
                    value={decisionNote}
                    onChange={(e) => handleUpdateDecisionNote(e.target.value)}
                    disabled={reportStatus !== 'FINALIZED' || userRole !== 'MANAGEMENT'}
                    placeholder={
                      reportStatus === 'DRAFT'
                        ? "Catatan dapat diisi setelah draf laporan keuangan difinalisasi."
                        : reportStatus === 'DISTRIBUTED'
                          ? "Laporan resmi telah didistribusikan. Catatan keputusan dikunci."
                          : userRole !== 'MANAGEMENT'
                            ? "Hanya Pimpinan yang dapat mengedit catatan keputusan ini."
                            : "Tulis rekomendasi, catatan evaluasi, atau disposisi persetujuan laporan keuangan..."
                    }
                    className={`w-full min-h-[90px] p-3 text-xs border rounded-xl focus:outline-none transition-all duration-300 font-medium ${reportStatus === 'FINALIZED' && userRole === 'MANAGEMENT'
                        ? 'border-slate-200 focus:border-slate-300 bg-white text-slate-700 shadow-sm'
                        : 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed'
                      }`}
                  />
                </div>

                <div className="space-y-2.5">
                  {reportStatus === 'DRAFT' && (
                    <div>
                      <button
                        onClick={() => handleUpdateStatus('FINALIZED')}
                        disabled={userRole !== 'GL_OFFICER'}
                        className={`w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${userRole === 'GL_OFFICER'
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                          }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Finalisasi Laporan
                      </button>
                      {userRole !== 'GL_OFFICER' && (
                        <p className="text-[9px] text-center text-amber-600 font-bold mt-1">
                          * Ganti role ke Staf GL untuk melakukan Finalisasi.
                        </p>
                      )}
                    </div>
                  )}

                  {reportStatus === 'FINALIZED' && (
                    <div>
                      <button
                        onClick={() => handleUpdateStatus('DISTRIBUTED')}
                        disabled={userRole !== 'MANAGEMENT'}
                        className={`w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${userRole === 'MANAGEMENT'
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                          }`}
                      >
                        <Send className="w-4 h-4" />
                        Setujui & Distribusikan
                      </button>
                      {userRole !== 'MANAGEMENT' && (
                        <p className="text-[9px] text-center text-amber-600 font-bold mt-1">
                          * Ganti role ke Pimpinan untuk memberikan Otorisasi.
                        </p>
                      )}
                    </div>
                  )}

                  {reportStatus === 'DISTRIBUTED' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center space-y-0.5">
                      <p className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Laporan Keuangan Telah Resmi Didistribusikan
                      </p>
                      <p className="text-[9px] text-emerald-600 font-semibold">
                        Transaksi dikunci secara permanen untuk periode berjalan.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleResetReport}
                    className="w-full py-1.5 px-3 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-dashed border-slate-200 hover:border-slate-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset Siklus Laporan (Simulasi)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buku Besar & Histori Jurnal */}
        <div className="bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[24px] overflow-hidden">
          <div
            onClick={() => setShowHistory(!showHistory)}
            className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50/80 transition-all"
          >
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Book className="w-4 h-4" style={{ color: '#800000' }} /> Histori Jurnal Buku Besar
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {showHistory ? 'Sembunyikan' : 'Tampilkan'}
            </span>
          </div>

          {showHistory && (
            <div className="p-6">
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-28 text-center">No Jurnal</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-24 text-center">Tanggal</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Keterangan / Rincian Akun</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right w-36">Debet</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right w-36">Kredit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs text-slate-700">
                    {jurnalList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 font-semibold text-slate-400">
                          Belum ada histori jurnal tercatat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      jurnalList.map((j) => (
                        <React.Fragment key={j.id_jurnal}>
                          {/* Jurnal Header Row */}
                          <TableRow className="bg-slate-50/50 border-t border-slate-100">
                            <TableCell className="font-mono font-bold text-slate-800 px-6 py-3 text-center">{j.no_jurnal}</TableCell>
                            <TableCell className="font-semibold text-slate-500 px-6 py-3 text-center">
                              {new Date(j.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell className="font-bold text-slate-800 px-6 py-3 uppercase" colSpan={3}>
                              {j.keterangan}
                            </TableCell>
                          </TableRow>
                          {/* Detail Rows */}
                          {j.tr_jurnal_detail.map((jd, idx) => (
                            <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/10 transition-colors">
                              <TableCell />
                              <TableCell />
                              <TableCell className="px-6 py-2.5">
                                <span className={jd.kredit > 0 ? "ml-8 text-slate-500 font-medium" : "text-slate-800 font-semibold"}>
                                  {jd.kode_akun} - {jd.nama_akun}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-slate-700 px-6 py-2.5">
                                {jd.debet > 0 ? formatRupiah(jd.debet) : '—'}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-slate-700 px-6 py-2.5">
                                {jd.kredit > 0 ? formatRupiah(jd.kredit) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalJurnal > 10 && (
                <div className="mt-4 px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-2xl">
                  <span className="text-xs text-slate-500 font-medium">
                    Menampilkan {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, totalJurnal)} dari {totalJurnal} entri
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loading}
                      variant="outline"
                      className="h-8 text-xs font-bold px-3 rounded-xl cursor-pointer"
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalJurnal / 10)))}
                      disabled={currentPage * 10 >= totalJurnal || loading}
                      variant="outline"
                      className="h-8 text-xs font-bold px-3 rounded-xl cursor-pointer"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Daftar Akun (COA) */}
        <div className="bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[24px] overflow-hidden">
          <div
            onClick={() => setShowCoa(!showCoa)}
            className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50/80 transition-all"
          >
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <List className="w-4 h-4" style={{ color: '#800000' }} /> Daftar Akun (COA / Chart of Accounts)
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {showCoa ? 'Sembunyikan' : 'Tampilkan'}
            </span>
          </div>

          {showCoa && (
            <div className="p-6 space-y-4">

              {/* Filter COA row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cari kode atau nama akun..."
                    value={searchCoa}
                    onChange={(e) => setSearchCoa(e.target.value)}
                    className="pl-9 pr-4 h-9 border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl min-w-[240px]"
                  />
                </div>

                {/* Kategori Filters buttons */}
                <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
                  {['ALL', 'ASET', 'KEWAJIBAN', 'EKUITAS', 'PENDAPATAN', 'BEBAN'].map((kat) => (
                    <button
                      key={kat}
                      onClick={() => setFilterKategori(kat)}
                      className={`px-3.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${filterKategori === kat ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      {kat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-36 text-center">Kode Akun</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Nama Rekening Akun</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-40">Kategori</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-32">Saldo Normal</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right w-52">Saldo Berjalan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs text-slate-700">
                    {filteredAkun.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 font-semibold text-slate-400">
                          Akun tidak ditemukan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAkun.map((a) => {
                        const badgeMap = {
                          ASET: "bg-blue-50 text-blue-700 border-blue-100",
                          KEWAJIBAN: "bg-orange-50 text-orange-700 border-orange-100",
                          EKUITAS: "bg-purple-50 text-purple-700 border-purple-100",
                          PENDAPATAN: "bg-emerald-50 text-emerald-700 border-emerald-100",
                          BEBAN: "bg-red-50 text-red-700 border-red-100"
                        }
                        return (
                          <TableRow key={a.id_akun} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                            <TableCell className="font-mono font-bold text-slate-800 px-6 py-4 text-center">{a.kode_akun}</TableCell>
                            <TableCell className="font-bold text-slate-800 px-6 py-4">{a.nama_akun}</TableCell>
                            <TableCell className="text-center px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${badgeMap[a.kategori]}`}>
                                {a.kategori}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-slate-400 px-6 py-4">{a.saldo_normal}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-800 px-6 py-4">{formatRupiah(a.saldo_berjalan)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  )
}
