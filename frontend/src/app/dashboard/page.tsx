"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
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
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002/api/v1";

export default function DashboardOverviewPage() {
  const { user, activeWorkspace, role, workspaces } = useAuth();

  const [productsCount, setProductsCount] = useState(0);
  const [connections, setConnections] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState({
    on_hand: 0,
    reserved: 0,
    safety_stock: 0,
    available: 0,
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => {
    const token = localStorage.getItem("sellsync_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(activeWorkspace?.id ? { "X-Tenant-ID": activeWorkspace.id } : {}),
    };
  };

  useEffect(() => {
    async function fetchDashboardMetrics() {
      try {
        setLoading(true);
        const headers = getHeaders();

        const [prodRes, connRes, invRes, ordRes, subRes] = await Promise.all([
          fetch(`${API_BASE}/products?limit=100`, { headers }),
          fetch(`${API_BASE}/marketplaces/connections`, { headers }),
          fetch(`${API_BASE}/inventory/overview`, { headers }),
          fetch(`${API_BASE}/orders?limit=10`, { headers }),
          fetch(`${API_BASE}/billing/subscription`, { headers }),
        ]);

        if (prodRes.ok) {
          const prods = await prodRes.json();
          setProductsCount(prods.length);
        }
        if (connRes.ok) {
          const conns = await connRes.json();
          setConnections(conns);
        }
        if (invRes.ok) {
          const inv = await invRes.json();
          let oh = 0, res = 0, ss = 0, av = 0;
          inv.forEach((item: any) => {
            oh += item.quantity_on_hand || 0;
            res += item.quantity_reserved || 0;
            ss += item.safety_stock || 0;
            av += item.quantity_available || 0;
          });
          setInventoryStats({ on_hand: oh, reserved: res, safety_stock: ss, available: av });
        }
        if (ordRes.ok) {
          const ord = await ordRes.json();
          setOrders(ord);
        }
        if (subRes.ok) {
          const sub = await subRes.json();
          setSubscription(sub);
        }
      } catch (err) {
        console.error("Failed to load dashboard overview data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardMetrics();
  }, [activeWorkspace]);

  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const openOrdersCount = orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-[#0B132B] via-[#0F1E48] to-[#0B132B] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-950/80 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-800/60 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>Multi-Tenant Production Workspace: {activeWorkspace?.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, {user?.full_name}
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Role: <strong className="text-blue-400 font-semibold">{role}</strong> • Entitlement Tier:{" "}
              <strong className="text-emerald-400 font-semibold">
                {subscription?.plan?.name || "Free Trial"}
              </strong>{" "}
              ({subscription?.days_remaining || 14} days remaining)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/channels"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
            >
              <Store className="h-4 w-4 text-emerald-400" />
              <span>Marketplaces ({connections.length})</span>
            </Link>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-900/30 hover:from-blue-500 hover:to-indigo-500 transition-all"
            >
              <CreditCard className="h-4 w-4" />
              <span>Manage Billing</span>
            </Link>
          </div>
        </div>
      </div>

      {/* High-Level SaaS Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Products */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Canonical Products</span>
            <Package className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black text-white">{productsCount}</span>
            <span className="text-[11px] text-slate-400">
              Max: {subscription?.usage?.products_limit || 25}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mt-2">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (productsCount / (subscription?.usage?.products_limit || 25)) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 2: Connected Stores */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Connected Stores</span>
            <Store className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black text-white">{connections.length}</span>
            <span className="text-[11px] text-slate-400">
              Max: {subscription?.usage?.marketplaces_limit || 1}
            </span>
          </div>
          <div className="flex gap-1.5 pt-1 overflow-x-auto">
            {connections.length > 0 ? (
              connections.map((c) => (
                <span
                  key={c.id}
                  className="rounded bg-emerald-950/80 border border-emerald-800/80 text-[10px] font-bold text-emerald-400 px-1.5 py-0.5 uppercase"
                >
                  {c.marketplace_code}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-500">No channels linked</span>
            )}
          </div>
        </div>

        {/* Metric 3: Atomic Stock Sync */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Atomic Stock Available</span>
            <RefreshCw className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black text-emerald-400">{inventoryStats.available}</span>
            <span className="text-[11px] text-slate-400">On Hand: {inventoryStats.on_hand}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Avail = {inventoryStats.on_hand} - {inventoryStats.reserved} - {inventoryStats.safety_stock}
          </p>
        </div>

        {/* Metric 4: Unified Orders */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Unified Orders</span>
            <ShoppingBag className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black text-white">{orders.length}</span>
            <span className="text-[11px] font-bold text-amber-400">{openOrdersCount} Open</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Total Revenue: ₹{totalRevenue.toLocaleString()}
          </p>
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
            Generate channel-compliant listing titles, bullet points, and taxonomy tags with zero hallucination.
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
            <Link
              href="/dashboard/orders"
              className="inline-block rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Simulate Test Marketplace Order
            </Link>
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
                      <span className="rounded bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-800">
                        {ord.marketplace_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">{ord.marketplace_order_id}</td>
                    <td className="py-3 px-4">{ord.customer_name}</td>
                    <td className="py-3 px-4">{ord.items?.length || 1} item(s)</td>
                    <td className="py-3 px-4 font-mono font-bold">₹{parseFloat(ord.total_amount).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(ord.ordered_at).toLocaleString()}
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
