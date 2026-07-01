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

function StockItem({ code, name, current, safety, category, status }: StockItemProps) {
  const isCritical = status === "critical";
  const isLow = status === "low";

  return (
    <div className="flex items-center justify-between py-3.5 px-6 hover:bg-slate-50/80 border-b border-slate-100/60 last:border-0 transition-colors group">
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full shadow-sm ${isCritical ? 'bg-red-500 animate-pulse shadow-red-500/40' : isLow ? 'bg-orange-500 shadow-orange-500/40' : 'bg-emerald-500 shadow-emerald-500/40'}`} />
        <div>
          <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900 transition-colors">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-500 font-mono bg-slate-100/80 px-1.5 py-0.5 rounded">{code}</span>
            <span className="text-[11px] text-slate-400">{category}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${isCritical ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-slate-800'}`}>
          {current.toLocaleString()}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">Target: {safety.toLocaleString()}</p>
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

function ActivityFeedItem({ timestamp, type, itemCode, itemName, quantity, uom, reference }: ActivityFeedItemProps) {
  const config = activityTypeConfig[type] || activityTypeConfig.adjustment;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 py-3.5 px-6 hover:bg-slate-50/80 border-b border-slate-100/60 last:border-0 transition-colors group">
      <div className={`mt-0.5 w-8 h-8 rounded-full ${config.bg} ${config.iconColor} flex items-center justify-center shrink-0 ring-1 ring-inset ring-${config.color}-500/10`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <p className="text-sm font-medium text-slate-800 truncate pr-4 group-hover:text-slate-900 transition-colors">
            {itemName}
          </p>
          <span className={`text-sm font-bold shrink-0 ${config.iconColor}`}>
            {config.sign} {quantity.toLocaleString()} <span className="text-[10px] font-medium opacity-70 ml-0.5">{uom}</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-mono bg-slate-100/80 px-1.5 py-0.5 rounded text-slate-600">{itemCode}</span>
            <span>•</span>
            <span className="truncate max-w-[120px]" title={reference}>{reference}</span>
          </div>
          <p className="font-medium text-slate-400 shrink-0">{timestamp}</p>
        </div>
      </div>
    </div>
  );
}

interface KPIItem {
  title: string;
  value: string | number;
  formattedValue: string;
  change: number;
  changeLabel: string;
  color: "red" | "green" | "orange" | "blue" | "purple";
  href: string;
  secondaryValue: string;
}

interface InventoryDistributionItem {
  label: string;
  value: number;
  color: string;
}

interface CriticalStockItem {
  code: string;
  name: string;
  current: number;
  safety: number;
  max: number;
  category: string;
  location: string;
  status: "optimal" | "critical" | "low" | "overstock";
  trend: "up" | "down" | "stable";
}

interface RecentActivityItem {
  timestamp: string;
  type: "receipt" | "issue" | "adjustment" | "transfer";
  itemCode: string;
  itemName: string;
  quantity: number;
  uom: string;
  reference: string;
  performer: string;
}

interface DashboardData {
  kpi: KPIItem[];
  inventoryDistribution: InventoryDistributionItem[];
  criticalStock: CriticalStockItem[];
  recentActivity: RecentActivityItem[];
}

type CriticalStockExportItem = {
  product_id: string;
  product_name: string;
  category: string;
  location: string;
  current: number;
  min: number;
  max: number;
  status: string;
  trend: string;
};

type RecentActivityExportItem = {
  timestamp: string;
  type: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  uom: string;
  reference: string;
  performer: string;
};

type InventoryDistributionExportItem = {
  label: string;
  value: number;
  color: string;
};

type DashboardExportData = CriticalStockItem[] | RecentActivityItem[] | InventoryDistributionItem[];

type DashboardExportPayload = CriticalStockExportItem[] | RecentActivityExportItem[] | InventoryDistributionExportItem[];

export default function InventoryDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/inventory/dashboard');
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setMounted(true);
      }
    };
    fetchDashboard();
  }, []);

  /* ── Export CSV Handler ────────────────────────────────────────── */
  const handleExportCSV = async (section: 'criticalStock' | 'recentActivity' | 'inventoryDistribution', data: DashboardExportData) => {
    try {
      const exportPayload: DashboardExportPayload = (() => {
        if (section === 'criticalStock') {
          const criticalData = data as CriticalStockItem[];
          return criticalData.map((item) => ({
            product_id: item.code,
            product_name: item.name,
            category: item.category,
            location: item.location,
            current: item.current,
            min: item.safety,
            max: item.max,
            status: item.status,
            trend: item.trend,
          }));
        }

        if (section === 'recentActivity') {
          const recentData = data as RecentActivityItem[];
          return recentData.map((item) => ({
            timestamp: item.timestamp,
            type: item.type,
            itemCode: item.itemCode,
            itemName: item.itemName,
            quantity: item.quantity,
            uom: item.uom,
            reference: item.reference,
            performer: item.performer,
          }));
        }

        const inventoryData = data as InventoryDistributionItem[];
        return inventoryData.map((item) => ({
          label: item.label,
          value: item.value,
          color: item.color,
        }));
      })();

      const response = await fetch('/api/inventory/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ section, data: exportPayload }),
      });

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      // Get the CSV content from response
      const csvContent = await response.text();
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${section}-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  if (!mounted || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 border-3 border-slate-100 rounded-full animate-spin"
            style={{ borderTopColor: BRAND.primary, borderWidth: "3px" }}
          />
          <p style={{ color: BRAND.textSecondary }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Mapping icons to KPI data since API cannot return React components
  const KPI_ICONS = [Warehouse, TrendingUp, AlertTriangle, ClipboardList];
  const KPI_DATA = dashboardData.kpi.map((item: KPIItem, index: number) => ({
    ...item,
    icon: KPI_ICONS[index % KPI_ICONS.length]
  }));

  const INVENTORY_DISTRIBUTION = dashboardData.inventoryDistribution;
  const CRITICAL_STOCK = dashboardData.criticalStock || [];
  const RECENT_ACTIVITY = dashboardData.recentActivity || [];

  // Mock historical data (since DB doesn't have 12 months history yet)
  const STOCK_TREND_DATA = [
    { label: "Jan", value: 4200, secondary: 3800 },
    { label: "Feb", value: 4100, secondary: 3900 },
    { label: "Mar", value: 4350, secondary: 4000 },
    { label: "Apr", value: 4500, secondary: 4100 },
    { label: "May", value: 4400, secondary: 4200 },
    { label: "Jun", value: 4600, secondary: 4300 },
    { label: "Jul", value: 4750, secondary: 4400 },
    { label: "Aug", value: 4900, secondary: 4500 },
    { label: "Sep", value: 4800, secondary: 4600 },
    { label: "Oct", value: 5000, secondary: 4700 },
    { label: "Nov", value: 5100, secondary: 4800 },
    { label: "Dec", value: 5200, secondary: 4900 },
  ];
  const CATEGORY_DISTRIBUTION = [
    {
      category: "RM",
      values: [
        { label: "Raw Material", value: 18500, color: CHART_COLORS.primary },
        { label: "Packaging", value: 8200, color: CHART_COLORS.secondary },
      ],
    },
    {
      category: "WIP",
      values: [
        { label: "Raw Material", value: 3200, color: CHART_COLORS.primary },
        { label: "Packaging", value: 1800, color: CHART_COLORS.secondary },
      ],
    },
    {
      category: "FG",
      values: [
        { label: "Raw Material", value: 12500, color: CHART_COLORS.primary },
        { label: "Packaging", value: 6800, color: CHART_COLORS.secondary },
      ],
    },
    {
      category: "SPG",
      values: [
        { label: "Raw Material", value: 4500, color: CHART_COLORS.primary },
        { label: "Packaging", value: 2200, color: CHART_COLORS.secondary },
      ],
    },
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
                Inventory Module
              </p>
              <h1 className="text-3xl font-semibold tracking-tight" style={{ color: BRAND.textPrimary }}>
                Analytics Dashboard
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4" style={{ color: BRAND.textSecondary }}>
            Operational overview of PT Mayora Indah inventory
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
                  Inventory Value Trend (12 Months)
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  Book value vs market value comparison
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.primary }} />
                  <span className="text-xs" style={{ color: BRAND.textMuted }}>Book Value</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.secondary }} />
                  <span className="text-xs" style={{ color: BRAND.textMuted }}>Market Value</span>
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
                  Inventory Distribution
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  By material type
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
                Material Category Analysis
              </h3>
              <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                Raw Material vs Packaging distribution per inventory type
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.primary }} />
                <span className="text-xs" style={{ color: BRAND.textMuted }}>Raw Material</span>
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
                  Critical Stock Monitoring
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  Items requiring immediate attention
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs font-medium"
                  onClick={() => handleExportCSV('criticalStock', CRITICAL_STOCK)}
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Export
                </Button>
                <Link href="/inventory/monitoring-stok">
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
                    View All
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
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
                  Create Production Request
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
                  Real-time Activity
                </h3>
                <p className="text-xs" style={{ color: BRAND.textSecondary }}>
                  Latest inventory transactions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs font-medium"
                  onClick={() => handleExportCSV('recentActivity', RECENT_ACTIVITY)}
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Export
                </Button>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50/80 border border-emerald-100/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-700">Live</span>
                </div>
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
                View all transactions in Ledger
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
