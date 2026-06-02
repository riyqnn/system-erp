'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  ClipboardList,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Wallet,
  Receipt,
  ArrowUp,
  ArrowDown,
  FileText,
  Briefcase,
  CheckCircle,
  Clock,
  ArrowRightLeft
} from "lucide-react"
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

function useNumberRoll(finalValue: number, duration = 1500) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * finalValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [finalValue, duration]);

  return displayValue;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  return `Rp ${value.toLocaleString()}`;
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
        bg-white/90 backdrop-blur-xl
        border border-white/70
        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]
        rounded-3xl overflow-hidden
        ${hover ? "hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5" : ""}
        transition-all duration-500 ease-out
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
  value: number | string;
  formattedValue?: string;
  change?: number | null;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "red" | "green" | "orange" | "blue" | "purple";
  href?: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  trendData?: number[];
  index?: number;
}

const kpiColorConfig = {
  red: {
    bg: "bg-gradient-to-br from-red-50/95 to-red-50/50",
    icon: "text-red-600",
    border: "border-red-100/60",
    glow: "hover:shadow-[0_0_32px_rgba(238,68,68,0.15)]",
    accent: CHART_COLORS.primary,
  },
  green: {
    bg: "bg-gradient-to-br from-emerald-50/95 to-emerald-50/50",
    icon: "text-emerald-600",
    border: "border-emerald-100/60",
    glow: "hover:shadow-[0_0_32px_rgba(16,185,129,0.15)]",
    accent: CHART_COLORS.secondary,
  },
  orange: {
    bg: "bg-gradient-to-br from-orange-50/95 to-orange-50/50",
    icon: "text-orange-500",
    border: "border-orange-100/60",
    glow: "hover:shadow-[0_0_32px_rgba(249,115,22,0.15)]",
    accent: CHART_COLORS.quaternary,
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50/95 to-blue-50/50",
    icon: "text-blue-600",
    border: "border-blue-100/60",
    glow: "hover:shadow-[0_0_32px_rgba(59,130,246,0.15)]",
    accent: CHART_COLORS.tertiary,
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-50/95 to-purple-50/50",
    icon: "text-purple-600",
    border: "border-purple-100/60",
    glow: "hover:shadow-[0_0_32px_rgba(139,92,246,0.15)]",
    accent: CHART_COLORS.quinary,
  },
};

