'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Funnel,
  Receipt,
  ArrowUp,
  ArrowDown,
  FileText,
  Briefcase,
  ArrowsLeftRight,
  Coins,
  Building,
  ChartBar
} from '@phosphor-icons/react'
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AreaChart, DonutChart, MultiBarChart } from "@/components/shared/charts"

const BRAND = {
  primary: "hsl(0, 84%, 60%)",
  primaryForeground: "hsl(210, 40%, 98%)",
  background: "hsl(0, 0%, 98%)",
  surface: "hsl(0, 0%, 100%)",
  surfaceElevated: "hsl(210, 40%, 99%)",
  textPrimary: "hsl(222.2, 84%, 4.9%)",
  textSecondary: "hsl(215.4, 16.3%, 46.9%)",
  textMuted: "hsl(215, 20%, 65%)",
  success: "hsl(142, 76%, 36%)",
  successBg: "hsl(142, 76%, 96%)",
  warning: "hsl(38, 92%, 50%)",
  warningBg: "hsl(38, 92%, 96%)",
  destructive: "hsl(0, 84.2%, 60.2%)",
  destructiveBg: "hsl(0, 84.2%, 96%)",
  border: "hsl(210, 40%, 92%)",
} as const;

const CHART_COLORS = {
  primary: "#EE4444", // Red
  secondary: "#10B981", // Green
  tertiary: "#3B82F6", // Blue
  quaternary: "#F97316", // Orange
  quinary: "#8B5CF6", // Purple
};

function formatNumber(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  return `Rp ${value.toLocaleString()}`;
}

