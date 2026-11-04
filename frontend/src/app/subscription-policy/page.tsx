import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function SubscriptionPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-slate-300">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Subscription Policy</h1>
            <p className="mt-2 text-xs text-slate-400">Effective Date: November 4, 2026 | Last Updated: November 4, 2026</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-8 space-y-6 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">1. Subscription Tiers & Limits</h2>
              <p>
                SellSync AI plans are priced according to resource tiers (Starter, Growth, Business, and Enterprise). Each tier specifies strict technical entitlements:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Connected Marketplace accounts (e.g. 2 for Starter, 4 for Growth, 6 for Business)</li>
                <li>Catalogue product limits (e.g. 500 for Starter, 5,000 for Growth, 25,000 for Business)</li>
                <li>Team seats and RBAC role assignments</li>
                <li>Monthly AI listing generation allowances</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">2. Automatic Renewals</h2>
              <p>
                Paid subscriptions automatically renew at the beginning of each billing cycle (monthly or annually) using the stored payment method via Razorpay Mandates or Card Auto-Debit unless cancelled prior to the renewal date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">3. Plan Upgrades & Downgrades</h2>
              <p>
                When upgrading your plan, your new entitlements take effect immediately, and the remaining unused balance of your previous plan is prorated against the upgrade price. For downgrades, changes take effect at the conclusion of your current billing cycle, provided your current catalogue and connection counts adhere to the target tier's limits.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">4. Expiration & Data Preservation</h2>
              <p>
                If a subscription lapses or expires due to a failed payment method, SellSync AI preserves your complete catalogue and sales history. Restricted actions (such as automated sync and new channel additions) are paused, and you will be presented with a renewal screen. Your products and order history are never silently deleted.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

