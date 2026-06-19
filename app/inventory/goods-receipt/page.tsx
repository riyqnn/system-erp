"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  X,
  ArrowUpDown,
  PackageCheck,
  FileText,
  CheckCircle2,
  
  AlertTriangle,
  Truck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface GRData {
  receipt_id: string | number;
  gr_code: string;
  pr_id: string | number | null;
  supplier_id: string | number;
  product_id: string | number;
  warehouse_id: string | number;
  quantity: number;
  batch_number: string;
  expiry_date: string | null;
  receipt_date: string;
  received_by: string;
  status: "Accepted" | "Rejected" | "Partial";
  reject_qty: number;
  reject_reason: string | null;
  ms_suppliers: { supplier_name: string } | null;
  ms_products: { product_code: string; product_name: string; units: string } | null;
  ms_warehouses: { warehouse_name: string } | null;
}

interface ProductOption {
  product_id: string | number;
  product_code: string;
  product_name: string;
  category: string;
  units: string;
}

interface SupplierOption {
  supplier_id: string | number;
  supplier_code: string;
  supplier_name: string;
}

interface WarehouseOption {
  warehouse_id: string | number;
  warehouse_code: string;
  warehouse_name: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const STATUS_FILTERS = ["All", "Accepted", "Partial", "Rejected"];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  Accepted: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  Partial:  { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     icon: AlertTriangle },
  Rejected: { color: "text-red-700",     bg: "bg-red-50 border-red-200",         icon: X },
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function GoodsReceiptPage() {
  const [data, setData] = useState<GRData[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState({
    supplier_id: "",
    product_id: "",
    warehouse_id: "",
    quantity: "",
    batch_number: "",
    expiry_date: "",
    status: "Accepted",
    reject_qty: "0",
    reject_reason: "",
  });

  /* ── Fetch data ───────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/goods-receipts");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch GRs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMaster = useCallback(async () => {
    try {
      const [pRes, sRes, wRes] = await Promise.all([
        fetch("/api/inventory/stock"),
        fetch("/api/inventory/suppliers"),
        fetch("/api/inventory/warehouses"),
      ]);
      if (pRes.ok) { const j = await pRes.json(); setProducts(j.data || []); }
      if (sRes.ok) { const j = await sRes.json(); setSuppliers(j.data || []); }
      if (wRes.ok) { const j = await wRes.json(); setWarehouses(j.data || []); }
    } catch (err) {
      console.error("Failed to fetch master data:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchMaster();
  }, [fetchData, fetchMaster]);

  /* ── Create GR ────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const existing = data.filter((d) => d.gr_code.includes(`GR-${ym}`)).length;
      const grCode = `GR-${ym}-${String(existing + 1).padStart(3, "0")}`;

      const payload = {
        gr_code: grCode,
        supplier_id: form.supplier_id,
        product_id: form.product_id,
        warehouse_id: form.warehouse_id,
        quantity: Number(form.quantity),
        batch_number: form.batch_number,
        expiry_date: form.expiry_date || null,
        receipt_date: now.toISOString(),
        received_by: "user_inv01",
        status: form.status,
        reject_qty: Number(form.reject_qty) || 0,
        reject_reason: form.reject_reason || null,
      };

      const res = await fetch("/api/inventory/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitSuccess(grCode);
        setForm({ supplier_id: "", product_id: "", warehouse_id: "", quantity: "", batch_number: "", expiry_date: "", status: "Accepted", reject_qty: "0", reject_reason: "" });
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
    .filter((gr) => {
      const matchSearch =
        gr.gr_code.toLowerCase().includes(search.toLowerCase()) ||
        gr.ms_products?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        gr.ms_suppliers?.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
        gr.batch_number?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || gr.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === "receipt_date") {
        return sortAsc
          ? new Date(a.receipt_date).getTime() - new Date(b.receipt_date).getTime()
          : new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime();
      }
      if (sortBy === "quantity") {
        return sortAsc ? a.quantity - b.quantity : b.quantity - a.quantity;
      }
      return 0;
    });

  const acceptedCount = data.filter((d) => d.status === "Accepted").length;
  const partialCount = data.filter((d) => d.status === "Partial").length;
  const totalReceived = data.reduce((a, d) => a + d.quantity, 0);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      {/* Header */}
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Goods Receipt</h1>
          <p className="text-sm text-slate-500 mt-1">Record incoming materials from suppliers into warehouse</p>
        </div>
        <Button
          onClick={() => { setShowCreateModal(true); setSubmitSuccess(null); }}
          className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-10 px-5 gap-2"
        >
          <Plus className="w-4 h-4" /> New Receipt
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Accepted", value: acceptedCount, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
          { label: "Partial Receipts", value: partialCount, color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle },
          { label: "Total Qty Received", value: totalReceived.toLocaleString(), color: "text-slate-700", bg: "bg-slate-50", icon: Truck },
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
          <Input placeholder="Search GR, product, supplier, batch..." className="pl-9 h-10 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((st) => (
            <button key={st} onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${statusFilter === st ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            >{st}</button>
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
                  <th className="px-6 py-4 font-medium">GR Code</th>
                  <th className="px-6 py-4 font-medium">Supplier</th>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium text-right">
                    <button onClick={() => toggleSort("quantity")} className="flex items-center gap-1.5 ml-auto hover:text-slate-900">
                      Qty <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-medium">Batch</th>
                  <th className="px-6 py-4 font-medium">
                    <button onClick={() => toggleSort("receipt_date")} className="flex items-center gap-1.5 hover:text-slate-900">
                      Date <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" /><p>Loading goods receipts...</p>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm font-medium">No goods receipts found</p>
                  </td></tr>
                ) : (
                  filtered.map((gr) => {
                    const cfg = STATUS_CONFIG[gr.status] || STATUS_CONFIG.Accepted;
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={gr.receipt_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">{gr.gr_code}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 text-xs">{gr.ms_suppliers?.supplier_name || "—"}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{gr.ms_products?.product_name || "—"}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{gr.ms_products?.product_code}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-slate-900 tabular-nums">{gr.quantity.toLocaleString()}</span>
                          <span className="text-slate-400 text-xs ml-1">{gr.ms_products?.units}</span>
                          {gr.reject_qty > 0 && (
                            <p className="text-[10px] text-red-500 mt-0.5">Reject: {gr.reject_qty.toLocaleString()}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-slate-600">{gr.batch_number}</span>
                          {gr.expiry_date && (
                            <p className="text-[10px] text-slate-400 mt-0.5">Exp: {new Date(gr.expiry_date).toLocaleDateString("id-ID")}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs">
                          {new Date(gr.receipt_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase border ${cfg.bg} ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />{gr.status}
                          </span>
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

      {/* ── Create GR Modal ── */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                    <PackageCheck className="w-4 h-4 text-red-600" />
                  </div>
                  <h2 className="font-semibold text-slate-900">Record Goods Receipt</h2>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="p-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{submitSuccess} Recorded!</h3>
                  <p className="text-slate-500 mt-2 text-sm">Stock balance has been updated.</p>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>Close</Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setSubmitSuccess(null)}>Record Another</Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                  <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex gap-3 text-sm text-blue-800">
                      <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
                      <p>Enter the details from the supplier&apos;s delivery note and inspection results.</p>
                    </div>

                    {/* Supplier */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier</label>
                      <select required className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
                        value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                        <option value="">— Select supplier —</option>
                        {suppliers.map((s) => (
                          <option key={s.supplier_id} value={s.supplier_id}>[{s.supplier_code}] {s.supplier_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Product + Warehouse */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Product</label>
                        <select required className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
                          value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                          <option value="">— Select —</option>
                          {products.filter((p) => p.category === "RM" || p.category === "PM").map((p) => (
                            <option key={p.product_id} value={p.product_id}>[{p.product_code}] {p.product_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Warehouse</label>
                        <select required className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
                          value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
                          <option value="">— Select —</option>
                          {warehouses.map((w) => (
                            <option key={w.warehouse_id} value={w.warehouse_id}>[{w.warehouse_code}] {w.warehouse_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Qty + Batch + Expiry */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
                        <Input required type="number" min="1" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Batch No.</label>
                        <Input required placeholder="BT-XXX" value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date</label>
                        <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                      </div>
                    </div>

                    {/* Status + Reject */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Receipt Status</label>
                      <div className="flex gap-3">
                        {["Accepted", "Partial", "Rejected"].map((s) => (
                          <button key={s} type="button" onClick={() => setForm({ ...form, status: s })}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${form.status === s
                              ? s === "Accepted" ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                              : s === "Partial" ? "bg-amber-50 border-amber-300 text-amber-700"
                              : "bg-red-50 border-red-300 text-red-700"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>

                    {(form.status === "Partial" || form.status === "Rejected") && (
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Reject Qty</label>
                          <Input required type="number" min="0" value={form.reject_qty} onChange={(e) => setForm({ ...form, reject_qty: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Reject Reason</label>
                          <Input required placeholder="e.g. Damaged packaging" value={form.reject_reason} onChange={(e) => setForm({ ...form, reject_reason: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white gap-2" disabled={isSubmitting}>
                      <PackageCheck className="w-4 h-4" />
                      {isSubmitting ? "Processing..." : "Confirm Receipt"}
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