function PremiumKPICard({
  title,
  value,
  formattedValue,
  change,
  changeLabel,
  icon: Icon,
  color,
  href,
  secondaryValue,
  secondaryLabel,
  trendData,
  index = 0,
}: PremiumKPICardProps) {
  const config = kpiColorConfig[color];
  const numericValue = typeof value === "number" ? value : 0;
  const rolledValue = useNumberRoll(numericValue);
  const [isHovered, setIsHovered] = useState(false);

  const content = (
    <GlassCard
      hover={!!href}
      className={`relative ${href ? "cursor-pointer" : ""} ${config.glow}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[${config.accent}] to-transparent opacity-0 transition-opacity duration-500 ${isHovered ? "opacity-60" : ""}`}
      />

      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div
            className={`
              w-11 h-11 rounded-2xl ${config.bg} ${config.border}
              border flex items-center justify-center
              transition-all duration-400 ease-out
              ${isHovered ? "scale-110 rotate-[-3deg]" : ""}
            `}
          >
            <Icon className={`w-5 h-5 ${config.icon}`} />
          </div>
          {change !== undefined && change !== null && (
            <div
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                ${change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}
              `}
            >
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color: BRAND.textPrimary }}>
            {formattedValue || (typeof value === "number" ? rolledValue.toLocaleString() : value)}
          </p>
          <p className="text-sm font-medium" style={{ color: BRAND.textSecondary }}>
            {title}
          </p>
        </div>

        {(secondaryValue || changeLabel) && (
          <div className="mt-4 pt-4 border-t border-slate-100/60 flex items-center justify-between">
            {secondaryValue && (
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: BRAND.textMuted }}>
                  {secondaryLabel}
                </p>
                <p className="text-sm font-semibold" style={{ color: BRAND.textPrimary }}>
                  {secondaryValue}
                </p>
              </div>
            )}
            {changeLabel && (
              <p className="text-xs" style={{ color: BRAND.textMuted }}>
                {changeLabel}
              </p>
            )}
          </div>
        )}

        {trendData && (
          <div className="mt-4 pt-4 border-t border-slate-100/60">
            <svg
              viewBox={`0 0 100 24`}
              preserveAspectRatio="none"
              className="w-full h-6"
            >
              <defs>
                <linearGradient id={`trend-${index}-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={config.accent} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={config.accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                points={trendData.map((v, i) => `${(i / (trendData.length - 1)) * 100},${24 - ((v - Math.min(...trendData)) / (Math.max(...trendData) - Math.min(...trendData) || 1)) * 20}`).join(" ")}
                fill="none"
                stroke={config.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70"
              />
              <polygon
                points={`0,24 ${trendData.map((v, i) => `${(i / (trendData.length - 1)) * 100},${24 - ((v - Math.min(...trendData)) / (Math.max(...trendData) - Math.min(...trendData) || 1)) * 20}`).join(" ")} 100,24`}
                fill={`url(#trend-${index}-${color})`}
                className="opacity-40"
              />
            </svg>
          </div>
        )}
      </CardContent>
    </GlassCard>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
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

function InvoiceItem({ code, name, amount, dueDate, type, status, index = 0 }: InvoiceItemProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const maxAmount = 2_000_000_000; // Reference maximum amount for visualization

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress((amount / maxAmount) * 100);
    }, 200 + index * 50);
    return () => clearTimeout(timer);
  }, [amount, index]);

  const statusConfig = {
    overdue: {
      bg: "bg-red-50/80",
      dot: "bg-red-500",
      text: "text-red-700",
      border: "border-red-100/60",
      bar: "from-red-400 to-red-500",
      label: "Overdue",
    },
    pending: {
      bg: "bg-orange-50/80",
      dot: "bg-orange-500",
      text: "text-orange-700",
      border: "border-orange-100/60",
      bar: "from-orange-400 to-orange-500",
      label: "Pending Verification",
    },
    sent: {
      bg: "bg-blue-50/80",
      dot: "bg-blue-500",
      text: "text-blue-700",
      border: "border-blue-100/60",
      bar: "from-blue-400 to-blue-500",
      label: "Outstanding",
    },
    paid: {
      bg: "bg-emerald-50/80",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      border: "border-emerald-100/60",
      bar: "from-emerald-400 to-emerald-500",
      label: "Paid",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-all duration-200 border-b border-slate-100/50 last:border-0">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === "overdue" ? "animate-pulse" : ""}`}
        />
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${config.bg} ${config.text} ${config.border} border`}
        >
          {config.label}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-semibold text-slate-400">
            {code}
          </span>
          <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium ${type === "customer" ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"}`}>
            {type === "customer" ? "Customer" : "Vendor"}
          </span>
        </div>
        <p className="text-xs font-medium text-slate-800 truncate mt-0.5">
          {name}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-24 flex flex-col items-end gap-1">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${config.bar} transition-all duration-800 ease-out`}
              style={{ width: `${Math.min(animatedProgress, 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatNumber(amount)}
            </span>
          </div>
        </div>

        <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
          {status === "paid" ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-slate-400" />}
        </div>

        <div className="w-24 text-right opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-slate-500 truncate">
            Due: {dueDate}
          </p>
        </div>
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
  transfer: { icon: ArrowRightLeft, color: "blue", bg: "bg-blue-50", iconColor: "text-blue-600", sign: "→" },
};

function TransactionFeedItem({ timestamp, type, reference, description, amount, account, performer }: TransactionFeedItemProps) {
  const config = transactionTypeConfig[type];
  const Icon = config.icon;

  return (
    <div className="group flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 transition-all duration-300 border-b border-slate-100/60 last:border-0">
      <div
        className={`
          w-10 h-10 rounded-2xl ${config.bg} ${config.iconColor}
          border border-white/50 flex items-center justify-center flex-shrink-0
          group-hover:scale-105 group-hover:rotate-3 transition-all duration-300
        `}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono" style={{ color: BRAND.textMuted }}>
            {timestamp}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium capitalize">
            {type}
          </span>
        </div>
        <p className="text-sm font-medium" style={{ color: BRAND.textPrimary }}>
          <span className="font-mono text-xs" style={{ color: BRAND.textMuted }}>
            {reference}
          </span>{" "}
          - {description}
        </p>
        <p className="text-[10px]" style={{ color: BRAND.textMuted }}>
          Account: {account} · by {performer}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p
          className={`
            text-sm font-semibold tabular-nums
            ${config.color === "emerald" ? "text-emerald-700" : config.color === "red" ? "text-red-700" : config.color === "purple" ? "text-purple-700" : config.color === "orange" ? "text-orange-700" : "text-blue-700"}
          `}
        >
          {config.sign} {formatNumber(amount)}
        </p>
      </div>
    </div>
  );
}

export function FinancePageClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
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

  const KPI_DATA = [
    {
      title: "Total Saldo Kas & Bank",
      value: 12450000000,
      formattedValue: "Rp 12.45B",
      change: 4.8,
      changeLabel: "vs bulan lalu",
      icon: Wallet,
      color: "green" as const,
      href: "/finance/treasury",
      secondaryValue: "3 Rekening Utama",
      secondaryLabel: "Accounts",
      trendData: [11.2, 11.5, 11.4, 11.8, 12.0, 12.1, 12.3, 12.45],
    },
    {
      title: "Piutang Usaha (AR)",
      value: 4850000000,
      formattedValue: "Rp 4.85B",
      change: -12.5,
      changeLabel: "penurunan piutang",
      icon: Receipt,
      color: "blue" as const,
      href: "/finance/account-receivable",
      secondaryValue: "14 Faktur Overdue",
      secondaryLabel: "Status",
      trendData: [5.8, 5.6, 5.5, 5.2, 5.1, 5.0, 4.9, 4.85],
    },
    {
      title: "Utang Usaha (AP)",
      value: 2900000000,
      formattedValue: "Rp 2.90B",
      change: 3.2,
      changeLabel: "vs bulan lalu",
      icon: ClipboardList,
      color: "orange" as const,
      href: "/finance/account-payable",
      secondaryValue: "8 Tagihan Baru",
      secondaryLabel: "Pending Approval",
      trendData: [2.5, 2.6, 2.55, 2.7, 2.8, 2.75, 2.85, 2.9],
    },
    {
      title: "Net Profit Margin (YTD)",
      value: 18.5,
      formattedValue: "18.5%",
      change: 2.1,
      changeLabel: "vs Q1 2026",
      icon: TrendingUp,
      color: "purple" as const,
      href: "/finance/general-ledger",
      secondaryValue: "Target: 17.5%",
      secondaryLabel: "Goal Alignment",
      trendData: [16.5, 17.0, 16.8, 17.2, 17.5, 17.8, 18.2, 18.5],
    },
  ];

  const CASHFLOW_TREND_DATA = [
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

  const EXPENSE_DISTRIBUTION = [
    { label: "Biaya Produksi", value: 6200, color: "#EE4444" },
    { label: "Marketing & Sales", value: 2400, color: "#3B82F6" },
    { label: "Logistik & WH", value: 1100, color: "#10B981" },
    { label: "Gaji & Admin", value: 800, color: "#F97316" },
    { label: "Pajak & Legal", value: 300, color: "#8B5CF6" },
  ];

  const BUDGET_VS_ACTUAL = [
    {
      category: "Biaya Produksi",
      values: [
        { label: "Anggaran", value: 6500, color: CHART_COLORS.tertiary },
        { label: "Realisasi", value: 6200, color: CHART_COLORS.primary },
      ],
    },
    {
      category: "Marketing & Sales",
      values: [
        { label: "Anggaran", value: 2800, color: CHART_COLORS.tertiary },
        { label: "Realisasi", value: 2400, color: CHART_COLORS.primary },
      ],
    },
    {
      category: "Logistik & WH",
      values: [
        { label: "Anggaran", value: 1000, color: CHART_COLORS.tertiary },
        { label: "Realisasi", value: 1100, color: CHART_COLORS.primary },
      ],
    },
    {
      category: "Gaji & Admin",
      values: [
        { label: "Anggaran", value: 850, color: CHART_COLORS.tertiary },
        { label: "Realisasi", value: 800, color: CHART_COLORS.primary },
      ],
    },
    {
      category: "Pajak & Legal",
      values: [
        { label: "Anggaran", value: 350, color: CHART_COLORS.tertiary },
        { label: "Realisasi", value: 300, color: CHART_COLORS.primary },
      ],
    },
  ];

  const OUTSTANDING_INVOICES = [
    { code: "INV-2026-001", name: "PT Indomarco Prismatama", amount: 1250000000, dueDate: "10 Jun 2026", type: "customer" as const, status: "sent" as const },
    { code: "INV-2026-008", name: "PT Sumber Alfaria Trijaya", amount: 980000000, dueDate: "28 Mei 2026", type: "customer" as const, status: "overdue" as const },
    { code: "BILL-2026-045", name: "Wilmar Chemical Indonesia", amount: 1500000000, dueDate: "15 Jun 2026", type: "vendor" as const, status: "pending" as const },
    { code: "INV-2026-012", name: "Hero Supermarket Group", amount: 450000000, dueDate: "05 Jun 2026", type: "customer" as const, status: "sent" as const },
    { code: "BILL-2026-049", name: "PT Chevron Pacific Indonesia", amount: 320000000, dueDate: "25 Mei 2026", type: "vendor" as const, status: "overdue" as const },
  ];

  const RECENT_TRANSACTIONS = [
    { timestamp: "15:30", type: "revenue" as const, reference: "TX-90218", description: "Penerimaan Invoice INV-2026-004", amount: 850000000, account: "BCA Mandiri", performer: "Ahmad Y." },
    { timestamp: "14:15", type: "disbursement" as const, reference: "TX-90217", description: "Pembayaran Vendor BILL-2026-019", amount: 420000000, account: "Mandiri Corp", performer: "Sarah K." },
    { timestamp: "11:00", type: "payroll" as const, reference: "TX-90216", description: "Gaji Karyawan Mayora HO - Mei", amount: 2450000000, account: "Mandiri Corp", performer: "Auto" },
    { timestamp: "09:30", type: "tax" as const, reference: "TX-90215", description: "Penyetoran PPN Masa April", amount: 150000000, account: "Kas Negara", performer: "Budi S." },
    { timestamp: "08:45", type: "transfer" as const, reference: "TX-90214", description: "Transfer Kas BCA ke Mandiri", amount: 500000000, account: "Internal", performer: "Ahmad Y." },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-2 pb-12">
        <div className="flex items-end justify-between pt-2 animate-[fadeInUp_0.5s_ease-out]">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: BRAND.primary }} />
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: BRAND.primary }}
                >
                  Modul Finance
                </p>
                <h1 className="text-3xl font-semibold tracking-tight" style={{ color: BRAND.textPrimary }}>
                  Dashboard Analitik
                </h1>
              </div>
            </div>
            <p className="text-sm ml-4" style={{ color: BRAND.textSecondary }}>
              Overview performa finansial & arus kas PT Mayora Indah
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-100/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">Live Data</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2 hover:bg-slate-100/80 transition-all duration-300 font-medium rounded-2xl cursor-pointer"
            >
              <Download className="w-4 h-4" style={{ color: BRAND.textMuted }} />
              Export
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2 hover:bg-slate-100/80 transition-all duration-300 font-medium rounded-2xl cursor-pointer"
            >
              <Filter className="w-4 h-4" style={{ color: BRAND.textMuted }} />
              Filter
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {KPI_DATA.map((kpi, index) => (
            <PremiumKPICard key={kpi.title} {...kpi} index={index} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 animate-[fadeInUp_0.5s_ease-out_0.1s_both]">
            <GlassCard>
              <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                    Trend Arus Kas Bulanan (12 Bulan)
                  </h3>
                  <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                    Perbandingan Pendapatan (Revenue) vs Pengeluaran (Expense) · *Nilai dalam Juta Rp
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.secondary }} />
                    <span className="text-xs" style={{ color: BRAND.textMuted }}>Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.primary }} />
                    <span className="text-xs" style={{ color: BRAND.textMuted }}>Expense</span>
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
                />
              </div>
            </GlassCard>
          </div>

          <div className="animate-[fadeInUp_0.5s_ease-out_0.15s_both]">
            <GlassCard>
              <div className="px-6 py-5 border-b border-slate-100/60">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                    Distribusi Pengeluaran
                  </h3>
                  <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                    Berdasarkan kategori alokasi biaya · *Nilai dalam Juta Rp
                  </p>
                </div>
              </div>
              <div className="p-6 flex flex-col items-center justify-center">
                <DonutChart
                  segments={EXPENSE_DISTRIBUTION}
                  size={220}
                  strokeWidth={36}
                  showLabels
                  showCenterText
                  centerText="Rp 10.8B"
                  centerSubtext="Total Expenses"
                />
              </div>
              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-3">
                  {EXPENSE_DISTRIBUTION.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] truncate" style={{ color: BRAND.textMuted }}>
                          {item.label}
                        </p>
                        <p className="text-xs font-semibold" style={{ color: BRAND.textPrimary }}>
                          {formatNumber(item.value * 1_000_000)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        <div className="animate-[fadeInUp_0.5s_ease-out_0.2s_both]">
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                  Analisis Anggaran vs Realisasi Pengeluaran
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  Perbandingan alokasi anggaran vs pengeluaran aktual per kategori · *Nilai dalam Juta Rp
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.tertiary }} />
                  <span className="text-xs" style={{ color: BRAND.textMuted }}>Anggaran</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.primary }} />
                  <span className="text-xs" style={{ color: BRAND.textMuted }}>Realisasi Pengeluaran</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <MultiBarChart
                data={BUDGET_VS_ACTUAL}
                height={240}
                showGrid
                showLegend={false}
                barRadius={4}
                barSpacing={4}
              />
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 animate-[fadeInUp_0.5s_ease-out_0.25s_both]">
            <GlassCard>
              <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                    Faktur Jatuh Tempo (AR & AP)
                  </h3>
                  <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                    Daftar faktur pelanggan & tagihan pemasok dengan prioritas tinggi
                  </p>
                </div>
                <Link
                  href="/finance/account-receivable"
                  className="text-xs font-semibold flex items-center gap-1 hover:underline transition-all"
                  style={{ color: BRAND.primary }}
                >
                  Lihat Semua Faktur
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100/60">
                {OUTSTANDING_INVOICES.map((inv, index) => (
                  <InvoiceItem key={inv.code} {...inv} index={index} />
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
            <GlassCard>
              <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                    Aktivitas Transaksi Terakhir
                  </h3>
                  <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                    Arus transaksi keuangan terbaru hari ini
                  </p>
                </div>
                <Link
                  href="/finance/treasury"
                  className="text-xs font-semibold flex items-center gap-1 hover:underline transition-all"
                  style={{ color: BRAND.primary }}
                >
                  Rincian Transaksi
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex flex-col">
                {RECENT_TRANSACTIONS.map((tx) => (
                  <TransactionFeedItem key={tx.reference} {...tx} />
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
  )
}
