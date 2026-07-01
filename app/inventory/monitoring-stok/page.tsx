"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  X,
  ArrowUpDown,
  Building2,
  Package,
  AlertTriangle,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface StockMonitoringData {
  product_id: string | number;
  product_code: string;
  product_name: string;
  category: string;
  units: string;
  minimum_stock: number;
  warehouse_id: string | number;
  warehouse_code: string;
  warehouse_name: string;
  available_qty: number;
  reserved_qty: number;
  quarantine_qty: number;
  nearest_expiry: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  FG: "bg-blue-100 text-blue-700",
  RM: "bg-emerald-100 text-emerald-700",
  PM: "bg-amber-100 text-amber-700",
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function StockMonitoringPage() {
  const [data, setData] = useState<StockMonitoringData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [warehouseFilter, setWarehouseFilter] = useState("All");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  /* ── Fetch Data ────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/stock-monitoring");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch stock monitoring data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Sort & Filter ─────────────────────────────────────────────── */
  const toggleSort = (col: string) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };

  const uniqueWarehouses = Array.from(new Set(data.map(d => d.warehouse_name)));

  const filtered = data
    .filter((d) => {
      const matchSearch =
        d.product_name.toLowerCase().includes(search.toLowerCase()) ||
        d.product_code.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "All" || d.category === categoryFilter;
      const matchWH = warehouseFilter === "All" || d.warehouse_name === warehouseFilter;
      // Only show rows that actually have stock to avoid clutter
      const hasStock = d.available_qty > 0 || d.reserved_qty > 0 || d.quarantine_qty > 0;
      return matchSearch && matchCat && matchWH && hasStock;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === "product_name") {
        return sortAsc ? a.product_name.localeCompare(b.product_name) : b.product_name.localeCompare(a.product_name);
      }
      if (sortBy === "available_qty") {
        return sortAsc ? a.available_qty - b.available_qty : b.available_qty - a.available_qty;
      }
      if (sortBy === "total_qty") {
        const totalA = a.available_qty + a.reserved_qty + a.quarantine_qty;
        const totalB = b.available_qty + b.reserved_qty + b.quarantine_qty;
        return sortAsc ? totalA - totalB : totalB - totalA;
      }
      return 0;
    });

  const totalAvailable = data.reduce((a, d) => a + d.available_qty, 0);
  const totalReserved = data.reduce((a, d) => a + d.reserved_qty, 0);
  const totalQuarantine = data.reduce((a, d) => a + d.quarantine_qty, 0);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, warehouseFilter, sortBy, sortAsc]);

  /* ── Export CSV ────────────────────────────────────────────────── */
  const handleExportCSV = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/stock-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
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
      link.setAttribute('download', `stock-monitoring-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  }, [data]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pt-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ width: '4px', backgroundColor: '#dc2626' }} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: '#dc2626' }}>
                Inventory Module
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                Stock Monitoring
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Detailed inventory balance across all warehouses
          </p>
        </div>
        <Button variant="outline" className="h-10 px-5 gap-2 bg-white rounded-xl hover:shadow-sm transition-shadow" onClick={handleExportCSV}>
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: "Total Available", value: totalAvailable, color: "text-emerald-600", bg: "bg-emerald-50", icon: Package, trend: "+12%", trendBg: "bg-emerald-50", trendCol: "text-emerald-700" },
          { label: "Total Reserved", value: totalReserved, color: "text-blue-600", bg: "bg-blue-50", icon: Package, trend: "-5%", trendBg: "bg-red-50", trendCol: "text-red-700" },
          { label: "Total Quarantine", value: totalQuarantine, color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle, trend: "0%", trendBg: "bg-slate-100", trendCol: "text-slate-600" },
        ].map((kpi, i) => (
          <Card key={i} className="relative">
            <CardContent className="p-6 flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                    <kpi.icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                </div>
                <p className="text-3xl font-bold tracking-tight text-slate-800 mt-2">
                  {kpi.value.toLocaleString()}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${kpi.trendBg} ${kpi.trendCol}`}>
                {kpi.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search Product Code or Name..." className="pl-9 h-10 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <select 
          className="h-10 px-3 border border-slate-200 rounded-md text-sm bg-white outline-none"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          <option value="FG">FG (Finished Goods)</option>
          <option value="RM">RM (Raw Materials)</option>
          <option value="PM">PM (Packaging Materials)</option>
        </select>

        <select 
          className="h-10 px-3 border border-slate-200 rounded-md text-sm bg-white outline-none"
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
        >
          <option value="All">All Warehouses</option>
          {uniqueWarehouses.map(w => <option key={w} value={w}>{w}</option>)}
        </select>

        <Button variant="outline" size="icon" onClick={fetchData} className="ml-auto h-10 w-10 text-slate-500" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <CardContent className="p-0 flex-1 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-medium">
                  <button onClick={() => toggleSort("product_name")} className="flex items-center gap-1.5 hover:text-slate-900">
                    Product <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">Warehouse</th>
                <th className="px-6 py-4 font-medium text-right">
                  <button onClick={() => toggleSort("available_qty")} className="flex items-center gap-1.5 ml-auto hover:text-slate-900">
                    Available <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-6 py-4 font-medium text-right">Reserved</th>
                <th className="px-6 py-4 font-medium text-right">Quarantine</th>
                <th className="px-6 py-4 font-medium text-right">
                  <button onClick={() => toggleSort("total_qty")} className="flex items-center gap-1.5 ml-auto hover:text-slate-900">
                    Total <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" /><p>Loading stock data...</p>
                </td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                  <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm font-medium">No stock data found</p>
                </td></tr>
              ) : (
                paginatedData.map((d) => {
                  const total = d.available_qty + d.reserved_qty + d.quarantine_qty;
                  return (
                    <tr key={`${d.product_id}-${d.warehouse_id}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${CATEGORY_COLORS[d.category]}`}>
                            {d.category}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{d.product_name}</p>
                            <p className="text-xs text-slate-400">{d.product_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 text-xs">
                        {d.warehouse_name}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold tabular-nums ${d.available_qty <= d.minimum_stock ? 'text-red-600' : 'text-emerald-700'}`}>
                          {d.available_qty.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-[10px] ml-1">{d.units}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-slate-700 tabular-nums">{d.reserved_qty > 0 ? d.reserved_qty.toLocaleString() : '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-amber-700 tabular-nums">{d.quarantine_qty > 0 ? d.quarantine_qty.toLocaleString() : '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-slate-900 tabular-nums">{total.toLocaleString()}</span>
                        <span className="text-slate-400 text-[10px] ml-1">{d.units}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
        {/* Pagination Controls */}
        {!loading && filtered.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{" "}
              <span className="font-medium">{filtered.length}</span> results
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600 font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
