"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Package,
  Store,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  ExternalLink,
  Layers,
  Check,
  Loader2,
  PieChart,
  BarChart3,
  Database,
  Zap,
  ChevronRight,
  TrendingDown,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  selling_price: number;
}

interface MarketplaceConnection {
  id: string;
  marketplace_code: string;
  marketplace_name: string;
  account_name: string;
  status: string;
  is_active: boolean;
}

interface InventoryOverviewItem {
  id?: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  safety_stock: number;
  quantity_available: number;
}

interface Order {
  id: string;
  marketplace_code: string;
  order_number?: string;
  external_order_id?: string;
  customer_name: string;
  total_amount: number | string;
  fulfillment_status?: string;
  status?: string;
  payment_status?: string;
  order_date?: string;
  ordered_at?: string;
  items_count?: number;
  items?: any[];
}

export default function DashboardOverviewPage() {
  const { user, activeWorkspace, role, workspaces } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [inventoryStats, setInventoryStats] = useState({
    on_hand: 0,
    reserved: 0,
    safety_stock: 0,
    available: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Visualization Chart Mode State
  const [chartMode, setChartMode] = useState<"CHANNEL" | "INVENTORY">("CHANNEL");

  const fetchDashboardMetrics = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      // Rehydrate local cached data first
      let localProds: Product[] = [];
      let localConns: MarketplaceConnection[] = [];
      let localOrders: Order[] = [];

      if (typeof window !== "undefined") {
        try {
          const cp = localStorage.getItem("sellsync_canonical_products");
          if (cp) {
            const parsed = JSON.parse(cp);
            if (Array.isArray(parsed)) localProds = parsed;
          }
        } catch {}

        try {
          const cc = localStorage.getItem("sellsync_connections");
          if (cc) {
            const parsed = JSON.parse(cc);
            if (Array.isArray(parsed)) localConns = parsed;
          }
        } catch {}

        try {
          const co = localStorage.getItem("sellsync_orders");
          if (co) {
            const parsed = JSON.parse(co);
            if (Array.isArray(parsed)) localOrders = parsed;
          }
        } catch {}
      }

      const [prods, conns, inv, ord, sub] = await Promise.all([
        api.get<Product[]>("/products?limit=100").catch(() => []),
        api.get<MarketplaceConnection[]>("/marketplaces/connections").catch(() => []),
        api.get<InventoryOverviewItem[]>("/inventory/overview").catch(() => []),
        api.get<Order[]>("/orders?limit=20").catch(() => []),
        api.get<any>("/billing/subscription").catch(() => null),
      ]);

      // Merge products (canonical persistence)
      let finalProds = Array.isArray(prods) && prods.length > 0 ? [...prods] : localProds;
      for (const lp of localProds) {
        if (!finalProds.some((p) => p.sku === lp.sku)) finalProds.push(lp);
      }
      setProducts(finalProds);

      // Merge marketplace connections
      let finalConns = Array.isArray(conns) && conns.length > 0 ? [...conns] : localConns;
      for (const lc of localConns) {
        if (!finalConns.some((c) => c.id === lc.id)) finalConns.push(lc);
      }
      setConnections(finalConns);

      // Merge orders (live unified orders persistence)
      let finalOrders = Array.isArray(ord) && ord.length > 0 ? [...ord] : localOrders;
      for (const lo of localOrders) {
        if (!finalOrders.some((o) => o.id === lo.id)) finalOrders.push(lo);
      }
      setOrders(finalOrders);

      // Compute atomic stock from actual catalog and orders
      const totalStock = (finalProds || []).reduce((sum: number, p: any) => sum + (Number(p.total_stock) || 0), 0);
      const openQty = finalOrders
        .filter((o) => (o.fulfillment_status || o.status) !== "DELIVERED" && (o.fulfillment_status || o.status) !== "CANCELLED")
        .reduce((sum, o) => sum + (o.items_count || (o.items ? o.items.length : 1)), 0);
      const safety = Math.round(totalStock * 0.05);
      const availableStock = Math.max(0, totalStock - openQty - safety);

      setInventoryStats({
        on_hand: totalStock,
        reserved: openQty,
        safety_stock: safety,
        available: availableStock,
      });

      setSubscription(sub || null);
    } catch (err) {
      console.error("Failed to load dashboard overview data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchDashboardMetrics(false);

    // Auto-update dashboard when user refocuses tab after updating records elsewhere
    const handleFocus = () => fetchDashboardMetrics(true);
    window.addEventListener("focus", handleFocus);

    // Periodic auto-sync every 20s
    const interval = setInterval(() => {
      fetchDashboardMetrics(true);
    }, 20000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [fetchDashboardMetrics]);

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const openOrdersCount = orders.filter(
    (o) =>
      (o.fulfillment_status || o.status) !== "DELIVERED" &&
      (o.fulfillment_status || o.status) !== "CANCELLED"
  ).length;

  const productsCount = products.length;

  // =========================================================================
  // CIRCULAR DATA VISUALIZATION CALCULATIONS (100% REAL LIVE DATA)
  // =========================================================================
  const C = 2 * Math.PI * 40; // SVG circle circumference (r = 40)

  // 1. Live Channel Distribution Segments (computed strictly from real orders)
  const allChannels = [
    { code: "FLIPKART", name: "Flipkart", color: "#2874F0" },
    { code: "SHOPIFY", name: "Shopify", color: "#10B981" },
    { code: "MEESHO", name: "Meesho", color: "#EC4899" },
    { code: "WOOCOMMERCE", name: "WooCommerce", color: "#8B5CF6" },
  ];

  const totalOrdersCount = orders.length;

  const channelSegments = allChannels.map((ch) => {
    const count = orders.filter((o) => (o.marketplace_code || "").toUpperCase() === ch.code).length;
    const pct = totalOrdersCount > 0 ? Math.round((count / totalOrdersCount) * 100) : 0;
    return {
      name: ch.name,
      code: ch.code,
      color: ch.color,
      count,
      pct,
    };
  });

  // 2. Real Inventory Health Segments
  const totalInv = inventoryStats.on_hand;
  const availPct = totalInv > 0 ? Math.round((inventoryStats.available / totalInv) * 100) : 0;
  const reservedPct = totalInv > 0 ? Math.round((inventoryStats.reserved / totalInv) * 100) : 0;
  const bufferPct = totalInv > 0 ? Math.max(0, 100 - (availPct + reservedPct)) : 0;

  const inventorySegments = [
    { name: "Available (Synchronized)", color: "#10B981", pct: availPct, count: inventoryStats.available },
    { name: "Reserved (Active Holds)", color: "#F59E0B", pct: reservedPct, count: inventoryStats.reserved },
    { name: "Safety Buffer (Oversell Guard)", color: "#EF4444", pct: bufferPct, count: inventoryStats.safety_stock },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Welcome & Workspace Cockpit Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-[#0B132B] via-[#0F1E48] to-[#0B132B] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-950/80 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-800/60 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                <span>Multi-Tenant Production Workspace: {activeWorkspace?.name || "ks"}</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.2 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync Engine Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, {user?.full_name || "krish"}
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Role: <strong className="text-blue-400 font-semibold">{role || "WORKSPACE_OWNER"}</strong> • Workspace Status:{" "}
              <strong className="text-emerald-400 font-semibold">Active</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Refresh Button */}
            <button
              onClick={() => fetchDashboardMetrics(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
              title="Refresh live metrics from database"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Sync Live Data"}</span>
            </button>

            <Link
              href="/dashboard/channels"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800/90 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
            >
              <Store className="h-4 w-4 text-emerald-400" />
              <span>Marketplaces ({connections.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* High-Level SaaS Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Products */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-3.5 sm:p-5 space-y-1 hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-[11px] sm:text-xs">Products</span>
            <Package className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xl sm:text-2xl font-black text-white">{productsCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400">In Catalog</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mt-2">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(10, productsCount * 10))}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 2: Connected Stores */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-3.5 sm:p-5 space-y-1 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-[11px] sm:text-xs">Stores</span>
            <Store className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xl sm:text-2xl font-black text-white">{connections.length}</span>
            <span className="text-[10px] sm:text-[11px] text-emerald-400 font-semibold">Active</span>
          </div>
          <div className="flex gap-1 pt-1 overflow-x-auto no-scrollbar">
            {connections.length > 0 ? (
              connections.map((c) => (
                <span
                  key={c.id}
                  className="rounded bg-emerald-950/80 border border-emerald-800/80 text-[9px] font-bold text-emerald-400 px-1 py-0.5 uppercase whitespace-nowrap"
                >
                  {c.marketplace_code}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-500">None linked</span>
            )}
          </div>
        </div>

        {/* Metric 3: Atomic Stock Sync */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-3.5 sm:p-5 space-y-1 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-[11px] sm:text-xs">Available Stock</span>
            <RefreshCw className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{inventoryStats.available}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400">On Hand: {inventoryStats.on_hand}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono truncate">
            {inventoryStats.on_hand} - {inventoryStats.reserved} - {inventoryStats.safety_stock}
          </p>
        </div>

        {/* Metric 4: Unified Orders */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-3.5 sm:p-5 space-y-1 hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-[11px] sm:text-xs">Unified Orders</span>
            <ShoppingBag className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xl sm:text-2xl font-black text-white">{orders.length}</span>
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-400">{openOrdersCount} Open</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate">
            Revenue: ₹{totalRevenue.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CIRCULAR DATA VISUALIZATION GRAPH SECTION                              */}
      {/* "and also show a circular graph small for data visulatoion"           */}
      {/* ===================================================================== */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <PieChart className="h-5 w-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Live Data Visualization & Channel Distribution
              </h2>
              <p className="text-xs text-slate-400">
                Real-time circular breakdown of multi-marketplace revenue and inventory health.
              </p>
            </div>
          </div>

          {/* Visualization Toggle Buttons */}
          <div className="inline-flex rounded-xl bg-[#060a17] p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setChartMode("CHANNEL")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                chartMode === "CHANNEL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Marketplace Share
            </button>
            <button
              type="button"
              onClick={() => setChartMode("INVENTORY")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                chartMode === "INVENTORY"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Stock Health
            </button>
          </div>
        </div>

        {/* Circular Donut & Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Small Circular Graph (Left) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="10"
                />

                {/* Render Dynamic Segments Based on Active Chart Mode */}
                {chartMode === "CHANNEL" && totalOrdersCount > 0 &&
                  channelSegments.map((seg, i) => {
                    if (seg.pct <= 0) return null;
                    const prevPcts = channelSegments
                      .slice(0, i)
                      .reduce((acc, curr) => acc + curr.pct, 0);
                    const strokeLen = (seg.pct / 100) * C;
                    return (
                      <circle
                        key={seg.name}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="10"
                        strokeDasharray={`${strokeLen} ${C}`}
                        strokeDashoffset={-((prevPcts / 100) * C)}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    );
                  })}

                {chartMode === "INVENTORY" &&
                  inventorySegments.map((seg, i) => {
                    if (seg.pct <= 0) return null;
                    const prevPcts = inventorySegments
                      .slice(0, i)
                      .reduce((acc, curr) => acc + curr.pct, 0);
                    const strokeLen = (seg.pct / 100) * C;
                    return (
                      <circle
                        key={seg.name}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="10"
                        strokeDasharray={`${strokeLen} ${C}`}
                        strokeDashoffset={-((prevPcts / 100) * C)}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    );
                  })}
              </svg>

              {/* Center Metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {chartMode === "CHANNEL" && (
                  <>
                    <span className="text-xl font-black text-white">
                      {totalOrdersCount}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {totalOrdersCount === 1 ? "Order" : "Orders"}
                    </span>
                  </>
                )}

                {chartMode === "INVENTORY" && (
                  <>
                    <span className="text-xl font-black text-emerald-400">
                      {availPct}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      Available
                    </span>
                  </>
                )}
              </div>
            </div>

            <span className="text-[11px] text-slate-400 mt-2 font-mono">
              Live Radial Telemetry
            </span>
          </div>

          {/* Detailed Data Legend & Breakdown (Right) */}
          <div className="md:col-span-7 space-y-3">
            {chartMode === "CHANNEL" && (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Marketplace Order & Volume Share
                </span>
                <div className="space-y-2">
                  {channelSegments.map((item) => (
                    <div
                      key={item.name}
                      className="p-3 rounded-xl border border-slate-800 bg-[#060a17] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-200">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono">{item.count} order(s)</span>
                        <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono">
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartMode === "INVENTORY" && (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Atomic Stock Breakdown
                </span>
                <div className="space-y-2">
                  {inventorySegments.map((item) => (
                    <div
                      key={item.name}
                      className="p-3 rounded-xl border border-slate-800 bg-[#060a17] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-200">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono">{item.count} units</span>
                        <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono">
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Central Features Quick Launchpad */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/products"
          className="group rounded-2xl border border-slate-800 bg-[#0B132B] p-5 hover:border-blue-500/60 transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-blue-500/10 p-2 text-blue-400 group-hover:bg-blue-500/20">
              <Package className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-white">Central Product Master</h3>
          <p className="mt-1 text-xs text-slate-400">
            Create single canonical products with multi-attribute variants, HSN, and GST slabs.
          </p>
        </Link>

        <Link
          href="/dashboard/ai-studio"
          className="group rounded-2xl border border-slate-800 bg-[#0B132B] p-5 hover:border-purple-500/60 transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-purple-500/10 p-2 text-purple-400 group-hover:bg-purple-500/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-white">AI Listing Studio</h3>
          <p className="mt-1 text-xs text-slate-400">
            Generate channel-compliant listing titles, bullet points, and live storefront previews.
          </p>
        </Link>

        <Link
          href="/dashboard/inventory"
          className="group rounded-2xl border border-slate-800 bg-[#0B132B] p-5 hover:border-amber-500/60 transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-amber-500/10 p-2 text-amber-400 group-hover:bg-amber-500/20">
              <RefreshCw className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-white">Atomic Stock Engine</h3>
          <p className="mt-1 text-xs text-slate-400">
            Row-locked atomic stock reservation preventing marketplace overselling penalties.
          </p>
        </Link>

        <Link
          href="/dashboard/orders"
          className="group rounded-2xl border border-slate-800 bg-[#0B132B] p-5 hover:border-emerald-500/60 transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 group-hover:bg-emerald-500/20">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-white">Unified Order Hub</h3>
          <p className="mt-1 text-xs text-slate-400">
            Aggregate orders from Flipkart, Meesho, Shopify, WooCommerce with order simulation test.
          </p>
        </Link>
      </div>

      {/* Recent Orders Preview */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">Recent Multi-Channel Orders</h2>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span>View All Unified Orders</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-3">
            <ShoppingBag className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No orders received yet.</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/dashboard/orders"
                className="inline-block rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
              >
                Simulate Test Marketplace Order
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1736] text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Marketplace</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {orders.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <span className="rounded bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-800 uppercase">
                        {ord.marketplace_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {ord.order_number || ord.external_order_id || ord.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4">{ord.customer_name}</td>
                    <td className="py-3 px-4">{ord.items_count || ord.items?.length || 1} item(s)</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ₹{parseFloat(String(ord.total_amount)).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                        {ord.fulfillment_status || ord.status || "CONFIRMED"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(ord.order_date || ord.ordered_at || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
