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
  PackagePlus,
  AlertCircle,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FGMovement {
  movement_id: string | number;
  product_id: string | number;
  warehouse_id: string | number;
  type: string;
  quantity: number;
  reference_id: string;
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

interface ProductOption {
  product_id: string | number;
  product_code: string;
  product_name: string;
  category: string;
  units: string;
}

interface WarehouseOption {
  warehouse_id: string | number;
  warehouse_code: string;
  warehouse_name: string;
}

interface ProdReqOption {
  production_request_id: string | number;
  prd_code: string;
  product_id: string | number;
  qty_requested: number;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function FinishedGoodsReceiptPage() {
  const [data, setData] = useState<FGMovement[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [activePRDs, setActivePRDs] = useState<ProdReqOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Form
  const [form, setForm] = useState({
    product_id: "",
    warehouse_id: "",
    quantity: "",
    ref_id: "", // PRD Code
    bin_location: "",
  });

  /* ── Fetch Data ────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/fg-receipts");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch FG Receipts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMaster = useCallback(async () => {
    try {
      const [pRes, wRes, prdRes] = await Promise.all([
        fetch("/api/inventory/stock"),
        fetch("/api/inventory/warehouses"),
        fetch("/api/inventory/production-requests"),
      ]);
      if (pRes.ok) { const j = await pRes.json(); setProducts(j.data || []); }
      if (wRes.ok) { const j = await wRes.json(); setWarehouses(j.data || []); }
      if (prdRes.ok) {
        const j = await prdRes.json();
        // Only get active PRDs for the dropdown
        const active = (j.data || []).filter((r: { status: string }) => r.status === "In Progress");
        setActivePRDs(active);
      }
    } catch (err) {
      console.error("Failed to fetch master data:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchMaster();
  }, [fetchData, fetchMaster]);

  /* ── Handle PRD Selection to autofill form ─────────────────────── */
  const handleSelectPRD = (prdCode: string) => {
    const selected = activePRDs.find((p) => p.prd_code === prdCode);
    if (selected) {
      setForm({
        ...form,
        ref_id: prdCode,
        product_id: selected.product_id.toString(),
        quantity: selected.qty_requested.toString(),
      });
    } else {
      setForm({ ...form, ref_id: prdCode });
    }
  };

  /* ── Submit Receipt ───────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        product_id: form.product_id,
        warehouse_id: form.warehouse_id,
        quantity: Number(form.quantity),
        ref_id: form.ref_id, // Will act as reference_id in movements
      };

      const res = await fetch("/api/inventory/fg-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setForm({ product_id: "", warehouse_id: "", quantity: "", ref_id: "", bin_location: "" });
        fetchData();
        fetchMaster(); // Refresh PRD list
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

  /* ── Sort & Filter ─────────────────────────────────────────────── */
  const toggleSort = (col: string) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };

  const filtered = data
    .filter((m) => {
      return (m.reference_id || "").toLowerCase().includes(search.toLowerCase()) ||
             m.ms_products?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
             m.ms_products?.product_code?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === "movement_date") {
        return sortAsc
          ? new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime()
          : new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime();
      }
      if (sortBy === "quantity") {
        return sortAsc ? a.quantity - b.quantity : b.quantity - a.quantity;
      }
      return 0;
    });

  const totalReceipts = data.length;
  const totalQty = data.reduce((a, d) => a + d.quantity, 0);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Finished Goods Receipt</h1>
          <p className="text-sm text-slate-500 mt-1">Receive finished goods from production into warehouse (UC-INV-008)</p>
        </div>
        <Button
          onClick={() => { setShowCreateModal(true); setSubmitSuccess(false); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-10 px-5 gap-2"
        >
          <Plus className="w-4 h-4" /> Receive FG
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Total Receiving Records", value: totalReceipts, color: "text-emerald-600", bg: "bg-emerald-50", icon: PackagePlus },
          { label: "Total FG Qty Received", value: totalQty.toLocaleString(), color: "text-slate-700", bg: "bg-slate-50", icon: Truck },
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

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search Request Code or Product..." className="pl-9 h-10 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
                  <th className="px-6 py-4 font-medium">Production Ref</th>
                  <th className="px-6 py-4 font-medium">FG Product</th>
                  <th className="px-6 py-4 font-medium">Destination Warehouse</th>
                  <th className="px-6 py-4 font-medium text-right">
                    <button onClick={() => toggleSort("quantity")} className="flex items-center gap-1.5 ml-auto hover:text-slate-900">
                      Qty Received <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-medium">
                    <button onClick={() => toggleSort("movement_date")} className="flex items-center gap-1.5 hover:text-slate-900">
                      Date & Time <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" /><p>Loading receipts...</p>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm font-medium">No finished goods received yet</p>
                  </td></tr>
                ) : (
                  filtered.map((m) => (
                    <tr key={m.movement_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-700 text-xs font-mono">{m.reference_id || "—"}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{m.ms_products?.product_name || "—"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{m.ms_products?.product_code}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">{m.ms_warehouses?.warehouse_name || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-emerald-700 tabular-nums">+{m.quantity.toLocaleString()}</span>
                        <span className="text-slate-400 text-xs ml-1">{m.ms_products?.units}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {new Date(m.movement_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <PackagePlus className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="font-semibold text-slate-900">Receive Finished Goods</h2>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="p-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">Goods Received!</h3>
                  <p className="text-slate-500 mt-2 text-sm">FG stock has been updated and the production request is now marked as Completed.</p>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>Close</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setSubmitSuccess(false)}>Receive Another</Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                  <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 flex gap-3 text-sm text-emerald-800">
                      <AlertCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                      <p>Select an active Production Request to automatically fill in the product and quantity details.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Production Request (PRD-Code)</label>
                      <select required className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                        value={form.ref_id} onChange={(e) => handleSelectPRD(e.target.value)}>
                        <option value="">— Select active production order —</option>
                        {activePRDs.map((p) => (
                          <option key={p.production_request_id} value={p.prd_code}>{p.prd_code} - Qty: {p.qty_requested}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">FG Product</label>
                        <select required className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                          value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                          <option value="">— Select —</option>
                          {products.filter((p) => p.category === "FG").map((p) => (
                            <option key={p.product_id} value={p.product_id}>[{p.product_code}] {p.product_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination Warehouse</label>
                        <select required className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                          value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
                          <option value="">— Select —</option>
                          {warehouses.map((w) => (
                            <option key={w.warehouse_id} value={w.warehouse_id}>[{w.warehouse_code}] {w.warehouse_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Actual Received Qty</label>
                        <Input required type="number" min="1" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Bin Location (Optional)</label>
                        <Input placeholder="e.g. A-01-R3" value={form.bin_location} onChange={(e) => setForm({ ...form, bin_location: e.target.value })} />
                      </div>
                    </div>

                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" disabled={isSubmitting}>
                      <Send className="w-4 h-4" />
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
