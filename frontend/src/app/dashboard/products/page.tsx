"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Package,
  Plus,
  Search,
  Upload,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
  Send,
  Store,
  Check,
  Download,
} from "lucide-react";

interface ProductVariant {
  id?: string;
  sku: string;
  title: string;
  size?: string;
  color?: string;
  material?: string;
  price: number;
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  brand?: string;
  category: string;
  mrp: number;
  selling_price: number;
  hsn_code?: string;
  gst_rate: number;
  variant_count: number;
  total_stock: number;
  created_at: string;
}

export default function ProductsPage() {
  const { role, activeWorkspace } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedProductForPublish, setSelectedProductForPublish] = useState<Product | null>(null);
  const [availableConnections, setAvailableConnections] = useState<any[]>([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [useAiListing, setUseAiListing] = useState(true);
  const [publishResults, setPublishResults] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Apparel & Fashion");
  const [mrp, setMrp] = useState<number>(1499);
  const [sellingPrice, setSellingPrice] = useState<number>(999);
  const [hsnCode, setHsnCode] = useState("61091000");
  const [gstRate, setGstRate] = useState<number>(18);
  const [variants, setVariants] = useState<ProductVariant[]>([
    { sku: "", title: "Size M / Black", size: "M", color: "Black", material: "Pure Cotton", price: 999, stock_quantity: 50 },
    { sku: "", title: "Size L / Black", size: "L", color: "Black", material: "Pure Cotton", price: 999, stock_quantity: 50 },
  ]);

  const canEdit = role === "WORKSPACE_OWNER" || role === "ADMIN" || role === "PRODUCT_MANAGER" || role === "SUPER_ADMIN";

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      const data = await api.get<Product[]>("/products", { params });
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeWorkspace?.id]);

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      { sku: "", title: `Variant ${variants.length + 1}`, size: "XL", color: "Black", material: "Pure Cotton", price: sellingPrice, stock_quantity: 30 },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleOpenPublishModal = async (product: Product) => {
    setSelectedProductForPublish(product);
    setPublishResults([]);
    setPublishModalOpen(true);
    try {
      const conns = await api.get<any[]>("/marketplaces/connections");
      setAvailableConnections(conns);
      setSelectedConnectionIds(conns.map((c) => c.id));
    } catch (err) {
      console.error("Failed to load connections:", err);
    }
  };

  const handleExecutePublish = async () => {
    if (!selectedProductForPublish || selectedConnectionIds.length === 0) return;
    setIsPublishing(true);
    setError(null);
    try {
      const res = await api.post<any>(`/products/${selectedProductForPublish.id}/publish`, {
        connection_ids: selectedConnectionIds,
        use_ai_listing: useAiListing,
      });
      setPublishResults(res.results || []);
      setSuccess(`Publish executed across ${res.results.length} connected channel(s)`);
    } catch (err: any) {
      setError(err.message || "Failed to publish product to marketplaces");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // Auto fill variant SKUs if blank
    const processedVariants = variants.map((v, i) => ({
      ...v,
      sku: v.sku.trim() || `${sku.trim()}-V${i + 1}`,
    }));

    try {
      await api.post("/products", {
        name,
        sku,
        brand,
        category,
        mrp,
        selling_price: sellingPrice,
        hsn_code: hsnCode,
        gst_rate: gstRate,
        variants: processedVariants,
      });

      setSuccess(`Product "${name}" and ${processedVariants.length} variants created with central warehouse inventory!`);
      setCreateModalOpen(false);
      // Reset
      setName("");
      setSku("");
      fetchProducts();
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      "name,sku,brand,category,mrp,selling_price,stock,hsn_code,gst_rate,size,color,material\n" +
      "Pure Cotton Classic Crew Tee,TEE-CREW-BLK,SellSync Essentials,Apparel,1299,799,50,61091000,18,L,Black,100% Cotton\n" +
      "Linen Casual Button Down Shirt,SHIRT-LIN-WHT,SellSync Essentials,Apparel,2499,1499,35,62052000,12,M,White,Pure Linen\n" +
      "Slim Fit Chino Trousers,PANT-CHINO-BEI,SellSync Essentials,Apparel,2999,1899,25,62034200,12,32,Beige,Stretch Cotton\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sellsync_products_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await api.upload<any>("/products/bulk-import", formData);
      setSuccess(`Bulk import complete: ${data.total_imported} product(s) imported into catalog and warehouse!`);
      if (data.errors && data.errors.length > 0) {
        setError(`Notes: ${data.errors.slice(0, 3).join("; ")}`);
      }
      setBulkModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || "Bulk import failed. Please verify CSV file format.");
    } finally {
      setSubmitting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Central Product Master
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Maintain canonical products with multi-attribute variants, GST slabs, and HSN codes independent of marketplace schemas.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
            >
              <Upload className="h-4 w-4" />
              <span>Bulk CSV Import</span>
            </button>
            <button
              onClick={() => {
                setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Product</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
            placeholder="Search products by SKU, title or brand..."
            className="w-full rounded-xl border border-slate-700 bg-[#0B132B] pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
          />
        </div>
        <button
          onClick={fetchProducts}
          className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          Search
        </button>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-400" />
            <span>Canonical Catalog ({products.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
            Loading catalog...
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No products found. Click "Create Product" to add your first canonical listing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#060a17] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Product & SKU</th>
                  <th className="px-6 py-3.5">Category & Brand</th>
                  <th className="px-6 py-3.5">HSN & Tax</th>
                  <th className="px-6 py-3.5">Pricing</th>
                  <th className="px-6 py-3.5">Total Physical Stock</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-[11px] font-mono text-blue-400 mt-0.5">{p.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{p.category}</div>
                      <div className="text-[11px] text-slate-400">{p.brand || "Unbranded"}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px]">
                      <div>HSN: {p.hsn_code || "—"}</div>
                      <div className="text-slate-400">{p.gst_rate}% GST</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-emerald-400">₹{p.selling_price}</div>
                      <div className="text-[11px] line-through text-slate-500">₹{p.mrp}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-white text-sm">{p.total_stock} Units</span>
                      <span className="text-[11px] text-slate-400 block">{p.variant_count} variant(s)</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/dashboard/ai-studio?productId=${p.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800/60 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900 transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>AI Listing</span>
                        </Link>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenPublishModal(p)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-950/80 border border-blue-800/60 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-900 transition-colors"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Publish</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Product Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0B132B] p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Create Canonical Product</h3>
                <p className="text-xs text-slate-400 mt-0.5">Master product definition independent of marketplace schemas</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pure Cotton Casual Shirt"
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    Master SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SHIRT-COTTON-001"
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Apex Lifestyle"
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Apparel, Footwear, Jewellery..."
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    placeholder="61091000"
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value))}
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    GST Rate (%)
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                  >
                    <option value={0}>0% GST</option>
                    <option value={5}>5% GST (Apparel &lt; ₹1,000)</option>
                    <option value={12}>12% GST (Apparel &gt; ₹1,000)</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
              </div>

              {/* Variants Builder */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Product Variants (Size / Color Matrix)</span>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Variant</span>
                  </button>
                </div>

                {variants.map((v, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-800 bg-[#060a17] p-3 grid grid-cols-6 gap-2 items-center">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={v.title}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].title = e.target.value;
                          setVariants(updated);
                        }}
                        placeholder="Variant Title (e.g. Size M)"
                        className="w-full bg-[#0B132B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={v.size || ""}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].size = e.target.value;
                          setVariants(updated);
                        }}
                        placeholder="Size (M/L)"
                        className="w-full bg-[#0B132B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={v.color || ""}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].color = e.target.value;
                          setVariants(updated);
                        }}
                        placeholder="Color"
                        className="w-full bg-[#0B132B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={v.stock_quantity}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].stock_quantity = Number(e.target.value);
                          setVariants(updated);
                        }}
                        placeholder="Stock"
                        className="w-full bg-[#0B132B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div className="text-right">
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-500 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Product & Stock...</span>
                    </>
                  ) : (
                    <span>Create Product</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Bulk CSV Product Import</h3>
              <button onClick={() => setBulkModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Upload a CSV spreadsheet with columns: <code className="text-blue-300">name, sku, brand, category, mrp, selling_price, stock, hsn_code</code>.
              </p>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-slate-300">Need the official format?</span>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-[11px] font-bold text-white transition-all shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              <label className="block border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-blue-500 cursor-pointer bg-[#060a17]">
                <FileSpreadsheet className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <span className="font-semibold text-white block">Click to select CSV File</span>
                <span className="text-[11px] text-slate-500">Supports up to 5,000 SKUs per file</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  disabled={submitting}
                  className="hidden"
                />
              </label>

              {submitting && (
                <div className="flex items-center justify-center gap-2 text-blue-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing CSV rows and creating inventory...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* One-Click Multi-Marketplace Publish Modal */}
      {publishModalOpen && selectedProductForPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Publish to Marketplaces</h3>
              </div>
              <button
                onClick={() => setPublishModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Product Summary */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="font-bold text-white text-sm">{selectedProductForPublish.name}</div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>SKU: <strong className="text-blue-400 font-mono">{selectedProductForPublish.sku}</strong></span>
                <span>MRP: <strong>₹{selectedProductForPublish.mrp}</strong></span>
                <span>Selling: <strong className="text-emerald-400">₹{selectedProductForPublish.selling_price}</strong></span>
              </div>
            </div>

            {/* Channel Selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Select Connected Marketplace Accounts:
              </label>

              {availableConnections.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-400">
                  <p>No active marketplace connections found.</p>
                  <Link
                    href="/dashboard/channels"
                    className="inline-block mt-2 text-blue-400 hover:underline font-semibold"
                  >
                    Connect Shopify or Flipkart Account →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableConnections.map((conn) => {
                    const isChecked = selectedConnectionIds.includes(conn.id);
                    return (
                      <div
                        key={conn.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedConnectionIds(selectedConnectionIds.filter((id) => id !== conn.id));
                          } else {
                            setSelectedConnectionIds([...selectedConnectionIds, conn.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "border-blue-500 bg-blue-950/40"
                            : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="rounded bg-slate-800 text-[10px] font-bold text-white px-2 py-0.5 uppercase">
                            {conn.marketplace_code}
                          </span>
                          <div>
                            <div className="text-xs font-semibold text-white">{conn.account_name}</div>
                            <div className="text-[10px] text-slate-400">{conn.store_url || "Direct API"}</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="rounded border-slate-700 text-blue-600 focus:ring-0"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Optimization Option */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-slate-300">Use AI Generated Channel Listing (Title & Bullets)</span>
              </div>
              <input
                type="checkbox"
                checked={useAiListing}
                onChange={(e) => setUseAiListing(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-0"
              />
            </div>

            {/* Publish Results feedback */}
            {publishResults.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-2 text-xs">
                <div className="font-semibold text-white">Publish Results:</div>
                {publishResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">{r.marketplace_code} ({r.account_name}):</span>
                    <span
                      className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                        r.status === "PUBLISHED"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isPublishing || selectedConnectionIds.length === 0}
                onClick={handleExecutePublish}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Publish to ({selectedConnectionIds.length}) Stores</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

