"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  X,
  ArrowUpDown,
  Send,
  FileText,
  Clock,
  AlertCircle,
  Factory,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ProdReqData {
  production_request_id: string | number;
  prd_code: string;
  product_id: string | number;
  qty_requested: number;
  request_date: string;
  requested_by: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  notes: string | null;
  ms_products: {
    product_code: string;
    product_name: string;
    units: string;
  } | null;
}

interface ProductOption {
  product_id: string | number;
  product_code: string;
  product_name: string;
  category: string;
  units: string;
  minimum_stock: number;
  current_stock: number;
  stock_health: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const STATUS_FILTERS = ["All", "Pending", "In Progress", "Completed"];

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  Pending:       { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  "In Progress": { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  Completed:     { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  Cancelled:     { color: "text-slate-500",   bg: "bg-slate-50 border-slate-200" },
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function ProductionRequestPage() {
  const [data, setData] = useState<ProdReqData[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    product_id: "",
    qty_requested: "",
    notes: "",
  });

  /* ── Fetch PRD List ────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/production-requests");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch PRDs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch FG Products for dropdown ────────────────────────────── */
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/stock");
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchProducts();
  }, [fetchData, fetchProducts]);

  /* ── Create Production Request ──────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.qty_requested) return;
    setIsSubmitting(true);

    try {
      // Generate PRD code: PRD-YYYYMM-XXX
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const existing = data.filter((d) => d.prd_code.includes(`PRD-${ym}`)).length;
      const prdCode = `PRD-${ym}-${String(existing + 1).padStart(3, "0")}`;

      const res = await fetch("/api/inventory/production-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prd_code: prdCode,
          product_id: form.product_id,
          qty_requested: Number(form.qty_requested),
          request_date: now.toISOString(),
          requested_by: "user_inv01",
          status: "Pending",
          notes: form.notes || null,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(prdCode);
        setForm({ product_id: "", qty_requested: "", notes: "" });
        fetchData();
      } else {
        const json = await res.json();
        if (json.shortage) {
          Swal.fire({
            title: "Insufficient Materials!",
            text: "You cannot start production because some raw materials are out of stock. You will be redirected to create a Purchase Requisition.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Go to PR",
            confirmButtonColor: "#dc2626"
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = '/inventory/purchase-requisition';
            }
          });
        } else {
          Swal.fire("Error", `Failed: ${json.error}`, "error");
        }
      }
    } catch {
      Swal.fire("Error", "Network error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Sorting & Filtering ──────────────────────────────────────── */
  const toggleSort = (col: string) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };

  const filtered = data
    .filter((req) => {
      const matchSearch =
        req.prd_code.toLowerCase().includes(search.toLowerCase()) ||
        req.ms_products?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        req.ms_products?.product_code?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || req.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === "request_date") {
        return sortAsc
          ? new Date(a.request_date).getTime() - new Date(b.request_date).getTime()
          : new Date(b.request_date).getTime() - new Date(a.request_date).getTime();
      }
      if (sortBy === "qty_requested") {
        return sortAsc ? a.qty_requested - b.qty_requested : b.qty_requested - a.qty_requested;
      }
      return 0;
    });

  // KPI cards
  const pendingCount = data.filter((d) => d.status === "Pending").length;
  const inProgressCount = data.filter((d) => d.status === "In Progress").length;
  const totalQty = data.reduce((a, d) => a + d.qty_requested, 0);

  const selectedProduct = products.find((p) => String(p.product_id) === String(form.product_id));

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
                Production Request
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Initiate request to replenish Finished Goods (UC-INV-002)
          </p>
        </div>
        <Button
          onClick={() => { setShowCreateModal(true); setSubmitSuccess(null); }}
          className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-10 px-5 gap-2 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: "Pending Verification", value: pendingCount, color: "text-amber-600", bg: "bg-amber-50", icon: Clock, trend: "+2", trendBg: "bg-amber-50", trendCol: "text-amber-700" },
          { label: "In Production", value: inProgressCount, color: "text-blue-600", bg: "bg-blue-50", icon: Factory, trend: "Active", trendBg: "bg-blue-50", trendCol: "text-blue-700" },
          { label: "Total Qty Requested", value: totalQty.toLocaleString(), color: "text-slate-700", bg: "bg-slate-50", icon: FileText, trend: "Total", trendBg: "bg-slate-100", trendCol: "text-slate-600" },
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
                  {kpi.value}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${kpi.trendBg} ${kpi.trendCol}`}>
                {kpi.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search Request Code or Product..."
            className="pl-9 h-10 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === st
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <Button variant="outline" size="icon" onClick={fetchData} className="ml-auto h-10 w-10 text-slate-500" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Request Code</th>
                  <th className="px-6 py-4 font-medium">FG Product</th>
                  <th className="px-6 py-4 font-medium text-right">
                    <button onClick={() => toggleSort("qty_requested")} className="flex items-center gap-1.5 ml-auto hover:text-slate-900">
                      Qty <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-medium">
                    <button onClick={() => toggleSort("request_date")} className="flex items-center gap-1.5 hover:text-slate-900">
                      Date <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" />
                      <p>Loading production requests...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <Factory className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No production requests found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => {
                    const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.Pending;
                    return (
                      <tr key={req.production_request_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {req.prd_code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{req.ms_products?.product_name || "—"}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{req.ms_products?.product_code}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {req.qty_requested.toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-xs ml-1">{req.ms_products?.units}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs">
                          {new Date(req.request_date).toLocaleDateString("id-ID", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase border ${cfg.bg} ${cfg.color}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs max-w-[200px] truncate">
                          {req.notes || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create Production Request Modal ── */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                    <Factory className="w-4 h-4 text-red-600" />
                  </div>
                  <h2 className="font-semibold text-slate-900">Request Production</h2>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                /* ── Success State ── */
                <div className="p-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-5">
                    <Send className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{submitSuccess} Submitted!</h3>
                  <p className="text-slate-500 mt-2 text-sm">Notification sent to Production Module. Pending BOM Verification.</p>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>Close</Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setSubmitSuccess(null)}>
                      Create Another
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Form ── */
                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                  <div className="p-6 space-y-5 overflow-y-auto">
                    {/* Info Banner */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex gap-3 text-sm text-blue-800">
                      <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
                      <p>Select a Finished Good (FG) to replenish its stock.</p>
                    </div>

                    {/* Product Select */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Finished Good (FG)</label>
                      <select
                        required
                        className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
                        value={form.product_id}
                        onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                      >
                        <option value="">— Select FG Product —</option>
                        {products
                          .filter((p) => p.category === "FG")
                          .map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              [{p.product_code}] {p.product_name} — Stock: {p.current_stock.toLocaleString()} {p.units}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Selected Product Info */}
                    {selectedProduct && (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Current FG Stock</span>
                          <span className={`font-bold ${selectedProduct.current_stock < selectedProduct.minimum_stock ? "text-red-600" : "text-emerald-600"}`}>
                            {selectedProduct.current_stock.toLocaleString()} {selectedProduct.units}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className={`h-full rounded-full ${selectedProduct.current_stock < selectedProduct.minimum_stock ? "bg-red-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(100, (selectedProduct.current_stock / (selectedProduct.minimum_stock || 1)) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>0</span>
                          <span>Safety target: {selectedProduct.minimum_stock.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity to Produce</label>
                      <Input
                        required
                        type="number"
                        min="1"
                        placeholder="e.g. 1000"
                        value={form.qty_requested}
                        onChange={(e) => setForm({ ...form, qty_requested: e.target.value })}
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                      <textarea
                        className="w-full min-h-[80px] px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 resize-none"
                        placeholder="Urgency or special remarks..."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white gap-2" disabled={isSubmitting}>
                      <Send className="w-4 h-4" />
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