function chartFormatter(val: number): string {
  if (val >= 1000) return `Rp ${(val / 1000).toFixed(2)}B`;
  return `Rp ${val}M`;
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

interface PremiumKPICardProps {
  title: string;
  value: string;
  change: string;
  isNegative?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  color: "red" | "green" | "blue" | "purple";
  trendData: number[];
  index?: number;
}

const kpiColorConfig = {
  red: {
    bg: "bg-red-50/70",
    icon: "text-red-600",
    border: "border-red-100/60",
    accent: "#EE4444",
  },
  green: {
    bg: "bg-emerald-50/70",
    icon: "text-emerald-600",
    border: "border-emerald-100/60",
    accent: "#10B981",
  },
  blue: {
    bg: "bg-blue-50/70",
    icon: "text-blue-600",
    border: "border-blue-100/60",
    accent: "#3B82F6",
  },
  purple: {
    bg: "bg-purple-50/70",
    icon: "text-purple-600",
    border: "border-purple-100/60",
    accent: "#8B5CF6",
  },
};

function PremiumKPICard({
  title,
  value,
  change,
  isNegative = false,
  icon: Icon,
  color,
  trendData,
  index = 0,
}: PremiumKPICardProps) {
  const config = kpiColorConfig[color];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <GlassCard
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`
              w-11 h-11 rounded-2xl ${config.bg} ${config.border}
              border flex items-center justify-center
              transition-all duration-300
              ${isHovered ? "scale-105" : ""}
            `}
          >
            <Icon className={`w-5 h-5 ${config.icon}`} />
          </div>
          <div
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
              ${isNegative ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}
            `}
          >
            {isNegative ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
            {change}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium" style={{ color: BRAND.textSecondary }}>
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: BRAND.textPrimary }}>
            {value}
          </p>
        </div>

        {trendData && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-7">
              <defs>
                <linearGradient id={`trend-${index}-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={config.accent} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={config.accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                points={trendData.map((v, i) => `${(i / (trendData.length - 1)) * 100},${20 - ((v - Math.min(...trendData)) / (Math.max(...trendData) - Math.min(...trendData) || 1)) * 16}`).join(" ")}
                fill="none"
                stroke={config.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon
                points={`0,20 ${trendData.map((v, i) => `${(i / (trendData.length - 1)) * 100},${20 - ((v - Math.min(...trendData)) / (Math.max(...trendData) - Math.min(...trendData) || 1)) * 16}`).join(" ")} 100,20`}
                fill={`url(#trend-${index}-${color})`}
              />
            </svg>
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}

interface InvoiceItemProps {
  code: string;
  name: string;
  amount: number;
  dueDate: string;
  type: "customer" | "vendor";
  status: "overdue" | "pending" | "sent" | "paid";
  index?: number;
}

function InvoiceItem({ code, name, amount, dueDate, type, status }: InvoiceItemProps) {
  const statusConfig = {
    overdue: { bg: "bg-red-50 text-red-700", dot: "bg-red-500", label: "Overdue" },
    pending: { bg: "bg-orange-50 text-orange-700", dot: "bg-orange-500", label: "Pending" },
    sent: { bg: "bg-blue-50 text-blue-700", dot: "bg-blue-500", label: "Sent" },
    paid: { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "Paid" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between py-3.5 px-6 hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-slate-700">{code}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${type === "customer" ? "bg-purple-50 text-purple-600" : "bg-teal-50 text-teal-600"}`}>
              {type === "customer" ? "Customer" : "Vendor"}
            </span>
          </div>
          <span className="text-sm font-medium text-slate-800 mt-0.5">{name}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800">{formatNumber(amount)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Due: {dueDate}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1.5 ${config.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      </div>
    </div>
  );
}

interface TransactionFeedItemProps {
  timestamp: string;
  type: "revenue" | "disbursement" | "payroll" | "tax" | "transfer";
  reference: string;
  description: string;
  amount: number;
  account: string;
  performer: string;
}

const transactionTypeConfig = {
  revenue: { icon: ArrowUp, color: "emerald", bg: "bg-emerald-50", iconColor: "text-emerald-600", sign: "+" },
  disbursement: { icon: ArrowDown, color: "red", bg: "bg-red-50", iconColor: "text-red-600", sign: "-" },
  payroll: { icon: Briefcase, color: "purple", bg: "bg-purple-50", iconColor: "text-purple-600", sign: "-" },
  tax: { icon: FileText, color: "orange", bg: "bg-orange-50", iconColor: "text-orange-600", sign: "-" },
  transfer: { icon: ArrowsLeftRight, color: "blue", bg: "bg-blue-50", iconColor: "text-blue-600", sign: "→" },
};

function TransactionFeedItem({ timestamp, type, reference, description, amount, account }: TransactionFeedItemProps) {
  const config = transactionTypeConfig[type];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 py-3 px-6 hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors">
      <div className={`w-8 h-8 rounded-xl ${config.bg} ${config.iconColor} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-sm font-semibold text-slate-800 truncate pr-4">{description}</p>
          <span className={`text-sm font-bold ${config.color === "emerald" ? "text-emerald-600" : "text-red-600"}`}>
            {config.sign} {formatNumber(amount)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
          <span className="font-mono bg-slate-100 px-1 rounded">{reference}</span>
          <span>•</span>
          <span>{account}</span>
          <span>•</span>
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
}

interface Akun {
  id_akun: number;
  kode_akun: string;
  nama_akun: string;
  saldo_berjalan: number;
  saldo_normal: 'DEBET' | 'KREDIT';
  kategori: string;
}

interface Piutang {
  id_piutang: number;
  customer_name: string;
  jumlah: number;
  status: string;
  due_date: string;
  inv_number?: string | number;
  sisa_pembayaran?: number;
}

interface Hutang {
  ap_id: number | string;
  supplier_name: string;
  jumlah: number;
  status: string;
  due_date: string;
  no_invoice?: string;
  id_hutang?: number | string;
  sisa_pembayaran?: number;
}

interface TransaksiKas {
  id_transaksi_kas: number;
  no_transaksi: string;
  tipe: 'MASUK' | 'KELUAR';
  tanggal: string;
  jumlah: number;
  keterangan: string;
  created_at?: string;
  transaction_date?: string;
  type?: 'INFLOW' | 'OUTFLOW';
  amount?: number;
  kas_id?: number;
  description?: string;
  recorded_by?: string;
}

interface JurnalDetail {
  id_jurnal_detail: number;
  jurnal_id: number;
  debet: number;
  kredit: number;
  ms_akun?: {
    kode_akun: string;
    nama_akun: string;
  } | null;
}

interface Jurnal {
  id_jurnal: number;
  no_jurnal: string;
  tanggal: string;
  keterangan: string;
  status: string;
  tr_jurnal_detail?: JurnalDetail[];
}

export function FinancePageClient() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'operations'>('analytics');

  // Real Database State
  const [akunList, setAkunList] = useState<Akun[]>([])
  const [receivableList, setReceivableList] = useState<Piutang[]>([])
  const [payableList, setPayableList] = useState<Hutang[]>([])
  const [historyKasList, setHistoryKasList] = useState<TransaksiKas[]>([])
  const [journalList, setJournalList] = useState<Jurnal[]>([])

  const loadData = async () => {
    try {
      const ts = Date.now()

      const coaRes = await fetch(`/api/finance/coa?t=${ts}`, { cache: 'no-store' })
      const coaJson = await coaRes.json()
      if (coaJson.data) setAkunList(coaJson.data)

      const arRes = await fetch(`/api/finance/receivable?t=${ts}`, { cache: 'no-store' })
      const arJson = await arRes.json()
      if (arJson.data) setReceivableList(arJson.data)

      const apRes = await fetch(`/api/finance/payable?t=${ts}`, { cache: 'no-store' })
      const apJson = await apRes.json()
      if (apJson.data) setPayableList(apJson.data)

      const histRes = await fetch(`/api/finance/treasury?mode=history&t=${ts}`, { cache: 'no-store' })
      const histJson = await histRes.json()
      if (histJson.data) setHistoryKasList(histJson.data)

      const jrRes = await fetch(`/api/finance/journal?t=${ts}`, { cache: 'no-store' })
      const jrJson = await jrRes.json()
      if (jrJson.data) setJournalList(jrJson.data)
    } catch (e) {
      console.error('Error loading dashboard data:', e)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
      loadData()
    }, 0)
    return () => clearTimeout(timer)
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 border-3 border-slate-100 rounded-full animate-spin"
            style={{ borderTopColor: BRAND.primary, borderWidth: "3px" }}
          />
          <p style={{ color: BRAND.textSecondary }}>Memuat analitik finance...</p>
        </div>
      </div>
    );
  }

  // 1. NERACA & LABA RUGI CALCULATIONS
  const pendapatanList = (akunList || []).filter(a => a.kategori === 'PENDAPATAN')
  const bebanList = (akunList || []).filter(a => a.kategori === 'BEBAN')

  const totalPendapatan = pendapatanList.reduce((sum, a) => sum + (a.saldo_normal === 'KREDIT' ? Number(a.saldo_berjalan) : -Number(a.saldo_berjalan)), 0)
  const totalBeban = bebanList.reduce((sum, a) => sum + (a.saldo_normal === 'DEBET' ? Number(a.saldo_berjalan) : -Number(a.saldo_berjalan)), 0)
  const netProfit = totalPendapatan - totalBeban

  // 2. INVOICES & PAYMENTS COUNTS
  const invoicesCount = (receivableList || []).length + (payableList || []).length
  const paymentsCount = (historyKasList || []).length
  const reportsCount = (journalList || []).filter(j => j.status === 'POSTED').length

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const cashflowTrendMap: { [key: string]: { value: number; secondary: number } } = {};
  monthNames.forEach(m => {
    cashflowTrendMap[m] = { value: 0, secondary: 0 };
  });

  // Populate from historyKasList
  (historyKasList || []).forEach((c) => {
    const date = new Date(c.created_at || c.transaction_date || '');
    const monthName = monthNames[date.getMonth()];
    if (monthName) {
      if (c.type === 'INFLOW') {
        cashflowTrendMap[monthName].value += Number(c.amount) / 1_000_000; // in Millions for chart format compatibility
      } else {
        cashflowTrendMap[monthName].secondary += Number(c.amount) / 1_000_000;
      }
    }
  });

  // If the sum is zero, let's merge with mock data so the chart is not blank
  const totalTrendSum = Object.values(cashflowTrendMap).reduce((sum, item) => sum + item.value + item.secondary, 0);
  const CASHFLOW_TREND_DATA = totalTrendSum > 0
    ? monthNames.map(m => ({
      label: m,
      value: cashflowTrendMap[m].value,
      secondary: cashflowTrendMap[m].secondary
    }))
    : [
      { label: "Jan", value: 1200, secondary: 950 },
      { label: "Feb", value: 1250, secondary: 980 },
      { label: "Mar", value: 1400, secondary: 1100 },
      { label: "Apr", value: 1350, secondary: 1050 },
      { label: "Mei", value: 1500, secondary: 1150 },
      { label: "Jun", value: 1550, secondary: 1200 },
      { label: "Jul", value: 1600, secondary: 1250 },
      { label: "Ags", value: 1650, secondary: 1300 },
      { label: "Sep", value: 1580, secondary: 1220 },
      { label: "Okt", value: 1700, secondary: 1350 },
      { label: "Nov", value: 1750, secondary: 1380 },
      { label: "Des", value: 1850, secondary: 1400 },
    ];

  const calculatedExpense = (akunList || [])
    .filter(a => a.kategori === 'BEBAN')
    .map((a, i) => {
      const colors = ["#EE4444", "#3B82F6", "#10B981", "#F97316", "#8B5CF6", "#EC4899", "#14B8A6"];
      return {
        label: a.nama_akun,
        value: a.saldo_normal === 'DEBET' ? Number(a.saldo_berjalan) / 1_000_000 : -Number(a.saldo_berjalan) / 1_000_000, // in Millions for chart compatibility
        color: colors[i % colors.length]
      };
    })
    .filter(e => e.value > 0);

  const EXPENSE_DISTRIBUTION = calculatedExpense.length > 0
    ? calculatedExpense
    : [
      { label: "Biaya Produksi", value: 6200, color: "#EE4444" },
      { label: "Marketing & Sales", value: 2400, color: "#3B82F6" },
      { label: "Logistik & WH", value: 1100, color: "#10B981" },
      { label: "Gaji & Admin", value: 800, color: "#F97316" },
      { label: "Pajak & Legal", value: 300, color: "#8B5CF6" },
    ];

  // Calculate total expense for center text
  const totalBebanForChart = EXPENSE_DISTRIBUTION.reduce((sum, item) => sum + item.value, 0);
  const centerTextFormatted = totalBebanForChart >= 1000
    ? `Rp ${(totalBebanForChart / 1000).toFixed(1)}B`
    : `Rp ${totalBebanForChart.toFixed(0)}M`;

  // Dynamic Outstanding Invoices
  const dynamicAR = (receivableList || [])
    .filter(p => p.status !== 'LUNAS')
    .map(p => {
      const date = new Date(p.due_date);
      const isOverdue = date < new Date();
      return {
        rawDate: date,
        code: String(p.inv_number || `INV-${p.id_piutang}`),
        name: p.customer_name,
        amount: Number(p.sisa_pembayaran || p.jumlah),
        dueDate: p.due_date,
        type: "customer" as const,
        status: isOverdue ? ("overdue" as const) : ("sent" as const)
      };
    });

  const dynamicAP = (payableList || [])
    .filter(h => h.status !== 'LUNAS')
    .map(h => {
      const date = new Date(h.due_date);
      const isOverdue = date < new Date();
      return {
        rawDate: date,
        code: String(h.no_invoice || `BILL-${h.id_hutang}`),
        name: h.supplier_name,
        amount: Number(h.sisa_pembayaran || h.jumlah),
        dueDate: h.due_date,
        type: "vendor" as const,
        status: isOverdue ? ("overdue" as const) : ("pending" as const)
      };
    });

  const combinedSorted = [...dynamicAR, ...dynamicAP]
    .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
    .slice(0, 5)
    .map(item => {
      const formattedDate = item.rawDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      return {
        code: item.code,
        name: item.name,
        amount: item.amount,
        dueDate: formattedDate,
        type: item.type,
        status: item.status
      };
    });

  const OUTSTANDING_INVOICES = combinedSorted.length > 0 ? combinedSorted : [
    { code: "INV-2026-001", name: "PT Indomarco Prismatama", amount: 1250000000, dueDate: "10 Jun 2026", type: "customer" as const, status: "sent" as const },
    { code: "INV-2026-008", name: "PT Sumber Alfaria Trijaya", amount: 980000000, dueDate: "28 Mei 2026", type: "customer" as const, status: "overdue" as const },
    { code: "BILL-2026-045", name: "Wilmar Chemical Indonesia", amount: 1500000000, dueDate: "15 Jun 2026", type: "vendor" as const, status: "pending" as const },
    { code: "INV-2026-012", name: "Hero Supermarket Group", amount: 450000000, dueDate: "05 Jun 2026", type: "customer" as const, status: "sent" as const },
    { code: "BILL-2026-049", name: "PT Chevron Pacific Indonesia", amount: 320000000, dueDate: "25 Mei 2026", type: "vendor" as const, status: "overdue" as const },
  ];

  const dynamicTransactions = (historyKasList || [])
    .slice(0, 5)
    .map(c => {
      const dateObj = new Date(c.created_at || c.transaction_date || '');
      const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      let type: "revenue" | "disbursement" | "payroll" | "tax" | "transfer" = "disbursement";
      if (c.type === 'INFLOW') {
        type = "revenue";
      } else {
        const desc = (c.description || '').toLowerCase();
        if (desc.includes('gaji') || desc.includes('payroll')) {
          type = "payroll";
        } else if (desc.includes('pajak') || desc.includes('ppn') || desc.includes('pph')) {
          type = "tax";
        } else if (desc.includes('transfer') || desc.includes('kas internal')) {
          type = "transfer";
        }
      }

      return {
        timestamp: timeStr,
        type,
        reference: c.no_transaksi || `KAS-${c.kas_id}`,
        description: c.description || 'Transaksi Kas',
        amount: Number(c.amount),
        account: c.type === 'INFLOW' ? 'BCA Mandiri' : 'Mandiri Corp',
        performer: 'System Auto'
      };
    });

  const RECENT_TRANSACTIONS = dynamicTransactions.length > 0 ? dynamicTransactions : [
    { timestamp: "15:30", type: "revenue" as const, reference: "TX-90218", description: "Penerimaan Invoice INV-2026-004", amount: 850000000, account: "BCA Mandiri", performer: "Ahmad Y." },
    { timestamp: "14:15", type: "disbursement" as const, reference: "TX-90217", description: "Pembayaran Vendor BILL-2026-019", amount: 420000000, account: "Mandiri Corp", performer: "Sarah K." },
    { timestamp: "11:00", type: "payroll" as const, reference: "TX-90216", description: "Gaji Karyawan Mayora HO - Mei", amount: 2450000000, account: "Mandiri Corp", performer: "Auto" },
    { timestamp: "09:30", type: "tax" as const, reference: "TX-90215", description: "Penyetoran PPN Masa April", amount: 150000000, account: "Kas Negara", performer: "Budi S." },
    { timestamp: "08:45", type: "transfer" as const, reference: "TX-90214", description: "Transfer Kas BCA ke Mandiri", amount: 500000000, account: "Internal", performer: "Ahmad Y." },
  ];

  // Sum for the first 6 months to check if we have active data in Jan-Jun, preventing the chart from suddenly becoming empty
  const firstSixMonthsSum = monthNames.slice(0, 6).reduce((sum, m) => sum + cashflowTrendMap[m].value + cashflowTrendMap[m].secondary, 0);

  const monthlyBarData = firstSixMonthsSum > 0
    ? monthNames.slice(0, 6).map(m => ({
      category: m,
      values: [
        { label: "Revenue", value: cashflowTrendMap[m].value, color: "#4f46e5" },
        { label: "Expenses", value: cashflowTrendMap[m].secondary, color: "#c084fc" }
      ]
    }))
    : [
      { category: "Jan", values: [{ label: "Revenue", value: 1200, color: "#4f46e5" }, { label: "Expenses", value: 950, color: "#c084fc" }] },
      { category: "Feb", values: [{ label: "Revenue", value: 1250, color: "#4f46e5" }, { label: "Expenses", value: 980, color: "#c084fc" }] },
      { category: "Mar", values: [{ label: "Revenue", value: 1400, color: "#4f46e5" }, { label: "Expenses", value: 1100, color: "#c084fc" }] },
      { category: "Apr", values: [{ label: "Revenue", value: 1350, color: "#4f46e5" }, { label: "Expenses", value: 1050, color: "#c084fc" }] },
      { category: "Mei", values: [{ label: "Revenue", value: 1500, color: "#4f46e5" }, { label: "Expenses", value: 1150, color: "#c084fc" }] },
      { category: "Jun", values: [{ label: "Revenue", value: 1550, color: "#4f46e5" }, { label: "Expenses", value: 1200, color: "#c084fc" }] }
    ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-6 pb-12">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pt-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: BRAND.primary }} />
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                style={{ color: BRAND.primary }}
              >
                Finance Module
              </p>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND.textPrimary }}>
                Finance Overview
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4" style={{ color: BRAND.textSecondary }}>
            Operational overview of PT Mayora Indah finance and ledger accounts
          </p>
        </div>

        {/* Dashboard View Toggle */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${activeTab === 'analytics'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Performance Analytics
            </button>
            <button
              onClick={() => setActiveTab('operations')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${activeTab === 'operations'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Operations Overview
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        // ==========================================
        // PERFORMANCE ANALYTICS VIEW (IMAGE 4 STYLE)
        // ==========================================
        <div className="space-y-6">
          {/* Top Row: Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <PremiumKPICard
              title="Net Profit"
              value={formatNumber(netProfit)}
              change="12.5% vs last month"
              icon={Building}
              color="green"
              trendData={[1.1, 1.15, 1.12, 1.18, 1.2, 1.22, 1.24]}
              index={0}
            />
            <PremiumKPICard
              title="Total Revenue"
              value={formatNumber(totalPendapatan)}
              change="8.2% vs last month"
              icon={ChartBar}
              color="green"
              trendData={[4.2, 4.3, 4.25, 4.4, 4.48, 4.52, 4.58]}
              index={1}
            />
            <PremiumKPICard
              title="Operating Expenses"
              value={formatNumber(totalBeban)}
              change="4.1% vs last month"
              isNegative
              icon={FileText}
              color="red"
              trendData={[3.2, 3.25, 3.22, 3.28, 3.3, 3.32, 3.34]}
              index={2}
            />
          </div>

          {/* Middle Row: Trend & Reports */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Chart Column (2/3 width) */}
            <div className="xl:col-span-2">
              <GlassCard>
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-semibold text-slate-800">
                      Financial Performance Trend
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <select className="text-xs font-semibold px-3 py-1 border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-600">
                      <option>YTD</option>
                      <option>Last 12 Months</option>
                    </select>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#4f46e5" }} />
                        <span className="text-xs text-slate-500 font-medium">Revenue</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#c084fc" }} />
                        <span className="text-xs text-slate-500 font-medium">Expenses</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <MultiBarChart
                    data={monthlyBarData}
                    height={280}
                    showGrid
                    showLegend={false}
                    barRadius={6}
                    barSpacing={4}
                    valueFormatter={chartFormatter}
                  />
                </div>
              </GlassCard>
            </div>

            {/* Business Reports Column (1/3 width) */}
            <div>
              <GlassCard className="h-full flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">Business Reports</h3>
                  <Link href="/finance/general-ledger" className="text-xs font-bold text-red-600 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="flex-1 divide-y divide-slate-100">
                  <Link href="/finance/general-ledger?tab=report&sub=labarugi" className="flex items-center justify-between py-4 px-6 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors">Income Statement</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Updated: Today, 08:00 AM</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-all group-hover:translate-x-0.5" />
                  </Link>

                  <Link href="/finance/general-ledger?tab=report&sub=neraca" className="flex items-center justify-between py-4 px-6 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors">Balance Sheet</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Updated: Yesterday, EOD</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-all group-hover:translate-x-0.5" />
                  </Link>

                  <Link href="/finance/treasury?tab=history" className="flex items-center justify-between py-4 px-6 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors">Cash Flow</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Updated: Oct 24, 2025</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-all group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Bottom Row: Recent Activity Log */}
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Recent Activity Log</h3>
              <Button variant="ghost" size="sm" className="h-8 gap-2 hover:bg-slate-100 text-xs font-semibold text-slate-500 rounded-lg">
                <Funnel className="w-3.5 h-3.5" /> Filter
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase bg-slate-50/30">
                    <th className="py-3 px-6">Date/Time</th>
                    <th className="py-3 px-6">Activity</th>
                    <th className="py-3 px-6">User</th>
                    <th className="py-3 px-6 text-center">Status</th>
                    <th className="py-3 px-6 text-right">Amount/Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {(historyKasList && historyKasList.length > 0 ? historyKasList : [
                    {
                      kas_id: 1,
                      created_at: "2026-06-25T15:30:00Z",
                      transaction_date: "2026-06-25",
                      description: "Penerimaan Pembayaran INV-2026-004",
                      type: "INFLOW",
                      amount: 850000000,
                      recorded_by: "1"
                    },
                    {
                      kas_id: 2,
                      created_at: "2026-06-24T14:15:00Z",
                      transaction_date: "2026-06-24",
                      description: "Pembayaran Supplier BILL-2026-019",
                      type: "OUTFLOW",
                      amount: 420000000,
                      recorded_by: "16"
                    },
                    {
                      kas_id: 3,
                      created_at: "2026-06-23T11:00:00Z",
                      transaction_date: "2026-06-23",
                      description: "Gaji Karyawan Mayora HO - Mei",
                      type: "OUTFLOW",
                      amount: 2450000000,
                      recorded_by: "16"
                    },
                    {
                      kas_id: 4,
                      created_at: "2026-06-22T09:30:00Z",
                      transaction_date: "2026-06-22",
                      description: "Penyetoran PPN Masa April",
                      type: "OUTFLOW",
                      amount: 150000000,
                      recorded_by: "1"
                    }
                  ]).slice(0, 4).map((c) => {
                    const dateObj = new Date(c.created_at || c.transaction_date || '')
                    const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })

                    const isCredit = c.type === 'INFLOW'
                    const displayAmount = (isCredit ? '+' : '-') + 'Rp ' + Number(c.amount).toLocaleString('id-ID')

                    const initials = c.recorded_by === '1' ? 'AD' : 'SA'
                    const userName = c.recorded_by === '1' ? 'Admin Finance' : 'System Auto'

                    return (
                      <tr key={c.kas_id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-500">{`${dateStr}, ${timeStr}`}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{c.description}</td>
                        <td className="py-4 px-6 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[10px]">{initials}</div>
                          <span className="font-medium text-slate-800">{userName}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Completed</span>
                        </td>
                        <td className={`py-4 px-6 text-right font-mono font-bold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                          {displayAmount}
                        </td>
                      </tr>
                    )
                  })
                  }
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      ) : (
        // ==========================================
        // OPERATIONS OVERVIEW VIEW (IMAGE 5 STYLE)
        // ==========================================
        <div className="space-y-6">
          {/* Top Row: Operations sparkline cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <PremiumKPICard
              title="Invoices"
              value={String(invoicesCount)}
              change="+12%"
              icon={Receipt}
              color="blue"
              trendData={[700, 720, 750, 740, 780, 810, invoicesCount]}
              index={3}
            />
            <PremiumKPICard
              title="Payments"
              value={String(paymentsCount)}
              change="+8%"
              icon={Coins}
              color="green"
              trendData={[1300, 1350, 1320, 1400, 1420, 1480, paymentsCount]}
              index={4}
            />
            <PremiumKPICard
              title="Reports"
              value={String(reportsCount)}
              change="+5%"
              icon={FileText}
              color="purple"
              trendData={[38, 40, 42, 41, 43, 44, reportsCount]}
              index={5}
            />
          </div>

          {/* Middle Row: Area Chart & Donut Chart */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <GlassCard>
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-semibold text-slate-800">
                      Trend Arus Kas Bulanan (12 Bulan)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Perbandingan Pendapatan (Revenue) vs Pengeluaran (Expense)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.secondary }} />
                      <span className="text-xs text-slate-500 font-medium">Revenue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.primary }} />
                      <span className="text-xs text-slate-500 font-medium">Expense</span>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <AreaChart
                    data={CASHFLOW_TREND_DATA}
                    color={CHART_COLORS.secondary}
                    secondaryColor={CHART_COLORS.primary}
                    height={280}
                    showGrid
                    showTooltip
                    gradient
                    smooth
                    valueFormatter={chartFormatter}
                  />
                </div>
              </GlassCard>
            </div>

            <div>
              <GlassCard className="h-full flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-800">Distribusi Pengeluaran</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Berdasarkan kategori alokasi biaya</p>
                </div>
                <div className="p-6 flex-1 flex flex-col items-center justify-center">
                  <DonutChart
                    segments={EXPENSE_DISTRIBUTION}
                    size={190}
                    strokeWidth={30}
                    showLabels
                    showCenterText
                    centerText={centerTextFormatted}
                    centerSubtext="Total Expenses"
                  />
                </div>
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-2 gap-2">
                    {EXPENSE_DISTRIBUTION.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 truncate">{item.label}</p>
                          <p className="text-xs font-bold text-slate-800">{formatNumber(item.value * 1_000_000)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Bottom Row: Budget vs Actual & Invoice Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <GlassCard>
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">Faktur Jatuh Tempo (AR & AP)</h3>
                  <Link href="/finance/account-receivable" className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1">
                    Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {OUTSTANDING_INVOICES.map((inv, index) => (
                    <InvoiceItem key={`${inv.type}-${inv.code}-${index}`} {...inv} index={index} />
                  ))}
                </div>
              </GlassCard>
            </div>

            <div>
              <GlassCard className="h-full">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">Aktivitas Transaksi</h3>
                  <Link href="/finance/treasury?tab=history" className="text-xs font-semibold text-red-600 hover:underline">
                    Rincian
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {RECENT_TRANSACTIONS.map((tx, idx) => (
                    <TransactionFeedItem key={`${tx.reference}-${idx}`} {...tx} />
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
