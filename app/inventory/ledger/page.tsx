"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface StockMovement {
  movement_id: number;
  product_id: number;
  warehouse_id: number;
  type: "IN" | "OUT";
  quantity: number;
  balance_after: number | null;
  reference_id: string;
  reference_type: string;
  movement_date: string;
  ms_products: {
    product_code: string;
    product_name: string;
    units: string;
    category: string;
  } | null;
  ms_warehouses: {
    warehouse_name: string;
  } | null;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function InventoryLedgerPage() {
  const [data, setData] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  /* ── Fetch Data ────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/ledger");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch ledger data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Filter ────────────────────────────────────────────────────── */
  const filtered = data.filter((d) => {
    const matchSearch =
      d.reference_id?.toLowerCase().includes(search.toLowerCase()) ||
      d.ms_products?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.ms_products?.product_code?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalIn = data.filter(d => d.type === "IN").length;
  const totalOut = data.filter(d => d.type === "OUT").length;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  /* ── Export CSV ────────────────────────────────────────────────── */
  const handleExportCSV = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/ledger', {
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
      link.setAttribute('download', `ledger-${new Date().toISOString().slice(0, 10)}.csv`);
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
                Inventory Ledger
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Audit trail of all historical stock movements (IN/OUT)
          </p>
        </div>
        <Button variant="outline" className="h-10 px-5 gap-2 bg-white rounded-xl hover:shadow-sm transition-shadow" onClick={handleExportCSV}>
          <Download className="w-4 h-4" /> Download CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: "Total Transactions", value: data.length, color: "text-slate-700", bg: "bg-slate-50", icon: BookOpen, trend: "All", trendBg: "bg-slate-100", trendCol: "text-slate-600" },
          { label: "Total IN Movements", value: totalIn, color: "text-emerald-600", bg: "bg-emerald-50", icon: ArrowDownLeft, trend: "IN", trendBg: "bg-emerald-50", trendCol: "text-emerald-700" },
          { label: "Total OUT Movements", value: totalOut, color: "text-red-600", bg: "bg-red-50", icon: ArrowUpRight, trend: "OUT", trendBg: "bg-red-50", trendCol: "text-red-700" },
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
          <Input placeholder="Search Ref ID or Product..." className="pl-9 h-10 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {["All", "IN", "OUT"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${typeFilter === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t === "IN" && "↓ IN"}
              {t === "OUT" && "↑ OUT"}
              {t === "All" && "All Types"}
            </button>
          ))}
        </div>

        <Button variant="outline" size="icon" onClick={fetchData} className="ml-auto h-10 w-10 text-slate-500" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Date & Time</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" /><p>Loading ledger...</p>
                  </td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm font-medium">No transactions found</p>
                  </td></tr>
                ) : (
                  paginatedData.map((d) => (
                    <tr key={d.movement_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {new Date(d.movement_date).toLocaleString("id-ID", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {d.type === "IN" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            <ArrowDownLeft className="w-3 h-3" /> IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            <ArrowUpRight className="w-3 h-3" /> OUT
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{d.ms_products?.product_name}</p>
                        <p className="text-xs text-slate-400">{d.ms_products?.product_code}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {d.ms_warehouses?.warehouse_name || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-700 font-medium">{d.reference_id || "—"}</span>
                        <span className="ml-2 text-[10px] text-slate-400 uppercase">{d.reference_type}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold tabular-nums text-sm ${d.type === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                          {d.type === "IN" ? "+" : "-"}{d.quantity.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-[10px] ml-1">{d.ms_products?.units}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
