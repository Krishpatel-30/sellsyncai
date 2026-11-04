import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Store, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export default function MarketplacesPage() {
  const marketplaces = [
    {
      name: "Flipkart Seller API",
      type: "Official Integration",
      status: "Production Ready",
      description: "Direct official integration using approved Flipkart Seller APIs. Supports catalog listing submissions, inventory updates, and unified order sync.",
      badgeColor: "bg-blue-950 text-blue-400 border-blue-800",
    },
    {
      name: "Shopify Admin GraphQL",
      type: "Official API",
      status: "Production Ready",
      description: "Full two-way synchronization via Shopify GraphQL Admin API. Instant webhooks for order creation, refunds, and live inventory sync.",
      badgeColor: "bg-emerald-950 text-emerald-400 border-emerald-800",
    },
    {
      name: "WooCommerce REST API",
      type: "Official API",
      status: "Production Ready",
      description: "Seamless synchronization with self-hosted WooCommerce stores using REST v3. Automatic stock adjustments and order ingestion.",
      badgeColor: "bg-purple-950 text-purple-400 border-purple-800",
    },
    {
      name: "Meesho Seller Adapter",
      type: "Official Access Adapter",
      status: "Adapter Scaffolded",
      description: "Engineered connector framework ready to be activated upon authorized marketplace API credentials and seller account approval.",
      badgeColor: "bg-pink-950 text-pink-400 border-pink-800",
    },
    {
      name: "Myntra Marketplace Adapter",
      type: "Official Access Adapter",
      status: "Adapter Scaffolded",
      description: "Configured for fashion & apparel sellers with rich size/colour matrix mapping according to Myntra partner portal specifications.",
      badgeColor: "bg-amber-950 text-amber-400 border-amber-800",
    },
    {
      name: "AJIO Marketplace Adapter",
      type: "Official Access Adapter",
      status: "Adapter Scaffolded",
      description: "Enterprise connector adapter designed for Reliance AJIO seller integrations, supporting centralized fashion SKU dispatch.",
      badgeColor: "bg-cyan-950 text-cyan-400 border-cyan-800",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Supported Channels</span>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Marketplace Integrations
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300">
              SellSync AI connects only through official authorized APIs and clean partner adapters. We never use unauthorized scraping or store password harvesting.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {marketplaces.map((m, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">{m.type}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${m.badgeColor}`}>
                      {m.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">{m.name}</h3>
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed">{m.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Encrypted Credentials
                  </span>
                  <Link href="/register" className="font-semibold text-blue-400 hover:text-blue-300">
                    Connect Channel →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

