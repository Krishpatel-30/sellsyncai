"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Pricing & Plans</span>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Predictable Pricing Built for Scaling Sellers
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300">
              Select the plan that matches your current catalogue size and channel count. Upgrade or downgrade at any time with automatic prorated billing.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="mt-8 inline-flex items-center rounded-xl border border-slate-800 bg-[#0B132B] p-1.5">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-lg px-5 py-2 text-xs font-semibold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`rounded-lg px-5 py-2 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Starter */}
            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-7 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">STARTER</h3>
                <p className="text-xs text-slate-400 mt-1">For single sellers and nascent D2C brands</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === "annual" ? "₹799" : "₹999"}
                  </span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>
                {billingCycle === "annual" && (
                  <p className="text-[11px] text-emerald-400 mt-1">Billed annually (₹9,588/yr)</p>
                )}
                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ 2 Marketplace Connections</li>
                  <li className="flex items-center gap-2">✓ Up to 500 Products</li>
                  <li className="flex items-center gap-2">✓ 2 Team Users</li>
                  <li className="flex items-center gap-2">✓ 200 AI Listing Generations/mo</li>
                  <li className="flex items-center gap-2">✓ Basic Inventory Synchronization</li>
                  <li className="flex items-center gap-2">✓ Standard Support</li>
                </ul>
              </div>
              <Link
                href="/register?plan=starter"
                className="mt-8 block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800 transition-all"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Growth */}
            <div className="rounded-2xl border-2 border-blue-500 bg-[#0F1A3A] p-7 relative flex flex-col justify-between shadow-2xl shadow-blue-600/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Most Popular
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">GROWTH</h3>
                <p className="text-xs text-slate-400 mt-1">For established sellers & expanding multi-channel brands</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === "annual" ? "₹1,999" : "₹2,499"}
                  </span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>
                {billingCycle === "annual" && (
                  <p className="text-[11px] text-emerald-400 mt-1">Billed annually (₹23,988/yr)</p>
                )}
                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2 font-medium text-white">✓ 4 Marketplace Connections</li>
                  <li className="flex items-center gap-2 font-medium text-white">✓ Up to 5,000 Products</li>
                  <li className="flex items-center gap-2">✓ 5 Team Users & RBAC</li>
                  <li className="flex items-center gap-2">✓ 1,000 AI Listing Generations/mo</li>
                  <li className="flex items-center gap-2">✓ Automated Inventory Sync</li>
                  <li className="flex items-center gap-2">✓ Unified Order Management</li>
                  <li className="flex items-center gap-2">✓ Advanced Analytics & Reporting</li>
                </ul>
              </div>
              <Link
                href="/register?plan=growth"
                className="mt-8 block w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-center text-sm font-semibold text-white shadow-lg hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-7 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">BUSINESS</h3>
                <p className="text-xs text-slate-400 mt-1">For wholesale, agencies & high catalog volume</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === "annual" ? "₹4,799" : "₹5,999"}
                  </span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>
                {billingCycle === "annual" && (
                  <p className="text-[11px] text-emerald-400 mt-1">Billed annually (₹57,588/yr)</p>
                )}
                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ 6 Marketplace Connections</li>
                  <li className="flex items-center gap-2">✓ Up to 25,000 Products</li>
                  <li className="flex items-center gap-2">✓ 15 Team Users</li>
                  <li className="flex items-center gap-2">✓ 5,000 AI Listing Generations/mo</li>
                  <li className="flex items-center gap-2">✓ High-Frequency Sync Engine</li>
                  <li className="flex items-center gap-2">✓ Priority Support & Dedicated Phone Line</li>
                </ul>
              </div>
              <Link
                href="/register?plan=business"
                className="mt-8 block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800 transition-all"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-7 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">ENTERPRISE</h3>
                <p className="text-xs text-slate-400 mt-1">For large manufacturers and brand conglomerates</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">Custom</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Tailored SLA & Custom Integrations</p>
                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Custom Products & Marketplace Limits</li>
                  <li className="flex items-center gap-2">✓ Unlimited User Accounts</li>
                  <li className="flex items-center gap-2">✓ Custom ERP / WMS Integrations</li>
                  <li className="flex items-center gap-2">✓ Dedicated Solution Architect</li>
                  <li className="flex items-center gap-2">✓ Custom SLA & 99.99% Uptime Guarantee</li>
                </ul>
              </div>
              <Link
                href="/contact?type=enterprise"
                className="mt-8 block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800 transition-all"
              >
                Speak with Enterprise Sales
              </Link>
            </div>
          </div>

          <div className="mt-14 rounded-2xl border border-slate-800 bg-[#0B132B]/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-blue-400 shrink-0" />
              <p className="text-sm text-slate-300">
                All paid plans include official GST tax invoices for Indian businesses with 18% GST Input Tax Credit (ITC) eligibility.
              </p>
            </div>
            <Link href="/contact" className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0">
              Have specific questions? Contact our sales team →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

