import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-slate-300">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
            <p className="mt-2 text-xs text-slate-400">Effective Date: November 4, 2026 | Last Updated: November 4, 2026</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-8 space-y-6 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
              <p>
                We collect personal and business information that you voluntarily provide to us when registering for SellSync AI, including full name, business email, phone number, company/store name, GSTIN (Goods and Services Tax Identification Number), billing address, and marketplace API credentials.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">2. Multi-Tenant Data Isolation</h2>
              <p>
                All customer catalog data, pricing, inventory movements, customer orders, and integration logs are stored with strict multi-tenant isolation. Your business performance figures, profit margins, and supplier information are strictly private to your authorized workspace members.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">3. Security of Marketplace Tokens & Payment Data</h2>
              <p>
                Marketplace API secrets, access tokens, and webhook secrets are stored using AES-256 encryption. Payment card details and UPI transactions are handled directly by PCI-DSS Level 1 compliant payment gateways (Razorpay / Stripe) and are never stored on our application servers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">4. Data Retention and Erasure</h2>
              <p>
                Upon workspace termination or written request, customers may request complete export or deletion of their catalog and customer order records in compliance with Indian information technology regulations.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

