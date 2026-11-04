"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Save,
  Check,
  RefreshCw,
  Loader2,
  Sliders,
  Tag,
  ShieldCheck,
  Eye,
  Smartphone,
  Monitor,
  ShoppingBag,
  ShoppingCart,
  Truck,
  ArrowRight,
  Share2,
  ExternalLink,
  Star,
  Zap,
  Send,
  Package,
  Grid3X3,
  ChevronRight,
  Heart,
  Store,
  X,
  CreditCard,
  Percent,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  brand?: string;
  category: string;
  subcategory?: string;
  mrp?: number;
  selling_price?: number;
  hsn_code?: string;
  gst_rate?: number;
  weight_kg?: number;
  dimensions?: string;
  total_stock?: number;
  image_url?: string;
  images?: string[];
  variants?: any[];
}

interface AIGeneratedListing {
  id: string;
  product_id: string;
  marketplace_code: string;
  title: string;
  bullet_points: string[];
  description: string;
  search_terms: string[];
  attributes: Record<string, any>;
  image_url?: string;
  images?: string[];
  is_approved: boolean;
  model_used: string;
  tokens_used: number;
  created_at: string;
}

interface MarketplaceConnection {
  id: string;
  tenant_id: string;
  marketplace_code: string;
  marketplace_name: string;
  account_name: string;
  is_active: boolean;
  store_url?: string;
}

const MARKETPLACES = [
  { code: "FLIPKART", name: "Flipkart", maxTitle: 150 },
  { code: "SHOPIFY", name: "Shopify", maxTitle: 255 },
  { code: "MEESHO", name: "Meesho", maxTitle: 100 },
  { code: "WOOCOMMERCE", name: "WooCommerce", maxTitle: 200 },
  { code: "MYNTRA", name: "Myntra", maxTitle: 120 },
  { code: "AJIO", name: "AJIO", maxTitle: 120 },
];

