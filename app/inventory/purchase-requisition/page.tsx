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
  CheckCircle2,
  Clock,
  Archive,
  Package,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PRData {
  purchase_request_id: number;
  pr_code: string;
  product_id: number;
  qty_requested: number;
  request_date: string;
  requested_by: string;
  status: "Pending" | "Processed" | "Closed";
  notes: string | null;
  ms_products: {
    product_code: string;
    product_name: string;
    units: string;
  } | null;
}

interface ProductOption {
  product_id: number;
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
const STATUS_FILTERS = ["All", "Pending", "Processed", "Closed"];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  Pending:   { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",   icon: Clock },
  Processed: { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     icon: CheckCircle2 },
  Closed:    { color: "text-slate-500",   bg: "bg-slate-50 border-slate-200",   icon: Archive },
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function PurchaseRequisitionPage() {
  const [data, setData] = useState<PRData[]>([]);
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

  /* ── Fetch PR List ────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/purchase-requisitions");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch PRs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch Products for dropdown ──────────────────────────────── */
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

  /* ── Create PR ────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.qty_requested) return;
    setIsSubmitting(true);

    try {
      // Generate PR code: PR-YYYYMM-XXX
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const existing = data.filter((d) => d.pr_code.includes(`PR-${ym}`)).length;
      const prCode = `PR-${ym}-${String(existing + 1).padStart(3, "0")}`;

      const res = await fetch("/api/inventory/purchase-requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pr_code: prCode,
          product_id: Number(form.product_id),
          qty_requested: Number(form.qty_requested),
          request_date: now.toISOString(),
          requested_by: "user_inv01",
          status: "Pending",
          notes: form.notes || null,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(prCode);
        setForm({ product_id: "", qty_requested: "", notes: "" });
        fetchData();
      } else {
        const json = await res.json();
        Swal.fire("Error", `Failed: ${json.error}`, "error");
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
    .filter((pr) => {
      const matchSearch =
        pr.pr_code.toLowerCase().includes(search.toLowerCase()) ||
        pr.ms_products?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        pr.ms_products?.product_code?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || pr.status === statusFilter;
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
  const processedCount = data.filter((d) => d.status === "Processed").length;
  const totalQty = data.reduce((a, d) => a + d.qty_requested, 0);

  const selectedProduct = products.find((p) => p.product_id === Number(form.product_id));

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      {/* Header */}
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Purchase Requisition</h1>
          <p className="text-sm text-slate-500 mt-1">Request materials when stock is below safety level</p>
        </div>
        <Button
          onClick={() => { setShowCreateModal(true); setSubmitSuccess(null); }}
          className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-10 px-5 gap-2"
        >
          <Plus className="w-4 h-4" /> Create PR
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Pending PRs", value: pendingCount, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
          { label: "Processed", value: processedCount, color: "text-blue-600", bg: "bg-blue-50", icon: CheckCircle2 },
          { label: "Total Qty Requested", value: totalQty.toLocaleString(), color: "text-slate-700", bg: "bg-slate-50", icon: Package },
        ].map((kpi, i) => (
          <Card key={i} className="border-slate-200 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color} tabular-nums`}>{kpi.value}</p>
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
            placeholder="Search PR code or product..."
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
                  <th className="px-6 py-4 font-medium">PR Code</th>
                  <th className="px-6 py-4 font-medium">Product</th>
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
                      <p>Loading purchase requisitions...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No purchase requisitions found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((pr) => {
                    const cfg = STATUS_CONFIG[pr.status] || STATUS_CONFIG.Pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={pr.purchase_request_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {pr.pr_code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{pr.ms_products?.product_name || "—"}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{pr.ms_products?.product_code}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {pr.qty_requested.toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-xs ml-1">{pr.ms_products?.units}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs">
                          {new Date(pr.request_date).toLocaleDateString("id-ID", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase border ${cfg.bg} ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {pr.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs max-w-[200px] truncate">
                          {pr.notes || "—"}
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

      {/* ── Create PR Modal ── */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                    <Send className="w-4 h-4 text-red-600" />
                  </div>
                  <h2 className="font-semibold text-slate-900">Create Purchase Requisition</h2>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                /* ── Success State ── */
                <div className="p-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{submitSuccess} Created!</h3>
                  <p className="text-slate-500 mt-2 text-sm">PR has been submitted to Purchasing Department.</p>
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
                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 flex gap-3 text-sm text-amber-800">
                      <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                      <p>Select a product below safety stock to create a purchase requisition.</p>
                    </div>

                    {/* Product Select */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Product / Material</label>
                      <select
                        required
                        className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
                        value={form.product_id}
                        onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                      >
                        <option value="">— Select product —</option>
                        {products
                          .filter((p) => p.category === "RM" || p.category === "PM")
                          .map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              [{p.product_code}] {p.product_name} — Stock: {p.current_stock.toLocaleString()} {p.units}
                              {p.stock_health !== "Adequate" ? ` ⚠ ${p.stock_health}` : ""}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Selected Product Info */}
                    {selectedProduct && (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Current Stock</span>
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
                          <span>Safety: {selectedProduct.minimum_stock.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity Requested</label>
                      <Input
                        required
                        type="number"
                        min="1"
                        placeholder="e.g. 5000"
                        value={form.qty_requested}
                        onChange={(e) => setForm({ ...form, qty_requested: e.target.value })}
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                      <textarea
                        className="w-full min-h-[80px] px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 resize-none"
                        placeholder="Reason for request..."
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
                      {isSubmitting ? "Submitting..." : "Submit PR"}
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
