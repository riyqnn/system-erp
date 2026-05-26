"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  PackageCheck,
  Activity,
  Warehouse,
  Layers,
  RefreshCw,
  Filter,
  Download,
  Zap,
  MousePointer2,
} from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, MultiBarChart, DonutChart } from "@/components/shared/charts";

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
  primary: "#EE4444",
  secondary: "#10B981",
  tertiary: "#3B82F6",
  quaternary: "#F97316",
  quinary: "#8B5CF6",
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
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
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

interface StockItemProps {
  code: string;
  name: string;
  current: number;
  safety: number;
  max: number;
  category: string;
  location: string;
  status: "optimal" | "low" | "critical" | "overstock";
  trend: "up" | "down" | "stable";
  index?: number;
}

function StockItem({ code, name, current, safety, max, category, location, status, trend, index = 0 }: StockItemProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress((current / max) * 100);
    }, 200 + index * 50);
    return () => clearTimeout(timer);
  }, [current, max, index]);

  const statusConfig = {
    optimal: {
      bg: "bg-emerald-50/80",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      border: "border-emerald-100/60",
      bar: "from-emerald-400 to-emerald-500",
      label: "Optimal",
    },
    low: {
      bg: "bg-orange-50/80",
      dot: "bg-orange-500",
      text: "text-orange-700",
      border: "border-orange-100/60",
      bar: "from-orange-400 to-orange-500",
      label: "Low",
    },
    critical: {
      bg: "bg-red-50/80",
      dot: "bg-red-500",
      text: "text-red-700",
      border: "border-red-100/60",
      bar: "from-red-400 to-red-500",
      label: "Critical",
    },
    overstock: {
      bg: "bg-blue-50/80",
      dot: "bg-blue-500",
      text: "text-blue-700",
      border: "border-blue-100/60",
      bar: "from-blue-400 to-blue-500",
      label: "Overstock",
    },
  };

  const config = statusConfig[status];
  const safetyPct = (safety / max) * 100;

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-all duration-200 border-b border-slate-100/50 last:border-0">
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === "critical" ? "animate-pulse" : ""}`}
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
          <span className="text-[9px] px-1 py-0.5 rounded-full bg-slate-100/80 text-slate-500 font-medium">
            {category}
          </span>
        </div>
        <p className="text-xs font-medium text-slate-800 truncate mt-0.5">
          {name}
        </p>
      </div>

      
      <div className="flex items-center gap-3 flex-shrink-0">
        
        <div className="w-20 flex flex-col items-end gap-1">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
            
            <div
              className="absolute top-0 bottom-0 w-px bg-slate-300/70 z-10"
              style={{ left: `${Math.min(safetyPct, 95)}%` }}
            />
            
            <div
              className={`h-full rounded-full bg-gradient-to-r ${config.bar} transition-all duration-800 ease-out`}
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="font-semibold text-slate-800 tabular-nums">
              {current.toLocaleString()}
            </span>
            <span className="text-slate-400">
              / {safety.toLocaleString()}
            </span>
          </div>
        </div>

        
        <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
          {trend === "up" && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
          {trend === "down" && <ArrowDownRight className="w-3 h-3 text-red-500" />}
          {trend === "stable" && <Activity className="w-3 h-3 text-slate-400" />}
        </div>

        
        <div className="w-20 text-right opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-slate-500 truncate">
            {location}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ActivityFeedItemProps {
  timestamp: string;
  type: "receipt" | "issue" | "transfer" | "production" | "adjustment";
  itemCode: string;
  itemName: string;
  quantity: number;
  uom: string;
  reference: string;
  performer: string;
  index?: number;
}

const activityTypeConfig = {
  receipt: { icon: PackageCheck, color: "emerald", bg: "bg-emerald-50", iconColor: "text-emerald-600", sign: "+" },
  issue: { icon: Truck, color: "red", bg: "bg-red-50", iconColor: "text-red-600", sign: "-" },
  transfer: { icon: Layers, color: "blue", bg: "bg-blue-50", iconColor: "text-blue-600", sign: "→" },
  production: { icon: RefreshCw, color: "purple", bg: "bg-purple-50", iconColor: "text-purple-600", sign: "+" },
  adjustment: { icon: ClipboardList, color: "orange", bg: "bg-orange-50", iconColor: "text-orange-600", sign: "±" },
};

function ActivityFeedItem({ timestamp, type, itemCode, itemName, quantity, uom, reference, performer }: ActivityFeedItemProps) {
  const config = activityTypeConfig[type];
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
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {type}
          </span>
        </div>
        <p className="text-sm font-medium" style={{ color: BRAND.textPrimary }}>
          <span className="font-mono text-xs" style={{ color: BRAND.textMuted }}>
            {itemCode}
          </span>{" "}
          - {itemName}
        </p>
        <p className="text-[10px]" style={{ color: BRAND.textMuted }}>
          {reference} · by {performer}
        </p>
      </div>

      
      <div className="text-right flex-shrink-0">
        <p
          className={`
            text-lg font-semibold tabular-nums
            ${config.color === "emerald" ? "text-emerald-700" : config.color === "red" ? "text-red-700" : config.color === "purple" ? "text-purple-700" : "text-blue-700"}
          `}
        >
          {config.sign} {quantity.toLocaleString()} {uom}
        </p>
      </div>
    </div>
  );
}

export default function InventoryDashboardPage() {
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
          <p style={{ color: BRAND.textSecondary }}>Memuat analitik...</p>
        </div>
      </div>
    );
  }
  const KPI_DATA = [
    {
      title: "Total Nilai Inventori",
      value: 4200000000,
      formattedValue: "Rp 4.2B",
      change: 3.2,
      changeLabel: "vs bulan lalu",
      icon: Warehouse,
      color: "red" as const,
      href: "/inventory/ledger",
      secondaryValue: "2,847 SKU",
      secondaryLabel: "Items",
      trendData: [3.8, 3.9, 3.85, 4.0, 4.1, 4.05, 4.15, 4.2],
    },
    {
      title: "Turnover Rate",
      value: 4.8,
      formattedValue: "4.8x",
      change: 0.4,
      changeLabel: "vs Q1 2026",
      icon: TrendingUp,
      color: "green" as const,
      secondaryValue: "76 hari",
      secondaryLabel: "Days Inventory",
      trendData: [4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.75, 4.8],
    },
    {
      title: "Items di Bawah Safety Stock",
      value: 12,
      formattedValue: "12",
      change: -2,
      changeLabel: "dari minggu lalu",
      icon: AlertTriangle,
      color: "orange" as const,
      href: "/inventory/monitoring-stok",
      secondaryValue: "3 Critical",
      secondaryLabel: "Prioritas",
      trendData: [18, 16, 15, 14, 13, 13, 12, 12],
    },
    {
      title: "Tugas Tertunda",
      value: 45,
      formattedValue: "45",
      change: null,
      changeLabel: "GR: 12 · DO: 33",
      icon: ClipboardList,
      color: "blue" as const,
      href: "/inventory/goods-receipt",
      secondaryValue: "8 Overdue",
      secondaryLabel: "SLA Breach",
      trendData: [30, 35, 32, 40, 38, 42, 44, 45],
    },
  ];
  const STOCK_TREND_DATA = [
    { label: "Jan", value: 4200, secondary: 3800 },
    { label: "Feb", value: 4100, secondary: 3900 },
    { label: "Mar", value: 4350, secondary: 4000 },
    { label: "Apr", value: 4500, secondary: 4100 },
    { label: "Mei", value: 4400, secondary: 4200 },
    { label: "Jun", value: 4600, secondary: 4300 },
    { label: "Jul", value: 4750, secondary: 4400 },
    { label: "Ags", value: 4900, secondary: 4500 },
    { label: "Sep", value: 4800, secondary: 4600 },
    { label: "Okt", value: 5000, secondary: 4700 },
    { label: "Nov", value: 5100, secondary: 4800 },
    { label: "Des", value: 5200, secondary: 4900 },
  ];
  const CATEGORY_DISTRIBUTION = [
    {
      category: "RM",
      values: [
        { label: "Bahan Baku", value: 18500, color: CHART_COLORS.primary },
        { label: "Packaging", value: 8200, color: CHART_COLORS.secondary },
      ],
    },
    {
      category: "WIP",
      values: [
        { label: "Bahan Baku", value: 3200, color: CHART_COLORS.primary },
        { label: "Packaging", value: 1800, color: CHART_COLORS.secondary },
      ],
    },
    {
      category: "FG",
      values: [
        { label: "Bahan Baku", value: 12500, color: CHART_COLORS.primary },
        { label: "Packaging", value: 6800, color: CHART_COLORS.secondary },
      ],
    },
    {
      category: "SPG",
      values: [
        { label: "Bahan Baku", value: 4500, color: CHART_COLORS.primary },
        { label: "Packaging", value: 2200, color: CHART_COLORS.secondary },
      ],
    },
  ];
  const INVENTORY_DISTRIBUTION = [
    { label: "Raw Material", value: 26700, color: "#EE4444" },
    { label: "WIP", value: 5000, color: "#3B82F6" },
    { label: "Finished Goods", value: 19300, color: "#10B981" },
    { label: "Spare Parts", value: 6700, color: "#F97316" },
  ];
  const CRITICAL_STOCK = [
    { code: "FG-001", name: "Kopiko Blister 100g", current: 1200, safety: 2000, max: 5000, category: "FG", location: "WH-A-01", status: "critical" as const, trend: "down" as const },
    { code: "FG-005", name: "Beng-Beng ShareIt", current: 850, safety: 1500, max: 3000, category: "FG", location: "WH-A-02", status: "low" as const, trend: "down" as const },
    { code: "RM-102", name: "Cocoa Powder", current: 300, safety: 500, max: 2000, category: "RM", location: "WH-B-15", status: "low" as const, trend: "stable" as const },
    { code: "RM-045", name: "Sugar Refinery", current: 4500, safety: 3000, max: 4000, category: "RM", location: "WH-B-03", status: "overstock" as const, trend: "up" as const },
    { code: "FG-012", name: "Astor Mini Box", current: 800, safety: 1200, max: 2500, category: "FG", location: "WH-A-05", status: "low" as const, trend: "down" as const },
  ];
  const RECENT_ACTIVITY = [
    { timestamp: "14:23", type: "receipt" as const, itemCode: "RM-102", itemName: "Cocoa Powder", quantity: 500, uom: "kg", reference: "GR-2023-11B", performer: "Rini W." },
    { timestamp: "13:45", type: "production" as const, itemCode: "FG-001", itemName: "Kopiko Blister 100g", quantity: 1000, uom: "pcs", reference: "PRD-2023-441", performer: "Auto" },
    { timestamp: "12:30", type: "issue" as const, itemCode: "FG-005", itemName: "Beng-Beng ShareIt", quantity: 200, uom: "carton", reference: "DO-2023-1192", performer: "Budi S." },
    { timestamp: "11:15", type: "transfer" as const, itemCode: "RM-045", itemName: "Sugar Refinery", quantity: 1000, uom: "kg", reference: "TRF-2023-089", performer: "Dewi K." },
    { timestamp: "10:00", type: "receipt" as const, itemCode: "PKG-023", itemName: "Wrapper Film", quantity: 500, uom: "roll", reference: "GR-2023-11A", performer: "Andi P." },
  ];
  

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-6 pb-12">
      
      <div className="flex items-end justify-between pt-2 animate-[fadeInUp_0.5s_ease-out]">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: BRAND.primary }} />
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                style={{ color: BRAND.primary }}
              >
                Modul Inventori
              </p>
              <h1 className="text-3xl font-semibold tracking-tight" style={{ color: BRAND.textPrimary }}>
                Dashboard Analitik
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4" style={{ color: BRAND.textSecondary }}>
            Overview operasional inventori PT Mayora Indah
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
            className="h-9 gap-2 hover:bg-slate-100/80 transition-all duration-300 font-medium rounded-2xl"
          >
            <Download className="w-4 h-4" style={{ color: BRAND.textMuted }} />
            Export
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 hover:bg-slate-100/80 transition-all duration-300 font-medium rounded-2xl"
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
                  Trend Nilai Inventori (12 Bulan)
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  Perbandingan nilai buku vs nilai pasar
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.primary }} />
                  <span className="text-xs" style={{ color: BRAND.textMuted }}>Nilai Buku</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.secondary }} />
                  <span className="text-xs" style={{ color: BRAND.textMuted }}>Nilai Pasar</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <AreaChart
                data={STOCK_TREND_DATA}
                color={CHART_COLORS.primary}
                secondaryColor={CHART_COLORS.secondary}
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
                  Distribusi Inventori
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  Berdasarkan tipe material
                </p>
              </div>
            </div>
            <div className="p-6 flex flex-col items-center justify-center">
              <DonutChart
                segments={INVENTORY_DISTRIBUTION}
                size={220}
                strokeWidth={36}
                showLabels
                showCenterText
                centerText="57.7K"
                centerSubtext="Total Units"
              />
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-3">
                {INVENTORY_DISTRIBUTION.slice(0, 4).map((item, i) => (
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
                        {formatNumber(item.value)}
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
                Analisis Kategori Material
              </h3>
              <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                Distribusi Bahan Baku vs Packaging per tipe inventori
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.primary }} />
                <span className="text-xs" style={{ color: BRAND.textMuted }}>Bahan Baku</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.secondary }} />
                <span className="text-xs" style={{ color: BRAND.textMuted }}>Packaging</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <MultiBarChart
              data={CATEGORY_DISTRIBUTION}
              height={240}
              showGrid
              showLegend={false}
              barRadius={4}
              barSpacing={4}
            />
          </div>
        </GlassCard>
      </div>

      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        <div className="animate-[fadeInUp_0.5s_ease-out_0.25s_both]">
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                  Monitoring Stok Kritis
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  Items memerlukan perhatian segera
                </p>
              </div>
              <Link href="/inventory/monitoring-stok">
                <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
                  Lihat Semua
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-slate-100/60">
              {CRITICAL_STOCK.map((item, i) => (
                <StockItem key={item.code} {...item} index={i} />
              ))}
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100/60">
              <Link href="/inventory/permintaan-produksi">
                <Button className="w-full h-9 text-sm bg-red-500 hover:bg-red-600 text-white font-medium shadow-[0_2px_8px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.3)]">
                  <Zap className="w-4 h-4 mr-2" />
                  Buat Permintaan Produksi
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>

        
        <div className="animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold" style={{ color: BRAND.textPrimary }}>
                  Aktivitas Real-time
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  Transaksi inventori terkini
                </p>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50/80 border border-emerald-100/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-700">Live</span>
              </div>
            </div>
            <div className="divide-y divide-slate-100/60 max-h-[380px] overflow-y-auto">
              {RECENT_ACTIVITY.map((item, i) => (
                <ActivityFeedItem key={i} {...item} index={i} />
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100/60 text-center">
              <Link
                href="/inventory/ledger"
                className="text-xs font-medium transition-colors duration-300 inline-flex items-center gap-1"
                style={{ color: BRAND.textMuted }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = BRAND.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = BRAND.textMuted;
                }}
              >
                <MousePointer2 className="w-3.5 h-3.5" />
                Lihat semua transaksi di Ledger
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>

      
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        * {
          animation-fill-mode: forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }

        
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 2px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>
    </div>
  );
}
