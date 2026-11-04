import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Boxes,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Database,
  Users,
  CreditCard,
  FileSpreadsheet,
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Platform Features</span>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Engineered for Enterprise Multi-Marketplace Control
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300">
              Discover the full suite of multi-channel tools built into SellSync AI to eliminate duplicate effort and prevent stockouts.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Boxes className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Central Product Master</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Maintain single canonical products with multi-attribute variants (Size, Colour, Material), barcodes, HSN codes, GST slab rates, and bulk Excel/CSV import capabilities.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">AI Listing Generator</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Transform base product specs into high-converting titles, bullet points, and SEO search tags strictly mapped to target marketplace taxonomies without hallucinating claims.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Atomic Stock Sync</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Prevent marketplace penalties and out-of-stock cancellations with row-locked atomic reservations and safety stock buffers: Available = On Hand - Reserved - Safety Stock.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Unified Order Dashboard</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Aggregate incoming orders across Flipkart, Meesho, Shopify, and WooCommerce. Track shipment statuses, returns, and refunds without jumping between multiple tabs.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Granular Role-Based Access</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                8 discrete roles including WORKSPACE_OWNER, PRODUCT_MANAGER, INVENTORY_MANAGER, ORDER_MANAGER, and VIEWER to safeguard operations across staff and agency contractors.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Multi-Tenant Isolation</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Strict database isolation guarantees your products, orders, sales history, and integration credentials are never exposed to other seller organizations or external tenants.
              </p>
            </div>
          </div>

          <div className="mt-20 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl hover:from-blue-500 hover:to-indigo-500 transition-all"
            >
              <span>Test All Features in 14-Day Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

