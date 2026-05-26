"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  Package,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Product = {
  id: string;
  name: string;
  category: "Raw Material" | "Finished Good" | "Packaging";
  stock: number;
  unit: string;
  safetyStock: number;
  location: string;
  lastUpdated: string;
};

const PRODUCTS: Product[] = [
  { id: "RM-001", name: "Sugar", category: "Raw Material", stock: 5000, unit: "Kg", safetyStock: 1000, location: "WH-A / Rack 1", lastUpdated: "11 Mei 2026" },
  { id: "RM-002", name: "Coffee Extract", category: "Raw Material", stock: 150, unit: "Kg", safetyStock: 500, location: "WH-A / Rack 2", lastUpdated: "10 Mei 2026" },
  { id: "RM-003", name: "Cocoa Powder", category: "Raw Material", stock: 300, unit: "Kg", safetyStock: 500, location: "WH-A / Rack 3", lastUpdated: "09 Mei 2026" },
  { id: "RM-004", name: "Packaging Foil", category: "Packaging", stock: 12000, unit: "Roll", safetyStock: 2000, location: "WH-B / Rack 1", lastUpdated: "08 Mei 2026" },
  { id: "RM-005", name: "Cardboard Box", category: "Packaging", stock: 8500, unit: "Pcs", safetyStock: 3000, location: "WH-B / Rack 4", lastUpdated: "11 Mei 2026" },
  { id: "FG-001", name: "Kopiko Blister", category: "Finished Good", stock: 1200, unit: "Pcs", safetyStock: 2000, location: "WH-C / Bin A-02", lastUpdated: "11 Mei 2026" },
  { id: "FG-002", name: "Beng-Beng ShareIt", category: "Finished Good", stock: 850, unit: "Pcs", safetyStock: 1500, location: "WH-C / Bin B-02", lastUpdated: "10 Mei 2026" },
  { id: "FG-003", name: "Kopiko 78°C RTD", category: "Finished Good", stock: 3200, unit: "Carton", safetyStock: 1000, location: "WH-C / Bin A-01", lastUpdated: "09 Mei 2026" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Raw Material": "bg-blue-50 text-blue-700",
  "Finished Good": "bg-green-50 text-green-700",
  "Packaging": "bg-purple-50 text-purple-700",
};

const CATEGORIES = ["All", "Raw Material", "Finished Good", "Packaging"];

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState<keyof Product | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const toggleSort = (col: keyof Product) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };

  const filtered = PRODUCTS
    .filter((p) => {
      const matchSearch = p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || p.category === category;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const stockBelowSafety = PRODUCTS.filter((p) => p.stock < p.safetyStock).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#EE4444] mb-1">Master Data</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Produk & Material</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {PRODUCTS.length} total SKU · {" "}
            <span className="text-[#EE4444] font-medium">{stockBelowSafety} di bawah safety stock</span>
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#EE4444] hover:bg-[#D43B3B] text-white shadow-[0_4px_14px_rgba(238,68,68,0.3)] h-10 px-5 gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah Produk
        </Button>
      </div>

      
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari kode atau nama produk..."
            className="pl-9 h-10 border-slate-200 bg-white focus:bg-white text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                category === cat
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" className="h-10 border-slate-200 gap-2 ml-auto">
          <SlidersHorizontal className="w-4 h-4" />
          Filter Lanjutan
        </Button>
      </div>

      
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5 font-medium">
                  <button onClick={() => toggleSort("id")} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                    Kode Produk <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-6 py-3.5 font-medium">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                    Nama <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-6 py-3.5 font-medium">Kategori</th>
                <th className="px-6 py-3.5 font-medium text-right">
                  <button onClick={() => toggleSort("stock")} className="flex items-center gap-1.5 ml-auto hover:text-slate-900 transition-colors">
                    Stok Aktual <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-6 py-3.5 font-medium text-right">Safety Stock</th>
                <th className="px-6 py-3.5 font-medium">Lokasi</th>
                <th className="px-6 py-3.5 font-medium">Update Terakhir</th>
                <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((product) => {
                const isBelowSafety = product.stock < product.safetyStock;
                const pct = Math.min(100, Math.round((product.stock / product.safetyStock) * 100));
                return (
                  <tr key={product.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">
                        {product.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${CATEGORY_COLORS[product.category]}`}>
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-semibold tabular-nums text-sm ${isBelowSafety ? "text-[#EE4444]" : "text-slate-900"}`}>
                          {product.stock.toLocaleString("id-ID")} {product.unit}
                        </span>
                        
                        <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isBelowSafety ? "bg-[#EE4444]" : "bg-green-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs tabular-nums">
                      {product.safetyStock.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{product.location}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{product.lastUpdated}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-[#EE4444] hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Tidak ada produk ditemukan</p>
                    <p className="text-xs mt-1">Coba ubah filter atau kata kunci pencarian</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>

        
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{PRODUCTS.length}</strong> produk
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-200" disabled>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium text-slate-600 px-2">1 / 1</span>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-200" disabled>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      
      {selectedProduct && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            onClick={() => setSelectedProduct(null)}
          />
          <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono">{selectedProduct.id}</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{selectedProduct.name}</h2>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Kategori", value: selectedProduct.category },
                  { label: "Satuan", value: selectedProduct.unit },
                  { label: "Lokasi", value: selectedProduct.location },
                  { label: "Update Terakhir", value: selectedProduct.lastUpdated },
                ].map((field) => (
                  <div key={field.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">{field.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{field.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Informasi Stok</h3>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>Stok Aktual</span>
                    <span
                      className={`font-bold text-sm ${selectedProduct.stock < selectedProduct.safetyStock ? "text-[#EE4444]" : "text-green-600"}`}
                    >
                      {selectedProduct.stock.toLocaleString("id-ID")} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${selectedProduct.stock < selectedProduct.safetyStock ? "bg-[#EE4444]" : "bg-green-500"}`}
                      style={{ width: `${Math.min(100, (selectedProduct.stock / selectedProduct.safetyStock) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-slate-400">
                    <span>0</span>
                    <span>Safety: {selectedProduct.safetyStock.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1 h-10 border-slate-200">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button className="flex-1 h-10 bg-[#EE4444] hover:bg-[#D43B3B] text-white">
                Buat PR
              </Button>
            </div>
          </div>
        </>
      )}

      
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Tambah Produk Baru</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label: "Kode Produk", placeholder: "e.g. RM-006", type: "text" },
                  { label: "Nama Produk", placeholder: "e.g. Vanilla Powder", type: "text" },
                  { label: "Safety Stock", placeholder: "e.g. 500", type: "number" },
                  { label: "Satuan (UOM)", placeholder: "e.g. Kg", type: "text" },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{field.label}</label>
                    <Input type={field.type} placeholder={field.placeholder} className="h-10 border-slate-200" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori</label>
                  <select className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white">
                    <option>Raw Material</option>
                    <option>Finished Good</option>
                    <option>Packaging</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowAddModal(false)}>
                  Batal
                </Button>
                <Button className="flex-1 h-10 bg-[#EE4444] hover:bg-[#D43B3B] text-white">
                  Simpan Produk
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
