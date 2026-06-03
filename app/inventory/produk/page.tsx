"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  Package,
  X,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  Eye,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PRODUCT_MOCK_DETAILS } from "./mock-details";

type ProductData = {
  product_id: number;
  product_code: string;
  product_name: string;
  category: "FG" | "RM" | "PM";
  units: string;
  minimum_stock: number;
  current_stock: number;
  stock_health: "Out of Stock" | "Below Safety Stock" | "Low" | "Adequate";
};

const CATEGORIES = ["All", "FG", "RM", "PM"];

export default function ProductsPage() {
  const [data, setData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState<keyof ProductData | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New Product Form State
  const [newProduct, setNewProduct] = useState({
    product_code: "",
    product_name: "",
    category: "FG",
    units: "pcs",
    minimum_stock: 0,
    expiry_flag: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Use the stock endpoint to get master data + current stock
      const res = await fetch("/api/inventory/stock");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product? This might fail if the product is already used in transactions.")) return;
    try {
      const res = await fetch(`/api/inventory/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setData(data.filter((p) => p.product_id !== id));
      } else {
        const json = await res.json();
        alert(`Failed to delete: ${json.error}`);
      }
    } catch {
      alert("An error occurred while deleting.");
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          minimum_stock: Number(newProduct.minimum_stock)
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchData(); // Refresh list to get new product with stock info
      } else {
        const json = await res.json();
        alert(`Failed to create: ${json.error}`);
      }
    } catch {
      alert("An error occurred while creating product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSort = (col: keyof ProductData) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };

  const filtered = data
    .filter((p) => {
      const matchSearch = p.product_code.toLowerCase().includes(search.toLowerCase()) ||
        p.product_name.toLowerCase().includes(search.toLowerCase());
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

  const getHealthColor = (health: string) => {
    if (health === "Out of Stock" || health === "Below Safety Stock") return "text-red-600 bg-red-50";
    if (health === "Low") return "text-orange-600 bg-orange-50";
    return "text-emerald-600 bg-emerald-50";
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      
      {/* Header */}
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Products & Materials</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            Manage your master inventory data
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-10 px-5 gap-2"
        >
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search code or name..."
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
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                category === cat
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <Button variant="outline" size="icon" onClick={fetchData} className="ml-auto h-10 w-10 text-slate-500" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">
                    <button onClick={() => toggleSort("product_code")} className="flex items-center gap-1.5 hover:text-slate-900">
                      Product Code <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-medium">
                    <button onClick={() => toggleSort("product_name")} className="flex items-center gap-1.5 hover:text-slate-900">
                      Product Name <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium text-right">
                    <button onClick={() => toggleSort("current_stock")} className="flex items-center gap-1.5 ml-auto hover:text-slate-900">
                      Actual Stock <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 font-medium text-right">Target Min.</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" />
                      <p>Loading products...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No products found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((product) => (
                    <tr key={product.product_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {product.product_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{product.product_name}</td>
                      <td className="px-6 py-4 text-slate-500">{product.category}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {product.current_stock?.toLocaleString("en-US") || 0}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">{product.units}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 tabular-nums">
                        {product.minimum_stock?.toLocaleString("en-US")}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-semibold tracking-wide uppercase ${getHealthColor(product.stock_health)}`}>
                          {product.stock_health}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                          onClick={() => handleDelete(product.product_id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Product Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md pointer-events-auto flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Add New Product</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateProduct} className="flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto">
                  
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex gap-3 text-sm text-blue-800">
                    <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
                    <p>New products will have 0 stock initially. Use <strong>Goods Receipt</strong> to add stock.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Code</label>
                    <Input required placeholder="e.g. RM-006" value={newProduct.product_code} onChange={e => setNewProduct({...newProduct, product_code: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
                    <Input required placeholder="e.g. Vanilla Powder" value={newProduct.product_name} onChange={e => setNewProduct({...newProduct, product_name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                      <select 
                        required
                        className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value as "FG" | "RM" | "PM"})}
                      >
                        <option value="FG">Finished Good (FG)</option>
                        <option value="RM">Raw Material (RM)</option>
                        <option value="PM">Packaging (PM)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">UoM (Unit)</label>
                      <select 
                        required
                        className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
                        value={newProduct.units}
                        onChange={e => setNewProduct({...newProduct, units: e.target.value})}
                      >
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="pcs">pcs</option>
                        <option value="roll">roll</option>
                        <option value="pack">pack</option>
                        <option value="carton">carton</option>
                        <option value="bag">bag</option>
                        <option value="drum">drum</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Safety Stock Target</label>
                    <Input required type="number" min="0" value={Number.isNaN(newProduct.minimum_stock) ? "" : newProduct.minimum_stock} onChange={e => setNewProduct({...newProduct, minimum_stock: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Product"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Product Details Drawer/Modal */}
      {selectedProduct && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setSelectedProduct(null)} />
          <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono">{selectedProduct.product_code}</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{selectedProduct.product_name}</h2>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Product Image & Description */}
              <div className="space-y-4">
                {PRODUCT_MOCK_DETAILS[selectedProduct.product_code]?.image ? (
                  <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img  
                      src={PRODUCT_MOCK_DETAILS[selectedProduct.product_code].image} 
                      alt={selectedProduct.product_name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs font-medium">No Image Available</p>
                  </div>
                )}
                
                <p className="text-sm text-slate-600 leading-relaxed">
                  {PRODUCT_MOCK_DETAILS[selectedProduct.product_code]?.description || 
                   "No description available for this product. Please update the product master data to include detailed specifications."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">Category</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedProduct.category}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">Unit of Measure</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedProduct.units}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Stock Information</h3>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>Actual Stock</span>
                    <span className={`font-bold text-sm ${selectedProduct.current_stock < selectedProduct.minimum_stock ? "text-red-600" : "text-emerald-600"}`}>
                      {selectedProduct.current_stock.toLocaleString("en-US")} {selectedProduct.units}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${selectedProduct.current_stock < selectedProduct.minimum_stock ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, (selectedProduct.current_stock / (selectedProduct.minimum_stock || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-slate-400">
                    <span>0</span>
                    <span>Target: {selectedProduct.minimum_stock.toLocaleString("en-US")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
