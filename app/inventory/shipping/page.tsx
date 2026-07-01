"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  X,
  ArrowUpDown,
  Truck,
  CheckCircle2,
  XCircle,
  FileText,
  MapPin,
  PackageOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Swal from "sweetalert2";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface DeliveryOrder {
  do_id: number;
  do_code: string;
  customer_id: string;
  customer_name: string;
  product_id: number;
  quantity: number;
  order_date: string;
  shipping_date: string | null;
  delivery_address: string;
  status: "Pending" | "Shipped" | "Delivered" | "Void";
  ms_products: {
    product_code: string;
    product_name: string;
    units: string;
  } | null;
}

const STATUS_FILTERS = ["All", "Pending", "Shipped", "Delivered", "Void"];
const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  Pending:   { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  Shipped:   { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  Delivered: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  Void:      { color: "text-red-700",     bg: "bg-red-50 border-red-200" },
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function ShipmentConfirmationPage() {
  const [data, setData] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Shipped"); // Default to Shipped (approved from Sales Order Validation)
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Modal
  const [selectedDO, setSelectedDO] = useState<DeliveryOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Stock allocation (Simplified for prototype)
  const [warehouseId] = useState("1");
  const [batchNumber] = useState("");

  /* ── Fetch Data ────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/shipping");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch DOs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Submit Shipment ───────────────────────────────────────────── */
  const handleConfirmShipment = async (status: "Delivered" | "Void") => {
    if (!selectedDO) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          do_id: selectedDO.do_id,
          do_code: selectedDO.do_code,
          product_id: selectedDO.product_id,
          quantity: selectedDO.quantity,
          status: status,
          warehouse_id: Number(warehouseId),
          batch_number: batchNumber || "AUTO-FEFO"
        }),
      });

      if (res.ok) {
        setSuccessMsg(status === "Delivered" ? "Shipment Confirmed!" : "Delivery Order Voided.");
        fetchData();
      } else {
        const json = await res.json();
        Swal.fire("Error", json.error || "Failed to confirm shipment", "error");
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
    .filter((d) => {
      const matchSearch =
        d.do_code.toLowerCase().includes(search.toLowerCase()) ||
        d.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        d.ms_products?.product_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || d.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === "order_date") {
        return sortAsc
          ? new Date(a.order_date).getTime() - new Date(b.order_date).getTime()
          : new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
      }
      if (sortBy === "quantity") {
        return sortAsc ? a.quantity - b.quantity : b.quantity - a.quantity;
      }
      return 0;
    });

  const shippedCount = data.filter((d) => d.status === "Shipped").length;
  const deliveredCount = data.filter((d) => d.status === "Delivered").length;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shipment Confirmation</h1>
          <p className="text-sm text-slate-500 mt-1">Confirm shipment of approved orders. Workflow: Pending → Shipped (after Sales Order Validation approval) → Delivered (UC-INV-010)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Ready to Ship (Approved)", value: shippedCount, color: "text-blue-600", bg: "bg-blue-50", icon: PackageOpen },
          { label: "Already Delivered", value: deliveredCount, color: "text-emerald-600", bg: "bg-emerald-50", icon: Truck },
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
          <Input placeholder="Search DO Code, Customer, Product..." className="pl-9 h-10 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
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

      {/* Status Workflow Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
        <div className="w-4 h-4 flex-shrink-0 mt-0.5">
          <span className="text-blue-600 font-bold">ℹ</span>
        </div>
        <div>
          <p className="font-medium">Status Workflow:</p>
          <p><strong>Pending</strong> (in Sales Order Validation) → <strong>Shipped</strong> (approved by Sales Order Validation, ready to confirm) → <strong>Delivered</strong> (confirmed shipped)</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">DO Code</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Product to Ship</th>
                  <th className="px-6 py-4 font-medium text-right">
                    <button onClick={() => toggleSort("quantity")} className="flex items-center gap-1.5 ml-auto hover:text-slate-900">
                      Qty <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" /><p>Loading delivery orders...</p>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm font-medium">No records found</p>
                  </td></tr>
                ) : (
                  filtered.map((d, idx) => {
                    const cfg = STATUS_CONFIG[d.status];
                    return (
                      <tr key={`${d.do_id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">{d.do_code}</span>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(d.order_date).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{d.customer_name}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 truncate max-w-[200px]" title={d.delivery_address}>
                            <MapPin className="w-3 h-3 shrink-0" /> {d.delivery_address}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{d.ms_products?.product_name}</p>
                          <p className="text-xs text-slate-400">{d.ms_products?.product_code}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-slate-900 tabular-nums">{d.quantity.toLocaleString()}</span>
                          <span className="text-slate-400 text-xs ml-1">{d.ms_products?.units}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase border ${cfg.bg} ${cfg.color}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(d.status === "Pending" || d.status === "Shipped") && (
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                              onClick={() => { setSelectedDO(d); setSuccessMsg(null); }}
                            >
                              Process
                            </Button>
                          )}
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

      {/* ── Process Modal ── */}
      {selectedDO && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setSelectedDO(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="font-semibold text-slate-900">Process Shipment</h2>
                </div>
                <button onClick={() => setSelectedDO(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {successMsg ? (
                <div className="p-10 flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${successMsg.includes("Voided") ? "bg-red-50" : "bg-emerald-50"}`}>
                    {successMsg.includes("Voided") ? <XCircle className="w-8 h-8 text-red-500" /> : <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{successMsg}</h3>
                  <Button className="mt-6 w-full" variant="outline" onClick={() => setSelectedDO(null)}>Close</Button>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="p-6 space-y-5">
                    {/* DO Details */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">DO Code</span>
                        <span className="font-mono font-medium">{selectedDO.do_code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Customer</span>
                        <span className="font-medium">{selectedDO.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Product</span>
                        <span className="font-medium">{selectedDO.ms_products?.product_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Quantity</span>
                        <span className="font-bold text-blue-600">{selectedDO.quantity.toLocaleString()} {selectedDO.ms_products?.units}</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-amber-800 flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                      <p>Confirming shipment will finalize the delivery order.</p>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between shrink-0">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleConfirmShipment("Void")}
                      disabled={isSubmitting}
                    >
                      Void DO
                    </Button>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setSelectedDO(null)}>Cancel</Button>
                      <Button 
                        onClick={() => handleConfirmShipment("Delivered")} 
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2" 
                        disabled={isSubmitting}
                      >
                        <Truck className="w-4 h-4" />
                        {isSubmitting ? "Processing..." : "Confirm Shipment"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