function AIStudioContent() {
  const { activeWorkspace } = useAuth();
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get("productId") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("FLIPKART");
  const [focusKeywords, setFocusKeywords] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentListing, setCurrentListing] = useState<AIGeneratedListing | null>(null);
  const [savedListings, setSavedListings] = useState<AIGeneratedListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable listing fields
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBullets, setEditBullets] = useState<string[]>([]);

  // Product Media / Image Management State
  const [productImages, setProductImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [inputImageUrl, setInputImageUrl] = useState<string>("");

  // Multi-Application Preview State
  const [previewChannel, setPreviewChannel] = useState<
    "GRID" | "FLIPKART" | "SHOPIFY" | "MEESHO" | "WOOCOMMERCE" | "MYNTRA"
  >("GRID");

  // Publishing State
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<any[]>([]);

  // Initial Fetch
  useEffect(() => {
    const fetchInit = async () => {
      try {
        setLoading(true);
        let [prodList, listingList, connList] = await Promise.all([
          api.get<Product[]>("/products").catch(() => []),
          api.get<AIGeneratedListing[]>("/ai-studio/listings").catch(() => []),
          api.get<MarketplaceConnection[]>("/marketplaces/connections").catch(() => []),
        ]);

        // Rehydrate products from localStorage if API is cold or deployed on Vercel
        if (!prodList || prodList.length === 0) {
          if (typeof window !== "undefined") {
            const cached = localStorage.getItem("sellsync_canonical_products");
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  prodList = parsed;
                }
              } catch { }
            }
          }
        }

        // Rehydrate saved AI listings from localStorage
        let localListings: AIGeneratedListing[] = [];
        if (typeof window !== "undefined") {
          const cachedListings = localStorage.getItem("sellsync_ai_listings");
          if (cachedListings) {
            try {
              const parsed = JSON.parse(cachedListings);
              if (Array.isArray(parsed)) localListings = parsed;
            } catch { }
          }
        }

        const combinedListings = Array.isArray(listingList) && listingList.length > 0 ? [...listingList] : localListings;
        for (const ll of localListings) {
          if (!combinedListings.some((l) => l.id === ll.id)) {
            combinedListings.push(ll);
          }
        }

        setProducts(prodList || []);
        setSavedListings(combinedListings);
        setConnections(connList || []);
        setSelectedConnectionIds(connList.filter((c) => c.is_active).map((c) => c.id));

        const activeId = initialProductId || (prodList && prodList.length > 0 ? prodList[0].id : "");
        if (activeId) {
          setSelectedProductId(activeId);
          // Find if there's already a saved listing
          const existing = (combinedListings || []).find((l) => l.product_id === activeId);
          if (existing) {
            setCurrentListing(existing);
            setEditTitle(existing.title || "");
            setEditDescription(existing.description || "");
            setEditBullets(existing.bullet_points || []);
            setSelectedMarketplace(existing.marketplace_code || "FLIPKART");
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to initialize studio");
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, [activeWorkspace?.id]);

  // Sync when product or target marketplace changes
  useEffect(() => {
    if (selectedProductId && savedListings.length > 0) {
      const match =
        savedListings.find(
          (l) => l.product_id === selectedProductId && l.marketplace_code === selectedMarketplace
        ) || savedListings.find((l) => l.product_id === selectedProductId);

      if (match) {
        setCurrentListing(match);
        setEditTitle(match.title);
        setEditDescription(match.description);
        setEditBullets(match.bullet_points || []);
      }
    }
  }, [selectedProductId, selectedMarketplace, savedListings]);

  // Rehydrate product images whenever selected product or current listing changes
  useEffect(() => {
    const curProd = products.find((p) => p.id === selectedProductId);
    const imgs: string[] = [];
    if (curProd) {
      if (Array.isArray(curProd.images) && curProd.images.length > 0) {
        imgs.push(...curProd.images.filter(Boolean));
      } else if (curProd.image_url) {
        imgs.push(curProd.image_url);
      }
    }
    if (imgs.length === 0 && currentListing) {
      if (Array.isArray(currentListing.images) && currentListing.images.length > 0) {
        imgs.push(...currentListing.images.filter(Boolean));
      } else if (currentListing.image_url) {
        imgs.push(currentListing.image_url);
      }
    }
    setProductImages(imgs);
    setActiveImageIndex(0);
  }, [selectedProductId, products, currentListing?.id]);

  const updateProductAndListingImages = (updatedImages: string[]) => {
    const primary = updatedImages[0] || "";
    // 1. Update in-memory & persistent products
    const updatedProducts = products.map((p) =>
      p.id === selectedProductId ? { ...p, image_url: primary, images: updatedImages } : p
    );
    setProducts(updatedProducts);
    if (typeof window !== "undefined") {
      localStorage.setItem("sellsync_canonical_products", JSON.stringify(updatedProducts));
    }

    // 2. Update current listing
    if (currentListing) {
      const updatedListing = { ...currentListing, image_url: primary, images: updatedImages };
      setCurrentListing(updatedListing);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("sellsync_ai_listings");
        if (cached) {
          try {
            let list: AIGeneratedListing[] = JSON.parse(cached);
            const idx = list.findIndex((l) => l.id === currentListing.id);
            if (idx !== -1) {
              list[idx] = updatedListing;
              localStorage.setItem("sellsync_ai_listings", JSON.stringify(list));
              setSavedListings(list);
            }
          } catch { }
        }
      }
    }

    // 3. Sync to API proxy
    api.post("/products/bulk-save", { products: updatedProducts }).catch(() => {});
  };

  const handleAddImage = (newUrl: string) => {
    if (!newUrl.trim()) return;
    const url = newUrl.trim();
    const updatedImages = productImages.includes(url) ? productImages : [...productImages, url];
    setProductImages(updatedImages);
    setInputImageUrl("");
    updateProductAndListingImages(updatedImages);
    setSuccess("Product image added and synchronized with all marketplace previews!");
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updatedImages = productImages.filter((_, idx) => idx !== indexToRemove);
    setProductImages(updatedImages);
    if (activeImageIndex >= updatedImages.length) {
      setActiveImageIndex(Math.max(0, updatedImages.length - 1));
    }
    updateProductAndListingImages(updatedImages);
    setSuccess("Image removed from listing.");
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    if (indexToPrimary === 0 || indexToPrimary >= productImages.length) return;
    const target = productImages[indexToPrimary];
    const remaining = productImages.filter((_, idx) => idx !== indexToPrimary);
    const updatedImages = [target, ...remaining];
    setProductImages(updatedImages);
    setActiveImageIndex(0);
    updateProductAndListingImages(updatedImages);
    setSuccess("Primary cover image set successfully!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        handleAddImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!selectedProductId) {
      setError("Please select a product first");
      return;
    }
    setGenerating(true);
    setError(null);
    setSuccess(null);

    const kw = focusKeywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const currentProd = products.find((p) => p.id === selectedProductId) || activeProduct;

    try {
      const res = await api.post<AIGeneratedListing>("/ai-studio/generate", {
        product_id: selectedProductId,
        marketplace_code: selectedMarketplace,
        focus_keywords: kw,
        product: currentProd,
        product_name: currentProd?.name,
        brand: currentProd?.brand,
        category: currentProd?.category,
        mrp: currentProd?.mrp,
        selling_price: currentProd?.selling_price,
        hsn_code: currentProd?.hsn_code,
        gst_rate: currentProd?.gst_rate,
        variants: currentProd?.variants,
        image_url: productImages[0] || currentProd?.image_url,
        images: productImages,
      });

      if (!res.image_url && productImages[0]) res.image_url = productImages[0];
      if (!res.images && productImages.length > 0) res.images = productImages;

      setCurrentListing(res);
      setEditTitle(res.title || "");
      setEditDescription(res.description || "");
      setEditBullets(res.bullet_points || []);
      setSuccess(`AI listing generated specifically for ${selectedMarketplace}!`);

      // Persist to local listings cache
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("sellsync_ai_listings");
        let list: AIGeneratedListing[] = [];
        if (cached) {
          try {
            list = JSON.parse(cached);
          } catch { }
        }
        const filtered = list.filter((l) => !(l.product_id === selectedProductId && l.marketplace_code === selectedMarketplace));
        filtered.unshift(res);
        localStorage.setItem("sellsync_ai_listings", JSON.stringify(filtered));
        setSavedListings(filtered);
      }
    } catch (err: any) {
      setError(err.message || "AI listing generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!currentListing) return;
    try {
      const res = await api.post<AIGeneratedListing>(`/ai-studio/listings/${currentListing.id}/approve`, {
        title: editTitle,
        description: editDescription,
        bullet_points: editBullets,
        image_url: productImages[0] || currentListing.image_url,
        images: productImages,
        is_approved: true,
      });
      setCurrentListing(res);
      setSuccess("Listing approved and validated for multi-marketplace publishing!");

      // Update local cache
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("sellsync_ai_listings");
        if (cached) {
          try {
            let list: AIGeneratedListing[] = JSON.parse(cached);
            const idx = list.findIndex((l) => l.id === res.id);
            if (idx !== -1) {
              list[idx] = res;
              localStorage.setItem("sellsync_ai_listings", JSON.stringify(list));
              setSavedListings(list);
            }
          } catch { }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to approve listing");
    }
  };

  const handleOpenPublishModal = async () => {
    try {
      const conns = await api.get<MarketplaceConnection[]>("/marketplaces/connections");
      setConnections(conns);
      setSelectedConnectionIds(conns.filter((c) => c.is_active).map((c) => c.id));
    } catch (err) {
      console.error(err);
    }
    setPublishResults([]);
    setPublishModalOpen(true);
  };

  const handleExecutePublish = async () => {
    if (!selectedProductId || selectedConnectionIds.length === 0) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await api.post<any>(`/products/${selectedProductId}/publish`, {
        connection_ids: selectedConnectionIds,
        use_ai_listing: true,
      });
      setPublishResults(res.results || []);
      setSuccess(`Listing successfully published across ${res.results?.length || 0} marketplace channel(s)!`);
    } catch (err: any) {
      setError(err.message || "Failed to publish listing across channels");
    } finally {
      setPublishing(false);
    }
  };

  const activeMpConfig = MARKETPLACES.find((m) => m.code === selectedMarketplace) || MARKETPLACES[0];
  const titleLen = (editTitle || "").length;
  const maxTitle = activeMpConfig.maxTitle;

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const mrp = activeProduct?.mrp ? Number(activeProduct.mrp) : 999;
  const price = activeProduct?.selling_price ? Number(activeProduct.selling_price) : 799;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const brand = activeProduct?.brand || "";
  const displayTitle = editTitle || currentListing?.title || activeProduct?.name || "";
  const displayBullets =
    editBullets.length > 0
      ? editBullets
      : currentListing?.bullet_points && currentListing.bullet_points.length > 0
        ? currentListing.bullet_points
        : [];
  const displayDescription =
    editDescription ||
    currentListing?.description ||
    activeProduct?.description ||
    "";

  const currentDisplayImage =
    productImages[activeImageIndex] ||
    productImages[0] ||
    activeProduct?.image_url ||
    currentListing?.image_url ||
    null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Sparkles className="h-7 w-7 text-indigo-400" />
          <span>AI Listing Generator Studio</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Transform canonical product specs into high-converting, channel-tailored listings without hallucinating specifications.
        </p>
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

      {/* Generation Control Panel */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Select Product */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              1. Select Source Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
            >
              {products.length === 0 ? (
                <option value="">No products in catalog yet</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Select Marketplace Target */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              2. Target Marketplace Taxonomy
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {MARKETPLACES.map((mp) => (
                <button
                  key={mp.code}
                  type="button"
                  onClick={() => setSelectedMarketplace(mp.code)}
                  className={`rounded-xl py-2 px-2 text-[11px] font-semibold border transition-all ${selectedMarketplace === mp.code
                      ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                      : "bg-[#060a17] text-slate-400 border-slate-800 hover:text-white"
                    }`}
                >
                  {mp.name}
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              3. Focus Keywords (Optional)
            </label>
            <input
              type="text"
              value={focusKeywords}
              onChange={(e) => setFocusKeywords(e.target.value)}
              placeholder="e.g. breathable, formal wear, gift"
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Strict schema limits: max {maxTitle} title chars for {activeMpConfig.name}</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || products.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating {activeMpConfig.name} Listing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate Optimized Listing</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRODUCT MEDIA & LISTING IMAGES MANAGEMENT                                 */}
      {/* "in listing give option to add image of add product"                      */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Product & Listing Media Gallery
                </h2>
                <span className="rounded-full bg-blue-950 border border-blue-800 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                  {productImages.length} Image{productImages.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload local product photos or enter URLs. Images automatically sync with canonical product and render live across all marketplace simulators.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Upload Local Photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* Visual Gallery Grid */}
        {productImages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-[#060a17] p-8 text-center">
            <Package className="h-10 w-10 text-slate-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">No images attached to this product yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
              Upload an image from your computer, paste a web image link, or choose from our curated e-commerce catalog presets below to see live previews across Flipkart, Shopify, Meesho, and WooCommerce.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {productImages.map((imgUrl, idx) => {
              const isCover = idx === 0;
              const isHeroActive = activeImageIndex === idx;
              return (
                <div
                  key={idx}
                  className={`group relative rounded-xl border overflow-hidden aspect-square bg-[#060a17] flex items-center justify-center transition-all ${
                    isHeroActive
                      ? "border-blue-500 ring-2 ring-blue-500/30 shadow-md"
                      : "border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Product photo ${idx + 1}`}
                    className="h-full w-full object-cover cursor-pointer"
                    onClick={() => setActiveImageIndex(idx)}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />

                  {/* Cover Badge */}
                  {isCover && (
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white shadow">
                      ★ Cover
                    </span>
                  )}

                  {/* Action Overlay */}
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className="rounded-lg bg-blue-600 hover:bg-blue-500 px-2 py-1 text-[10px] font-semibold text-white shadow cursor-pointer"
                      >
                        Set Cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="rounded-lg bg-rose-600/90 hover:bg-rose-600 p-1.5 text-white cursor-pointer"
                      title="Remove Image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Image URL Input & Presets Bar */}
        <div className="rounded-xl border border-slate-800 bg-[#060a17] p-3.5 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="url"
                value={inputImageUrl}
                onChange={(e) => setInputImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddImage(inputImageUrl)}
                placeholder="Paste an image web URL (https://...)"
                className="w-full rounded-xl border border-slate-700 bg-[#0B132B] pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleAddImage(inputImageUrl)}
              disabled={!inputImageUrl.trim()}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            >
              Add URL
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Quick Catalog Presets:</span>
            {[
              { label: "👕 Black Crew Tee", url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80" },
              { label: "👔 White Oxford Shirt", url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80" },
              { label: "👖 Casual Chinos", url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80" },
              { label: "👟 Athletic Sneakers", url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80" },
              { label: "🎒 Leather Backpack", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80" },
              { label: "⌚ Minimalist Watch", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80" },
              { label: "👗 Cotton Kurti", url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80" },
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddImage(preset.url)}
                className="rounded-lg bg-[#0B132B] hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Content Studio Output */}
      {currentListing && (
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-blue-950 border border-blue-800 px-3 py-1 text-xs font-bold text-blue-400">
                {currentListing.marketplace_code}
              </span>
              <span className="text-xs text-slate-400">
                Model: {currentListing.model_used} • Tokens: {currentListing.tokens_used}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleApprove}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${currentListing.is_approved
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-500"
                  }`}
              >
                <Check className="h-4 w-4" />
                <span>{currentListing.is_approved ? "Approved & Verified" : "Approve Listing"}</span>
              </button>

              <button
                onClick={handleOpenPublishModal}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white hover:from-indigo-500 hover:to-purple-500 shadow-md transition-all cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Publish to Marketplaces</span>
              </button>
            </div>
          </div>

          {/* Title Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">
                Marketplace Title
              </label>
              <span className={titleLen > maxTitle ? "text-rose-400 font-bold" : "text-slate-400 font-mono"}>
                {titleLen} / {maxTitle} characters
              </span>
            </div>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#060a17] px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          {/* Bullet Points */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Structured Product Highlights & Bullet Points
            </label>
            {editBullets.map((bullet, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-950 text-blue-400 text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => {
                    const updated = [...editBullets];
                    updated[i] = e.target.value;
                    setEditBullets(updated);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
            ))}
          </div>

          {/* Attributes Matrix */}
          {currentListing.attributes && Object.keys(currentListing.attributes).length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Extracted Taxonomy Attributes (No Hallucinations)
              </label>
              <div className="rounded-xl border border-slate-800 bg-[#060a17] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {Object.entries(currentListing.attributes).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-[#0B132B] p-2.5 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">{k}</span>
                    <span className="text-slate-200 font-medium truncate block mt-0.5">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Terms */}
          {currentListing.search_terms && currentListing.search_terms.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Search Terms & Backend Keywords
              </label>
              <div className="flex flex-wrap gap-2">
                {currentListing.search_terms.map((term, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-1 text-xs text-slate-300"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Full Description
            </label>
            <textarea
              rows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#060a17] p-3 text-xs text-slate-300 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MULTI-APPLICATION LIVE STOREFRONT PREVIEWS SECTION                       */}
      {/* "after this this ai listing the preview of all apllication must be seen"  */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-6">
        {/* Preview Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Multi-Marketplace Storefront Live Previews
              </h2>
              <span className="rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                Live Simulator
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              High-fidelity consumer view: Preview how this listing visually renders across Flipkart, Shopify, Meesho, and WooCommerce.
            </p>
          </div>

          <div className="w-full lg:w-auto overflow-x-auto flex-nowrap pb-1 no-scrollbar">
            {/* View Mode Buttons */}
            <div className="inline-flex rounded-xl bg-[#060a17] p-1 border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewChannel("GRID")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${previewChannel === "GRID"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                <span>All Applications</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewChannel("FLIPKART")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${previewChannel === "FLIPKART"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                <span>Flipkart</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewChannel("SHOPIFY")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${previewChannel === "SHOPIFY"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                <span>Shopify</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewChannel("MEESHO")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${previewChannel === "MEESHO"
                    ? "bg-pink-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                <span>Meesho</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewChannel("WOOCOMMERCE")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${previewChannel === "WOOCOMMERCE"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                <span>WooCommerce</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewChannel("MYNTRA")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${previewChannel === "MYNTRA"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                <span>Myntra</span>
              </button>
            </div>

            <button
              onClick={handleOpenPublishModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Publish Listing</span>
            </button>
          </div>
        </div>

        {/* COMPARATIVE GRID: SHOWS ALL APPLICATIONS AT ONCE */}
        {previewChannel === "GRID" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Flipkart Card */}
            <div className="flex flex-col rounded-2xl border border-slate-700/80 bg-white text-slate-900 overflow-hidden shadow-xl">
              <div className="bg-[#2874F0] px-4 py-2.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <span className="font-black italic tracking-wide text-sm">Flipkart</span>
                  <span className="text-[10px] bg-yellow-400 text-blue-900 px-1.5 py-0.2 rounded font-bold italic">
                    Plus✦
                  </span>
                </div>
                <button
                  onClick={() => setPreviewChannel("FLIPKART")}
                  className="text-[11px] underline font-semibold text-blue-100 hover:text-white cursor-pointer"
                >
                  Expand View ↗
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="flex gap-3">
                  <div className="h-28 w-28 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center shrink-0 p-1 relative overflow-hidden">
                    {currentDisplayImage ? (
                      <img
                        src={currentDisplayImage}
                        alt={displayTitle}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Package className="h-12 w-12 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                      {displayTitle}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        4.4 <Star className="h-2.5 w-2.5 fill-white" />
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">(1,842)</span>
                      <span className="text-[10px] text-blue-600 italic font-black">F-Assured</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-base font-extrabold text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ₹{mrp.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-bold text-emerald-700">{discount}% off</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-[11px] text-blue-900 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Tag className="h-3 w-3 text-blue-600" /> Bank Offer: Extra 10% off with Axis Bank Card
                  </p>
                  <p className="text-slate-600 text-[10px]">Free delivery by Tomorrow • Cash on delivery available</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <button className="rounded-lg bg-[#ff9f00] py-2 text-center text-xs font-bold text-white shadow-sm">
                    ADD TO CART
                  </button>
                  <button className="rounded-lg bg-[#fb641b] py-2 text-center text-xs font-bold text-white shadow-sm">
                    BUY NOW
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Shopify D2C Card */}
            <div className="flex flex-col rounded-2xl border border-slate-700/80 bg-white text-slate-900 overflow-hidden shadow-xl">
              <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-xs tracking-wider uppercase">Shopify D2C Storefront</span>
                </div>
                <button
                  onClick={() => setPreviewChannel("SHOPIFY")}
                  className="text-[11px] underline font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Expand View ↗
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="flex gap-3">
                  <div className="h-28 w-28 bg-stone-100 border border-stone-200 rounded-lg flex items-center justify-center shrink-0 p-1 relative overflow-hidden">
                    {currentDisplayImage ? (
                      <img
                        src={currentDisplayImage}
                        alt={displayTitle}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Package className="h-12 w-12 text-stone-400" />
                    )}
                    <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full z-10">
                      SALE
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold">
                      {brand}
                    </span>
                    <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                      {displayTitle}
                    </p>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-base font-bold text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ₹{mrp.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-rose-600 font-bold">Save ₹{(mrp - price).toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Tax included. Fast dispatch across India.</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">Variant:</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold border border-slate-300">Standard Edition</span>
                    <span className="rounded bg-white px-2 py-0.5 text-[10px] text-slate-500 border border-slate-200">Executive Edition</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <button className="w-full rounded-lg bg-black py-2 text-center text-xs font-bold text-white shadow-sm hover:bg-slate-800">
                    ADD TO CART
                  </button>
                  <button className="w-full rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 py-2 text-center text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Buy with Shop Pay / UPI
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Meesho Reseller Mobile Card */}
            <div className="flex flex-col rounded-2xl border border-slate-700/80 bg-white text-slate-900 overflow-hidden shadow-xl">
              <div className="bg-[#f43397] px-4 py-2.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="font-extrabold text-xs">Meesho Reseller App</span>
                </div>
                <button
                  onClick={() => setPreviewChannel("MEESHO")}
                  className="text-[11px] underline font-semibold text-pink-100 hover:text-white cursor-pointer"
                >
                  Expand View ↗
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="flex gap-3">
                  <div className="h-28 w-28 bg-pink-50 border border-pink-100 rounded-lg flex items-center justify-center shrink-0 p-1 overflow-hidden">
                    {currentDisplayImage ? (
                      <img
                        src={currentDisplayImage}
                        alt={displayTitle}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Package className="h-12 w-12 text-pink-300" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                      {displayTitle}
                    </p>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-base font-extrabold text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ₹{mrp.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-bold text-pink-600">{discount}% off</span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        4.3 ★
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">Free Delivery • COD</span>
                    </div>
                  </div>
                </div>

                {/* Reseller Margin Calculator Widget */}
                <div className="rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 p-2.5 text-xs text-pink-950">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-[11px] text-pink-900">
                      <Share2 className="h-3 w-3 text-pink-600" /> Reseller Profit Margin
                    </span>
                    <span className="font-black text-emerald-700 bg-white border border-emerald-300 rounded px-1.5 py-0.5 text-[11px]">
                      +₹150 Margin
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Sell at ₹{(price + 150).toLocaleString("en-IN")} • Profit transferred directly to your bank upon delivery.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <button className="rounded-lg border border-pink-600 bg-white py-2 text-center text-xs font-bold text-pink-600 shadow-sm">
                    Add to Cart
                  </button>
                  <button className="rounded-lg bg-[#f43397] py-2 text-center text-xs font-bold text-white shadow-sm">
                    Buy Now
                  </button>
                </div>
              </div>
            </div>

            {/* 4. WooCommerce Store Card */}
            <div className="flex flex-col rounded-2xl border border-slate-700/80 bg-white text-slate-900 overflow-hidden shadow-xl">
              <div className="bg-[#7f54b3] px-4 py-2.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="font-bold text-xs tracking-wide">WooCommerce / WordPress Store</span>
                </div>
                <button
                  onClick={() => setPreviewChannel("WOOCOMMERCE")}
                  className="text-[11px] underline font-semibold text-purple-200 hover:text-white cursor-pointer"
                >
                  Expand View ↗
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="flex gap-3">
                  <div className="h-28 w-28 bg-purple-50/50 border border-purple-100 rounded-lg flex items-center justify-center shrink-0 p-1 overflow-hidden">
                    {currentDisplayImage ? (
                      <img
                        src={currentDisplayImage}
                        alt={displayTitle}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Package className="h-12 w-12 text-purple-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500">Home / {activeProduct?.category || "Products"} / SKU: {activeProduct?.sku}</p>
                    <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                      {displayTitle}
                    </p>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-base font-bold text-purple-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ₹{mrp.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      ✓ In stock ({activeProduct?.total_stock || 100} units available)
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Attributes:</span> HSN: {activeProduct?.hsn_code || "61091000"} • GST: {activeProduct?.gst_rate || 18}% • Weight: {activeProduct?.weight_kg || 0.4}kg
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-bold">
                    <span>1</span>
                  </div>
                  <button className="flex-1 rounded-lg bg-[#7f54b3] py-2 text-center text-xs font-bold text-white shadow-sm hover:bg-purple-800">
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* FOCUSED INDIVIDUAL APPLICATION PREVIEWS                               */}
        {/* ===================================================================== */}

        {/* 1. FLIPKART FOCUSED VIEW */}
        {previewChannel === "FLIPKART" && (
          <div className="rounded-2xl border border-slate-300 bg-white text-slate-900 overflow-hidden shadow-2xl">
            {/* Flipkart Blue Navbar */}
            <div className="bg-[#2874F0] px-6 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-6">
                <div>
                  <span className="font-black italic text-lg tracking-wide">Flipkart</span>
                  <div className="text-[10px] text-blue-100 flex items-center gap-1 font-semibold italic">
                    Explore <span className="text-yellow-400 font-bold">Plus✦</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center bg-white rounded-sm px-3 py-1.5 w-80 text-xs text-slate-500 shadow-inner">
                  <span>Search for products, brands and more</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="bg-white text-[#2874F0] px-4 py-1 rounded-sm shadow-sm font-bold">Login</span>
                <span className="flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" /> Cart (0)
                </span>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex items-center gap-1">
              <span>Home</span>
              <ChevronRight className="h-3 w-3" />
              <span>{activeProduct?.category || "Stationery"}</span>
              <ChevronRight className="h-3 w-3" />
              <span>{brand}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-800 font-medium truncate max-w-sm">{displayTitle}</span>
            </div>

            {/* Product Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Image & Buttons */}
              <div className="md:col-span-5 space-y-4">
                <div className="relative border border-slate-200 rounded-xl p-4 bg-white flex items-center justify-center min-h-[300px] overflow-hidden">
                  {currentDisplayImage ? (
                    <img
                      src={currentDisplayImage}
                      alt={displayTitle}
                      className="max-h-[280px] w-auto object-contain transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Package className="h-32 w-32 text-slate-400" />
                  )}
                  <div className="absolute top-3 right-3 rounded-full bg-white p-2 border border-slate-200 shadow-sm text-slate-400 hover:text-rose-500 cursor-pointer">
                    <Heart className="h-4 w-4" />
                  </div>
                </div>

                {productImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {productImages.map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImageIndex(i)}
                        className={`h-14 w-14 rounded-lg border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                          activeImageIndex === i
                            ? "border-blue-600 shadow-md ring-2 ring-blue-500/30"
                            : "border-slate-200 hover:border-slate-400 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <img src={imgUrl} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-1.5 rounded bg-[#ff9f00] py-3 text-xs font-bold text-white shadow hover:bg-amber-600 transition-all cursor-pointer">
                    <ShoppingCart className="h-4 w-4" /> ADD TO CART
                  </button>
                  <button className="flex items-center justify-center gap-1.5 rounded bg-[#fb641b] py-3 text-xs font-bold text-white shadow hover:bg-orange-600 transition-all cursor-pointer">
                    <Zap className="h-4 w-4" /> BUY NOW
                  </button>
                </div>
              </div>

              {/* Right Column: Listing Details */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                    {displayTitle}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="bg-emerald-700 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      4.4 <Star className="h-3 w-3 fill-white" />
                    </span>
                    <span className="text-xs text-slate-500 font-medium">1,842 Ratings & 235 Reviews</span>
                    <span className="text-xs text-blue-600 font-black italic tracking-wide">F-Assured</span>
                  </div>
                </div>

                {/* Price block */}
                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Special Price</span>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <span className="text-2xl font-black text-slate-900">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-slate-400 line-through">
                      ₹{mrp.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm font-bold text-emerald-700">{discount}% off</span>
                  </div>
                  <span className="text-[11px] text-slate-500">₹{activeProduct?.gst_rate || 18}% GST inclusive</span>
                </div>

                {/* Available Offers */}
                <div className="space-y-1.5 text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900">Available Offers</h4>
                  <p className="flex items-center gap-2 text-slate-800">
                    <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span><b>Bank Offer:</b> 5% Unlimited Cashback on Flipkart Axis Bank Credit Card</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-800">
                    <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span><b>Special Price:</b> Extra ₹50 off included in current price</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-800">
                    <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span><b>Partner Offer:</b> Free ₹500 voucher on first orders with Flipkart Pay Later</span>
                  </p>
                </div>

                {/* Delivery */}
                <div className="border-t border-slate-200 pt-3 flex items-center gap-6 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-500 font-semibold">Delivery:</span>{" "}
                    <span className="font-bold text-slate-900">Free Delivery by Tomorrow, 9 PM</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">COD:</span>{" "}
                    <span className="font-bold text-emerald-700">Available</span>
                  </div>
                </div>

                {/* AI Highlights */}
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">Highlights</h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {displayBullets.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Specifications Matrix */}
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">Specifications</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <div className="grid grid-cols-3 border-b border-slate-200 p-2 bg-slate-50">
                      <span className="text-slate-500">Brand</span>
                      <span className="col-span-2 font-medium text-slate-800">{brand}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-200 p-2">
                      <span className="text-slate-500">Model SKU</span>
                      <span className="col-span-2 font-medium text-slate-800">{activeProduct?.sku}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-200 p-2 bg-slate-50">
                      <span className="text-slate-500">HSN Code</span>
                      <span className="col-span-2 font-medium text-slate-800">{activeProduct?.hsn_code || "61091000"}</span>
                    </div>
                    <div className="grid grid-cols-3 p-2">
                      <span className="text-slate-500">Dimensions & Weight</span>
                      <span className="col-span-2 font-medium text-slate-800">
                        {activeProduct?.dimensions || "10x10x5 cm"} • {activeProduct?.weight_kg || 0.4} kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SHOPIFY MODERN D2C FOCUSED VIEW */}
        {previewChannel === "SHOPIFY" && (
          <div className="rounded-2xl border border-stone-200 bg-white text-stone-900 overflow-hidden shadow-2xl">
            {/* Shopify Announcement Bar */}
            <div className="bg-stone-900 text-white text-[11px] font-semibold tracking-wider uppercase text-center py-2">
              ✨ Free Express Shipping across India on orders above ₹499 ✨
            </div>

            {/* Shopify Boutique Header */}
            <div className="border-b border-stone-200 px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <span className="font-serif text-lg font-bold tracking-widest uppercase">{brand} LUXE</span>
                <nav className="hidden sm:flex items-center gap-6 text-xs uppercase tracking-wider font-medium text-stone-600">
                  <span className="text-stone-900 font-bold border-b-2 border-stone-900 pb-0.5">Catalog</span>
                  <span>New In</span>
                  <span>Collections</span>
                  <span>Journal</span>
                </nav>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-stone-700">
                <span>Search</span>
                <span>Account</span>
                <span className="flex items-center gap-1 font-bold">
                  Bag (0)
                </span>
              </div>
            </div>

            {/* D2C Body */}
            <div className="p-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
              {/* Product Gallery */}
              <div className="md:col-span-6 space-y-4">
                <div className="aspect-square rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center p-6 relative overflow-hidden">
                  {currentDisplayImage ? (
                    <img
                      src={currentDisplayImage}
                      alt={displayTitle}
                      className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Package className="h-40 w-40 text-stone-400" />
                  )}
                  <span className="absolute top-4 left-4 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider z-10 shadow">
                    Save {discount}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {productImages.length > 0 ? (
                    productImages.slice(0, 4).map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImageIndex(i)}
                        className={`aspect-square rounded-lg border-2 overflow-hidden bg-stone-50 transition-all cursor-pointer ${
                          activeImageIndex === i
                            ? "border-stone-900 ring-2 ring-stone-900/20"
                            : "border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <img src={imgUrl} alt="Thumbnail" className="h-full w-full object-cover" />
                      </button>
                    ))
                  ) : (
                    [1, 2, 3, 4].map((i) => (
                      <div key={i} className="aspect-square rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center">
                        <Package className="h-6 w-6 text-stone-300" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Purchase Details */}
              <div className="md:col-span-6 space-y-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                    {brand} Studio Collection
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">
                    {displayTitle}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-stone-900">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-stone-400 line-through">
                      ₹{mrp.toLocaleString("en-IN")}
                    </span>
                    <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700">
                      Save ₹{(mrp - price).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">Tax included. Shipping calculated at checkout.</p>
                </div>

                {/* Variant Selector */}
                <div className="space-y-3 border-t border-stone-200 pt-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Edition Variant</span>
                    <span className="text-stone-500 underline cursor-pointer">Size Guide</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl border-2 border-stone-900 bg-stone-900 p-2.5 text-left text-xs font-bold text-white">
                      Standard Edition
                    </button>
                    <button className="rounded-xl border border-stone-300 bg-white p-2.5 text-left text-xs font-semibold text-stone-700 hover:border-stone-500">
                      Executive Edition (+₹200)
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <button className="w-full rounded-xl bg-stone-900 py-3.5 text-xs font-bold tracking-widest uppercase text-white shadow-lg hover:bg-stone-800 transition-all cursor-pointer">
                    Add to Cart
                  </button>
                  <button className="w-full rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 py-3.5 text-xs font-bold tracking-widest uppercase text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer">
                    <Zap className="h-4 w-4" /> Instant Checkout with Shop Pay / UPI
                  </button>
                </div>

                {/* Trust perks */}
                <div className="border-t border-stone-200 pt-4 grid grid-cols-3 gap-3 text-center text-xs text-stone-600">
                  <div className="p-2 rounded-xl bg-stone-50">
                    <Truck className="h-4 w-4 mx-auto text-stone-700 mb-1" />
                    <span className="block font-bold text-[10px]">Free Delivery</span>
                  </div>
                  <div className="p-2 rounded-xl bg-stone-50">
                    <ShieldCheck className="h-4 w-4 mx-auto text-emerald-700 mb-1" />
                    <span className="block font-bold text-[10px]">100% Genuine</span>
                  </div>
                  <div className="p-2 rounded-xl bg-stone-50">
                    <CreditCard className="h-4 w-4 mx-auto text-stone-700 mb-1" />
                    <span className="block font-bold text-[10px]">Secure UPI/Cards</span>
                  </div>
                </div>

                {/* Description */}
                <div className="border-t border-stone-200 pt-4 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">About the Product</h4>
                  <p className="text-xs text-stone-700 leading-relaxed">{displayDescription}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. MEESHO MOBILE APP RESELLER FOCUSED VIEW */}
        {previewChannel === "MEESHO" && (
          <div className="max-w-md mx-auto rounded-3xl border-4 border-slate-700 bg-white text-slate-900 overflow-hidden shadow-2xl">
            {/* Phone Top Notch & Status */}
            <div className="bg-[#f43397] px-6 pt-3 pb-2 text-white flex items-center justify-between text-xs">
              <span className="font-bold">09:41</span>
              <div className="w-20 h-4 bg-pink-900 rounded-full mx-auto" />
              <div className="flex items-center gap-1.5 font-bold">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Meesho App Bar */}
            <div className="bg-[#f43397] px-4 py-2.5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm">meesho</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Heart className="h-4 w-4" />
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>

            {/* Image Frame */}
            <div className="relative aspect-square bg-pink-50 flex items-center justify-center p-4 overflow-hidden">
              {currentDisplayImage ? (
                <img
                  src={currentDisplayImage}
                  alt={displayTitle}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <Package className="h-32 w-32 text-pink-300" />
              )}
              <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 text-white text-[10px] px-2 py-0.5 z-10 font-bold">
                {activeImageIndex + 1}/{Math.max(1, productImages.length)}
              </span>
            </div>

            {/* Content Details */}
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                  {displayTitle}
                </h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-slate-900">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-slate-400 line-through">
                    ₹{mrp.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-bold text-pink-600">{discount}% Off</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-0.5">
                    4.3 <Star className="h-2.5 w-2.5 fill-white" />
                  </span>
                  <span className="text-slate-500 font-medium">520 Ratings</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-semibold">Free Delivery</span>
                </div>
              </div>

              {/* Iconic Meesho Reseller Feature */}
              <div className="rounded-2xl border-2 border-pink-400 bg-gradient-to-br from-pink-50 to-purple-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-pink-600" />
                    <span className="font-bold text-xs text-pink-950">Resell & Earn Margin</span>
                  </div>
                  <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white">
                    ₹150 Profit
                  </span>
                </div>
                <p className="text-[11px] text-slate-700">
                  Share catalog with customers on WhatsApp. Quote customer ₹{(price + 150).toLocaleString("en-IN")} and keep the margin!
                </p>
                <button className="w-full rounded-xl bg-emerald-600 py-2 text-center text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-sm">
                  <Share2 className="h-3.5 w-3.5" /> Share Catalog on WhatsApp
                </button>
              </div>

              {/* Product Specifications */}
              <div className="space-y-1.5 text-xs border-t border-slate-200 pt-3">
                <span className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">Product Details</span>
                <p className="text-slate-600 text-[11px]"><span className="font-semibold text-slate-800">Brand:</span> {brand}</p>
                <p className="text-slate-600 text-[11px]"><span className="font-semibold text-slate-800">SKU:</span> {activeProduct?.sku}</p>
                <p className="text-slate-600 text-[11px]"><span className="font-semibold text-slate-800">Dispatch:</span> Within 1 Day</p>
              </div>
            </div>

            {/* Bottom Mobile Action Bar */}
            <div className="p-3 border-t border-slate-200 grid grid-cols-2 gap-2 bg-white">
              <button className="rounded-xl border border-pink-600 bg-white py-2.5 text-center text-xs font-bold text-pink-600">
                Add to Cart
              </button>
              <button className="rounded-xl bg-[#f43397] py-2.5 text-center text-xs font-bold text-white shadow-sm">
                Buy Now
              </button>
            </div>
          </div>
        )}

        {/* 4. WOOCOMMERCE FOCUSED VIEW */}
        {previewChannel === "WOOCOMMERCE" && (
          <div className="rounded-2xl border border-purple-200 bg-white text-slate-900 overflow-hidden shadow-2xl">
            {/* WooCommerce Header */}
            <div className="bg-[#7f54b3] text-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-purple-200" />
                <span className="font-bold text-sm tracking-wide">WordPress / WooCommerce Store</span>
              </div>
              <span className="text-xs text-purple-200">Powered by SellSync Headless Connector</span>
            </div>

            {/* Breadcrumb */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              Home / {activeProduct?.category || "Shop"} / <span className="text-slate-800 font-semibold">{activeProduct?.name}</span>
            </div>

            {/* Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-5 relative">
                <div className="border border-slate-200 rounded-xl bg-slate-50 p-6 flex items-center justify-center min-h-[280px] overflow-hidden relative">
                  {currentDisplayImage ? (
                    <img
                      src={currentDisplayImage}
                      alt={displayTitle}
                      className="max-h-[260px] w-auto object-contain transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Package className="h-28 w-28 text-purple-400" />
                  )}
                  <span className="absolute top-3 left-3 rounded-full bg-[#7f54b3] text-white text-xs font-bold px-2 py-0.5 shadow z-10">
                    Sale!
                  </span>
                </div>
              </div>

              <div className="md:col-span-7 space-y-4">
                <h3 className="text-xl font-bold text-slate-900">{displayTitle}</h3>

                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400 text-xs">
                    {"★".repeat(5)}
                  </div>
                  <span className="text-xs text-slate-500">(5 customer reviews)</span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-[#7f54b3]">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm text-slate-400 line-through">
                    ₹{mrp.toLocaleString("en-IN")}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{displayDescription}</p>

                <p className="text-xs font-bold text-emerald-700">
                  ✓ {activeProduct?.total_stock || 100} in stock
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                    <button className="px-3 py-2 bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200">-</button>
                    <span className="px-4 py-2 text-xs font-bold text-slate-800">1</span>
                    <button className="px-3 py-2 bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200">+</button>
                  </div>

                  <button className="rounded-lg bg-[#7f54b3] px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-purple-800 transition-all cursor-pointer">
                    Add to cart
                  </button>
                </div>

                <div className="border-t border-slate-200 pt-3 text-xs text-slate-500 space-y-1">
                  <p><span className="font-semibold text-slate-700">SKU:</span> {activeProduct?.sku}</p>
                  <p><span className="font-semibold text-slate-700">Category:</span> {activeProduct?.category}</p>
                  <p><span className="font-semibold text-slate-700">Tags:</span> {currentListing?.search_terms?.slice(0, 3).join(", ") || "notebook, premium"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. MYNTRA FASHION / LIFESTYLE FOCUSED VIEW */}
        {previewChannel === "MYNTRA" && (
          <div className="rounded-2xl border border-rose-200 bg-white text-slate-900 overflow-hidden shadow-2xl">
            {/* Myntra Navbar */}
            <div className="border-b border-slate-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <span className="font-extrabold text-base tracking-widest text-[#ff3e6c]">MYNTRA</span>
                <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-slate-700">
                  <span>MEN</span>
                  <span>WOMEN</span>
                  <span>KIDS</span>
                  <span>HOME & LIVING</span>
                  <span>BEAUTY</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <span>Wishlist</span>
                <span>Bag</span>
              </div>
            </div>

            {/* Myntra Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-5 bg-rose-50/50 rounded-xl border border-rose-100 p-6 flex items-center justify-center min-h-[300px] overflow-hidden">
                {currentDisplayImage ? (
                  <img
                    src={currentDisplayImage}
                    alt={displayTitle}
                    className="max-h-[280px] w-auto object-contain transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Package className="h-36 w-36 text-rose-300" />
                )}
              </div>

              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                    {brand}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{displayTitle}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-700">
                    <span>4.3 ★</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 font-normal">842 Ratings</span>
                  </div>
                </div>

                <div className="border-t border-b border-slate-200 py-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-xl font-extrabold text-slate-900">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-slate-400 line-through">
                      MRP ₹{mrp.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-bold text-rose-600">({discount}% OFF)</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">inclusive of all taxes</span>
                </div>

                {/* Size Selector */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Select Size</span>
                  <div className="flex items-center gap-2">
                    <button className="h-10 w-10 rounded-full border-2 border-[#ff3e6c] text-xs font-bold text-[#ff3e6c]">
                      Std
                    </button>
                    <button className="h-10 w-10 rounded-full border border-slate-300 text-xs font-medium text-slate-600">
                      A5
                    </button>
                    <button className="h-10 w-10 rounded-full border border-slate-300 text-xs font-medium text-slate-600">
                      A4
                    </button>
                  </div>
                </div>

                {/* Myntra Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#ff3e6c] py-3 text-xs font-bold text-white shadow-md hover:bg-rose-600 transition-all">
                    <ShoppingBag className="h-4 w-4" /> ADD TO BAG
                  </button>
                  <button className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-6 py-3 text-xs font-bold text-slate-700 hover:border-slate-800 transition-all">
                    <Heart className="h-4 w-4" /> WISHLIST
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MULTI-MARKETPLACE PUBLISH MODAL                                           */}
      {/* ========================================================================= */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Send className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Publish Listing to Marketplaces</h3>
              </div>
              <button
                onClick={() => setPublishModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Push your approved AI-optimized listing and stock for <b>{activeProduct?.name} ({activeProduct?.sku})</b> directly into connected marketplace channels.
              </p>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Select Connected Marketplaces
                </label>
                {connections.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-[#060a17] p-4 text-xs text-amber-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span>No active marketplace channels connected yet. Go to Channels to connect.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connections.map((c) => {
                      const isSelected = selectedConnectionIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedConnectionIds(selectedConnectionIds.filter((id) => id !== c.id));
                            } else {
                              setSelectedConnectionIds([...selectedConnectionIds, c.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                              ? "bg-blue-950/40 border-blue-500/60"
                              : "bg-[#060a17] border-slate-800 opacity-60"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => { }}
                              className="rounded text-blue-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-white block">{c.marketplace_name}</span>
                              <span className="text-[10px] text-slate-400 block">{c.account_name}</span>
                            </div>
                          </div>
                          <span className="rounded bg-emerald-950 border border-emerald-800 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            Active Sync
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Publish Results */}
              {publishResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Publishing Results
                  </span>
                  <div className="space-y-1.5">
                    {publishResults.map((res, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-[#060a17] p-2.5 border border-slate-800 text-xs"
                      >
                        <span className="font-semibold text-slate-200">{res.marketplace_code}</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {res.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecutePublish}
                disabled={publishing || selectedConnectionIds.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-semibold text-white shadow-lg hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Publishing across channels...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Confirm & Launch</span>
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

export default function AIStudioPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <AIStudioContent />
    </React.Suspense>
  );
}
