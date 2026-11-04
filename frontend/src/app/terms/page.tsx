import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-slate-300">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Terms and Conditions</h1>
            <p className="mt-2 text-xs text-slate-400">Effective Date: November 4, 2026 | Last Updated: November 4, 2026</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-8 space-y-6 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">1. Agreement to Terms</h2>
              <p>
                These Terms and Conditions constitute a legally binding agreement between you, whether personally or on behalf of an entity ("Customer", "Seller", or "you") and SellSync AI Technologies Pvt. Ltd. ("Company", "we", "us", or "our"), concerning your access to and use of the SellSync AI multi-channel e-commerce management platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">2. SaaS Subscription & Workspace Entitlements</h2>
              <p>
                Access to the SellSync AI software is granted on a subscription tier basis (Free Trial, Starter, Growth, Business, Enterprise). Each workspace is subject to technical entitlements including maximum product counts, connected marketplace accounts, team member seats, and monthly AI generation credits.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">3. Official Marketplace Integrations & API Credentials</h2>
              <p>
                Customers must connect only authorized, validly registered marketplace seller accounts. Customers are solely responsible for compliance with individual third-party marketplace terms of service (including Flipkart, Meesho, Shopify, WooCommerce, Myntra, and AJIO). We store API tokens encrypted and never harvest seller passwords.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">4. AI-Generated Content & Seller Review</h2>
              <p>
                SellSync AI provides automated listing generators powered by large language models. The seller is required to review, verify, and approve all AI-generated titles, bullet points, attributes, and descriptions before publishing to live marketplaces. The Company disclaims liability for inaccuracies, trademark infringements, or marketplace listing rejections resulting from unreviewed submissions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">5. Governing Law & Jurisdiction</h2>
              <p>
                These Terms shall be governed by and defined following the laws of India. Any disputes arising in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka, India.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

