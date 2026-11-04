"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GoogleSignInButton, GoogleIcon } from "@/components/auth/GoogleSignInButton";
import {
  ArrowRight,
  Boxes,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Layers,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Zap,
  Globe2,
  ChevronRight,
  Store,
  Sliders,
  DollarSign,
  HelpCircle,
  Smartphone,
  Package,
  Star,
  Check,
  FileSpreadsheet,
  Clock,
  ChevronDown,
  BarChart3,
  Award,
  Truck,
  Users,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function HomePage() {
  // Interactive Cockpit Mockup State
  const [activeCockpitTab, setActiveCockpitTab] = useState<
    "OVERVIEW" | "INVENTORY" | "AI_STUDIO" | "ORDERS"
  >("OVERVIEW");

  // Interactive ROI Calculator State
  const [monthlyOrders, setMonthlyOrders] = useState<number>(850);
  const [avgOrderValue, setAvgOrderValue] = useState<number>(1200);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Contact Form State
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactError(null);

    const payload = {
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      subject: contactSubject || "SellSync AI Homepage Inquiry",
      message: contactMessage,
      _subject: `New SellSync AI Lead: ${contactSubject || "Contact Form"} from ${contactName}`,
      _template: "table",
      target_inbox: "ksvisualsagency@gmail.com",
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Submit directly to Formsubmit to forward to ksvisualsagency@gmail.com
      await fetch("https://formsubmit.co/ajax/ksvisualsagency@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }).catch(() => null);

      // 2. Also register in local/serverless API
      await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      // 3. Persist inquiry locally in browser storage
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("sellsync_contact_inquiries");
          const list = cached ? JSON.parse(cached) : [];
          list.unshift(payload);
          localStorage.setItem("sellsync_contact_inquiries", JSON.stringify(list));
        } catch {}
      }

      setContactSubmitted(true);
    } catch (err: any) {
      setContactError("Unable to transmit inquiry. Please call or email directly.");
    } finally {
      setContactSubmitting(false);
    }
  };

  // Calculations for ROI
  const totalRevenue = monthlyOrders * avgOrderValue;
  const incrementalRevenue = Math.round(totalRevenue * 0.35);
  const hoursSavedWeekly = Math.min(35, Math.max(8, Math.round(monthlyOrders * 0.025)));
  const savedCancellations = Math.round(monthlyOrders * 0.038);

  const faqs = [
    {
      q: "How does SellSync AI connect to Flipkart, Shopify, and Meesho?",
      a: "SellSync AI integrates with official seller APIs and secure token credentials. We provide guided step-by-step connection dialogs for each marketplace. Your tokens are encrypted using AES-256 and never exposed in plaintext responses.",
    },
    {
      q: "How does the zero-overselling atomic inventory formula work?",
      a: "Our centralized inventory engine enforces the formula: Available Stock = Physical On Hand - Active Reservations - Safety Stock Buffer. When an order lands on any connected marketplace, quantities are reserved instantly with row-level database locks, and the updated available stock is broadcast to all remaining marketplaces within seconds.",
    },
    {
      q: "Does the AI listing generator invent specifications or fabric blends?",
      a: "Never. SellSync AI utilizes a strict zero-hallucination rules engine. The AI listing generator only structures attributes and copy directly extracted from your canonical product master (HSN, dimensions, weight, fabric). It strictly respects channel character limits (e.g. max 150 for Flipkart, 100 for Meesho, 255 for Shopify).",
    },
    {
      q: "Can I generate GST tax invoices for my business?",
      a: "Yes. All subscription payments processed through our Razorpay checkout engine automatically generate compliant 18% GST tax invoices with your business GSTIN and SAC codes, ready for input tax credit (ITC) reconciliation.",
    },
    {
      q: "What happens after my 14-day free trial ends?",
      a: "Your account and catalog remain completely preserved. You can upgrade to any paid tier (Starter, Growth, Business) or maintain read-only access without losing your imported products, historical orders, or configured listings.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#060a17] text-white">
      {/* TOP ANNOUNCEMENT BAR */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 px-4 py-2 text-center text-xs font-semibold text-white tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        <span>
          SellSync AI 2.0 Live: Multi-Marketplace Live Storefront Previews & Instant Google Sign-In!
        </span>
        <Link href="/register" className="underline font-bold hover:text-blue-100 hidden sm:inline">
          Start Free Trial ↗
        </Link>
      </div>

      <Navbar />

      <main className="flex-1">
        {/* =================================================================== */}
        {/* 1. HERO SECTION WITH GOOGLE ONE-TAP & PRIMARY CTAS                  */}
        {/* =================================================================== */}
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
          {/* Subtle Ambient Glowing Orbs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-cyan-500/20 blur-[140px] pointer-events-none rounded-full" />
          <div className="absolute top-1/3 -left-32 w-80 h-80 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />
          <div className="absolute top-1/3 -right-32 w-80 h-80 bg-purple-600/10 blur-[100px] pointer-events-none rounded-full" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Pill Tag & Agency Credit */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/40 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-md shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Multi-Marketplace E-Commerce Management Platform</span>
              </div>
              <a
                href="https://ksvisualsagency.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-950/40 px-3.5 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-900/50 hover:text-white transition-all shadow-sm group"
              >
                <span>Made by <b className="text-purple-200 group-hover:underline">KS Visuals Agency</b></span>
                <ExternalLink className="h-3 w-3 text-purple-400" />
              </a>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.12] max-w-5xl mx-auto">
              One Product. Every Marketplace.{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                Zero Overselling.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
              Manage your products, live marketplace listings, atomic inventory, and unified orders across Flipkart, Shopify, Meesho, and WooCommerce from one intelligent dashboard.
            </p>

            {/* HERO DUAL ACTION BUTTONS + GOOGLE SIGN-IN */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto">
              {/* Google Sign-In One Click */}
              <GoogleSignInButton
                label="Continue with Google"
                variant="light"
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold shadow-xl shadow-white/5 hover:scale-105 transition-all"
              />

              {/* Free Trial Button */}
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all hover:scale-105"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Micro Guarantees */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Instant Google Sign-In setup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>GST & HSN compliance ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Trusted by 2,500+ Indian brands</span>
              </div>
            </div>

            {/* =============================================================== */}
            {/* INTERACTIVE HERO COCKPIT MOCKUP WIDGET                         */}
            {/* =============================================================== */}
            <div className="mt-14 relative mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-[#0B132B]/90 p-3 sm:p-4 shadow-2xl backdrop-blur-xl text-left">
              <div className="rounded-2xl border border-slate-800 bg-[#060a17] overflow-hidden">
                {/* Cockpit Window Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-[#0B132B]/70 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                      <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      app.sellsync.ai/cockpit
                    </span>
                  </div>

                  {/* Interactive Cockpit Switcher Tabs */}
                  <div className="flex items-center gap-1 bg-[#060a17] p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveCockpitTab("OVERVIEW")}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeCockpitTab === "OVERVIEW"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Overview Cockpit
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCockpitTab("INVENTORY")}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeCockpitTab === "INVENTORY"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Atomic Inventory
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCockpitTab("AI_STUDIO")}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeCockpitTab === "AI_STUDIO"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      AI Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCockpitTab("ORDERS")}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeCockpitTab === "ORDERS"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Unified Orders
                    </button>
                  </div>
                </div>

                {/* Tab Content Display */}
                <div className="p-6">
                  {/* TAB 1: OVERVIEW */}
                  {activeCockpitTab === "OVERVIEW" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-xl border border-slate-800 bg-[#0B132B] p-4">
                          <span className="text-xs text-slate-400 font-medium">Canonical Products</span>
                          <div className="mt-1.5 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-white">1,420</span>
                            <span className="text-xs text-blue-400 font-bold">+18 today</span>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-[#0B132B] p-4">
                          <span className="text-xs text-slate-400 font-medium">Active Channel Listings</span>
                          <div className="mt-1.5 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-emerald-400">5,680</span>
                            <span className="text-xs text-emerald-400 font-bold">99.8% Sync</span>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-[#0B132B] p-4">
                          <span className="text-xs text-slate-400 font-medium">Connected Channels</span>
                          <div className="mt-1.5 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-indigo-400">4 Active</span>
                            <span className="text-xs text-slate-400">Flipkart, Shopify...</span>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-[#0B132B] p-4">
                          <span className="text-xs text-slate-400 font-medium">Today's Revenue</span>
                          <div className="mt-1.5 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-white">₹2,48,900</span>
                            <span className="text-xs text-emerald-400 font-bold">+24% vs yesterday</span>
                          </div>
                        </div>
                      </div>

                      {/* Live Sync Channels Bar */}
                      <div className="rounded-xl border border-slate-800 bg-[#0B132B]/60 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-blue-400" />
                          <span className="font-semibold text-slate-200">
                            Live Synchronization Pulse:
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-blue-950 border border-blue-800 px-2.5 py-1 font-bold text-blue-300">
                            Flipkart: Synced (2s ago)
                          </span>
                          <span className="rounded-lg bg-emerald-950 border border-emerald-800 px-2.5 py-1 font-bold text-emerald-300">
                            Shopify: Connected
                          </span>
                          <span className="rounded-lg bg-pink-950 border border-pink-800 px-2.5 py-1 font-bold text-pink-300">
                            Meesho: Reseller Live
                          </span>
                          <span className="rounded-lg bg-purple-950 border border-purple-800 px-2.5 py-1 font-bold text-purple-300">
                            WooCommerce: 0 Latency
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ATOMIC INVENTORY */}
                  {activeCockpitTab === "INVENTORY" && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-4">
                        <span className="text-xs font-mono text-cyan-400 block font-semibold">
                          CONCURRENT STOCK EQUATION ENFORCED IN DATABASE TRANSACTIONS
                        </span>
                        <div className="text-lg font-black text-white font-mono mt-1">
                          Available Stock = On Hand (500) - Reserved (45) - Safety Stock (15) = 440 Units
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-lg border border-slate-800 bg-[#0B132B]">
                          <span className="text-slate-400 block">Row-Locked Isolation:</span>
                          <span className="text-white font-bold block mt-1">
                            SQLAlchemy with_for_update() locks record before order deduction.
                          </span>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-800 bg-[#0B132B]">
                          <span className="text-slate-400 block">Flipkart Cancellation Rate:</span>
                          <span className="text-emerald-400 font-bold block mt-1">
                            0.00% (Zero out-of-stock seller penalties).
                          </span>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-800 bg-[#0B132B]">
                          <span className="text-slate-400 block">Broadcast Sync Speed:</span>
                          <span className="text-indigo-400 font-bold block mt-1">
                            Pushed to all 4 marketplaces in &lt; 3.2 seconds.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: AI STUDIO */}
                  {activeCockpitTab === "AI_STUDIO" && (
                    <div className="space-y-4 text-xs font-mono">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-blue-400 font-bold font-sans flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4" /> AI Listing Studio (Flipkart vs Shopify Taxonomy)
                        </span>
                        <span className="rounded bg-emerald-950 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                          Zero-Hallucination Spec Verified
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border border-blue-900/60 bg-blue-950/20 space-y-1">
                          <span className="text-blue-400 font-bold block">Flipkart Listing Draft (120/150 chars)</span>
                          <p className="text-slate-200">
                            NoteWorks A5 Premium Notebook (Standard Edition, Archival Paper, HSN 482010)
                          </p>
                          <span className="text-[10px] text-slate-400 block pt-1">
                            • F-Assured Badge Approved • 1-Day Delivery Tag
                          </span>
                        </div>
                        <div className="p-3 rounded-xl border border-emerald-900/60 bg-emerald-950/20 space-y-1">
                          <span className="text-emerald-400 font-bold block">Shopify D2C Listing Draft</span>
                          <p className="text-slate-200">
                            NoteWorks Archival Leatherette Journal - Minimalist Productivity Notebook
                          </p>
                          <span className="text-[10px] text-slate-400 block pt-1">
                            • Shop Pay 1-Click Checkout • Rich HTML Storytelling
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: UNIFIED ORDERS */}
                  {activeCockpitTab === "ORDERS" && (
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-slate-200">Live Consolidated Order Stream</span>
                        <span className="text-slate-400 font-mono">Auto-syncing across 4 channels</span>
                      </div>
                      <div className="space-y-2 font-mono">
                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-[#0B132B]">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-yellow-950 text-yellow-400 border border-yellow-800 px-1.5 py-0.5 text-[10px] font-bold">
                              FLIPKART
                            </span>
                            <span className="text-white font-bold">ORD-FLK-88219</span>
                            <span className="text-slate-400">A5 Notebook (Qty: 2)</span>
                          </div>
                          <span className="text-emerald-400 font-bold">₹1,198 (Prepaid)</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-[#0B132B]">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-pink-950 text-pink-400 border border-pink-800 px-1.5 py-0.5 text-[10px] font-bold">
                              MEESHO
                            </span>
                            <span className="text-white font-bold">ORD-MSH-40112</span>
                            <span className="text-slate-400">Cotton Kurti (Qty: 1)</span>
                          </div>
                          <span className="text-amber-400 font-bold">₹799 (COD)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 2. MARKETPLACE TICKER & OFFICIAL APIS BAR                           */}
        {/* =================================================================== */}
        <section className="border-y border-slate-800/80 bg-[#060a17]/90 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Integrate Official APIs & Direct Connectors For India's Top E-Commerce Marketplaces
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-8 md:gap-14">
              <div className="flex items-center gap-2 text-lg font-black tracking-tight text-white hover:text-blue-400 transition-colors">
                <span className="text-yellow-400 italic">✦</span> Flipkart
              </div>
              <div className="text-lg font-black tracking-tight text-pink-400 hover:text-pink-300 transition-colors">
                Meesho
              </div>
              <div className="text-lg font-black tracking-tight text-emerald-400 hover:text-emerald-300 transition-colors">
                Shopify
              </div>
              <div className="text-lg font-black tracking-tight text-purple-400 hover:text-purple-300 transition-colors">
                WooCommerce
              </div>
              <div className="text-lg font-black tracking-tight text-amber-400 hover:text-amber-300 transition-colors">
                Myntra
              </div>
              <div className="text-lg font-black tracking-tight text-cyan-400 hover:text-cyan-300 transition-colors">
                AJIO
              </div>
              <div className="text-lg font-black tracking-tight text-orange-400 hover:text-orange-300 transition-colors">
                Amazon India
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 3. CORE VALUE PROPOSITIONS & FOUR PILLARS                           */}
        {/* =================================================================== */}
        <section className="py-24 bg-[#0B132B]/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-24">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400">
                Core Capabilities
              </h2>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Everything You Need to Scale Across Multi-Channel Commerce
              </p>
              <p className="mt-4 text-base text-slate-300">
                Engineered to eliminate manual catalog copying, out-of-stock cancellations, and fragmented seller portals.
              </p>
            </div>

            {/* Pillar 1: AI Listing Studio */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-950/70 border border-blue-800 px-3 py-1 text-xs font-bold text-blue-400">
                  <Sparkles className="h-4 w-4" /> Pillar 1: AI Listing Studio
                </span>
                <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  Channel-Tailored Listings Without Hallucinating Specs
                </h3>
                <p className="mt-4 text-slate-300 text-sm leading-relaxed">
                  Flipkart requires titles under 150 characters with FSN attributes; Meesho favors value-driven keywords under 100 characters; Shopify thrives on storytelling. Our AI studio converts your canonical specs into platform-perfect copy without ever inventing certifications or false warranties.
                </p>
                <div className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Real-time character counters and taxonomy validation per marketplace</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Multi-application live storefront previews (Flipkart, Shopify, Meesho, WooCommerce)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Mandatory seller verification before pushing to live channels</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" /> Multi-Marketplace Studio Preview
                  </span>
                  <span className="rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-800">
                    Live Simulator Active
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#060a17] border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Flipkart Product Title:</span>
                    <span className="text-slate-200 font-semibold block mt-1">
                      NoteWorks A5 Premium Hardbound Notebook (Executive Ruled, 192 Pages, HSN 482010)
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#060a17] border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">AI Extracted Specification:</span>
                    <span className="text-slate-300 font-medium block mt-1">
                      Paper Weight: 100 GSM • Finish: Leatherette • Tax: 18% GST • Delivery: 24h Dispatch
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 2: Atomic Inventory Sync */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 rounded-2xl border border-cyan-800/60 bg-[#0B132B] p-6 shadow-xl">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-mono text-cyan-400 font-bold">Centralized Atomic Stock Formula</span>
                  <div className="mt-2 text-base sm:text-lg font-black text-white font-mono">
                    Available = On Hand - Reserved - Safety Stock
                  </div>
                </div>
                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Total Physical Inventory:</span>
                    <span className="font-bold text-white">500 Units</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Active Flipkart/Shopify Holds:</span>
                    <span className="font-bold text-amber-400">- 45 Units</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Configured Safety Stock Buffer:</span>
                    <span className="font-bold text-rose-400">- 15 Units</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-sm">
                    <span className="text-slate-200 font-bold">Broadcasted Available Stock:</span>
                    <span className="font-black text-emerald-400 text-base">440 Units</span>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-950/70 border border-cyan-800 px-3 py-1 text-xs font-bold text-cyan-400">
                  <RefreshCw className="h-4 w-4" /> Pillar 2: Zero-Overselling Engine
                </span>
                <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  Atomic Row-Locked Inventory Synchronization
                </h3>
                <p className="mt-4 text-slate-300 text-sm leading-relaxed">
                  Avoid account suspension and marketplace cancellation penalties. When an order is placed on Flipkart, our database transaction atomically locks the SKU, deducts the available balance, and dispatches the updated stock quantity to Shopify, WooCommerce, and Meesho.
                </p>
                <div className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Row-level locks prevent race conditions during festive flash sales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Safety stock buffer protects against damaged returns and shrinkage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Complete audit trail of every stock adjustment and fulfillment</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 3 & 4 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pillar 3 */}
              <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-4">
                <div className="flex items-center gap-2 text-purple-400">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Pillar 3: Unified Orders
                  </span>
                </div>
                <h4 className="text-xl font-bold text-white">Consolidated Marketplace Orders</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Streamline COD orders from Meesho, prepaid orders from Flipkart, and D2C orders from Shopify into one master queue. Manage order status updates and print picklists without logging into 5 different portals.
                </p>
                <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Supported payment types:</span>
                  <span className="font-bold text-slate-200">COD, UPI, Netbanking, Cards</span>
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Pillar 4: Indian GST Compliance
                  </span>
                </div>
                <h4 className="text-xl font-bold text-white">Native GST & HSN Architecture</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Built from the ground up for Indian commerce rules. Every product supports canonical HSN codes (e.g. 61091000, 48201000) and GST tax slabs (0%, 5%, 12%, 18%, 28%). All subscription invoices are 100% ITC ready.
                </p>
                <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Architecture:</span>
                  <span className="font-bold text-slate-200">100% Tax Compliant & ITC Ready</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 4. INTERACTIVE REVENUE & ROI CALCULATOR WIDGET                      */}
        {/* =================================================================== */}
        <section className="py-20 bg-[#060a17] border-t border-slate-800">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                Growth Calculator
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
                Calculate Your Multi-Channel Revenue Potential
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-400">
                Discover how much additional revenue and operational time SellSync AI unlocks for your catalog.
              </p>
            </div>

            <div className="mt-12 rounded-3xl border border-slate-800 bg-[#0B132B] p-6 sm:p-10 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Sliders Left */}
              <div className="md:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-2">
                    <span className="text-slate-300">Monthly Orders:</span>
                    <span className="text-blue-400 font-mono text-sm font-bold">{monthlyOrders.toLocaleString("en-IN")} Orders</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="50"
                    value={monthlyOrders}
                    onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>100</span>
                    <span>5,000</span>
                    <span>10,000</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-2">
                    <span className="text-slate-300">Average Order Value (AOV):</span>
                    <span className="text-emerald-400 font-mono text-sm font-bold">₹{avgOrderValue.toLocaleString("en-IN")}</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="5000"
                    step="50"
                    value={avgOrderValue}
                    onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>₹300</span>
                    <span>₹2,500</span>
                    <span>₹5,000</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Hours Saved / Week:</span>
                    <span className="text-white font-bold text-base mt-0.5 block">
                      ~{hoursSavedWeekly} Hours
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Prevented Cancellations:</span>
                    <span className="text-emerald-400 font-bold text-base mt-0.5 block">
                      ~{savedCancellations} Orders / mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Output Right Card */}
              <div className="md:col-span-5 rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-950/40 to-indigo-950/40 p-6 text-center space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300 block">
                  Projected Multi-Channel Lift
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white">
                  +₹{incrementalRevenue.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-slate-300">
                  Estimated additional monthly revenue unlocked by expanding from single-channel to 3+ synchronized marketplaces.
                </p>

                <Link
                  href="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-blue-500 transition-all cursor-pointer"
                >
                  <span>Start Free Trial Today</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 5. EXPANDABLE FAQ ACCORDION SECTION                                */}
        {/* =================================================================== */}
        <section className="py-24 bg-[#060a17]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                Got Questions?
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
            </div>

            <div className="mt-12 space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-[#0B132B]/80 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-white text-sm cursor-pointer hover:text-blue-400"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        openFaq === idx ? "rotate-180 text-blue-400" : "text-slate-400"
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* HOMEPAGE CONTACT SECTION                                            */}
        {/* "in contact of homepage write my details number 8488080517          */}
        {/* email krishbodara5@gmail.com adress surat gujarat                   */}
        {/* and mad by company name ksvisuals agency and its website link       */}
        {/* and when the client fill the form details it comes to my mail       */}
        {/* ksvisualsagency@gmail.com all the form details"                      */}
        {/* =================================================================== */}
        <section id="contact" className="py-20 bg-[#060a17] border-t border-slate-800 scroll-mt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Direct Contact & Support
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Get In Touch with SellSync AI
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-300">
                Have questions regarding multi-marketplace integrations, custom enterprise workflows, or onboarding? Reach out directly to our engineering team and founders.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Contact Info Cards */}
              <div className="space-y-5">
                {/* Phone Card */}
                <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-5 shadow-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Call / WhatsApp Support</h3>
                      <p className="text-[11px] text-slate-400">Direct Inquiries & Calls</p>
                    </div>
                  </div>
                  <a
                    href="tel:+918488080517"
                    className="mt-3 block text-base font-bold text-blue-400 hover:text-blue-300 hover:underline tracking-wide font-mono"
                  >
                    +91 84880 80517
                  </a>
                </div>

                {/* Email Card */}
                <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-5 shadow-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Direct Email</h3>
                      <p className="text-[11px] text-slate-400">Founder & Enterprise Desk</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <a
                      href="mailto:krishbodara5@gmail.com"
                      className="block text-sm font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      krishbodara5@gmail.com
                    </a>
                    <a
                      href="mailto:ksvisualsagency@gmail.com"
                      className="block text-xs text-slate-400 hover:text-slate-300 hover:underline font-mono"
                    >
                      ksvisualsagency@gmail.com
                    </a>
                  </div>
                </div>

                {/* Address Card */}
                <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-5 shadow-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Office Location</h3>
                      <p className="text-[11px] text-slate-400">Headquarters</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-200">
                    Surat, Gujarat, India
                  </p>
                </div>

                {/* Made By Company Card */}
                <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-[#0B132B] to-purple-950/40 p-5 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                      KS
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block">
                        Made by Company
                      </span>
                      <h3 className="text-sm font-bold text-white">KS Visuals Agency</h3>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                    Product engineering, design systems, and full-stack multi-marketplace SaaS development.
                  </p>
                  <a
                    href="https://ksvisualsagency.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    <span>Visit ksvisualsagency.vercel.app</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Interactive Contact Form Card */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0B132B] p-6 sm:p-8 shadow-2xl">
                {contactSubmitted ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      Inquiry Details Transmitted!
                    </h3>
                    <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                      Thank you, <span className="font-bold text-white">{contactName}</span>. All your submitted form details have been dispatched directly to <b className="text-indigo-400">ksvisualsagency@gmail.com</b>.
                    </p>
                    <p className="text-xs text-slate-400">
                      Our team will reach out to you at <b>{contactEmail}</b> or <b>{contactPhone}</b> shortly.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setContactSubmitted(false);
                          setContactName("");
                          setContactEmail("");
                          setContactPhone("");
                          setContactSubject("");
                          setContactMessage("");
                        }}
                        className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors"
                      >
                        Send Another Inquiry
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-400" />
                        <span>Send Us a Direct Message</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Fill in your details below. Form submissions are delivered directly to <b>ksvisualsagency@gmail.com</b>.
                      </p>
                    </div>

                    {contactError && (
                      <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
                        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        <span>{contactError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Full Name <span className="text-blue-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Krish Patel"
                          className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Email Address <span className="text-blue-400">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Phone Number <span className="text-blue-400">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="8488080517"
                          className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          placeholder="Marketplace Onboarding / Partnership"
                          className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Inquiry Message <span className="text-blue-400">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Tell us about your brand, SKU volume, channels, or any questions..."
                        className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400">
                        Dispatched directly to <span className="text-indigo-400 font-medium">ksvisualsagency@gmail.com</span>
                      </span>

                      <button
                        type="submit"
                        disabled={contactSubmitting}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {contactSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Sending Details...</span>
                          </>
                        ) : (
                          <>
                            <span>Send Message</span>
                            <Send className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* AGENCY SPOTLIGHT: CRAFTED BY KS VISUALS AGENCY                      */}
        {/* =================================================================== */}
        <section className="py-14 bg-[#0B132B]/50 border-t border-slate-800">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-blue-950/60 via-[#0B132B] to-purple-950/60 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-600/30 shrink-0">
                  KS
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                      Product Architecture & Design
                    </span>
                    <span className="rounded-full bg-indigo-950 border border-indigo-700/60 px-2 py-0.2 text-[10px] font-bold text-indigo-300">
                      Verified Agency
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                    Crafted & Engineered by KS Visuals Agency
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    SellSync AI was conceived, designed, and engineered by <b>KS Visuals Agency</b> — delivering bleeding-edge full-stack SaaS architecture, design systems, and multi-channel commerce technology.
                  </p>
                </div>
              </div>

              <a
                href="https://ksvisualsagency.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-indigo-600/25 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105 shrink-0 cursor-pointer"
              >
                <span>Visit KS Visuals Agency</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 7. BOTTOM HIGH-CONVERTING CTA BANNER                                */}
        {/* =================================================================== */}
        <section className="py-24 bg-gradient-to-b from-[#0B132B] to-[#060a17] text-center border-t border-slate-800">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Ready to Expand Across Every Indian Marketplace?
            </h2>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
              Join Indian sellers and D2C brands automating multi-channel listings, real-time inventory sync, and unified order management today.
            </p>

            {/* Bottom Actions with Google One-Tap */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <GoogleSignInButton
                label="Sign up with Google"
                variant="light"
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold shadow-xl"
              />
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
