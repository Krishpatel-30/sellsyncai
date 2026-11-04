import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-slate-300">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Refund and Cancellation Policy</h1>
            <p className="mt-2 text-xs text-slate-400">Effective Date: November 4, 2026 | Last Updated: November 4, 2026</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-8 space-y-6 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">1. Free Trial Evaluation</h2>
              <p>
                SellSync AI provides a 14-day full-featured free trial to all new sellers. We strongly encourage customers to connect test channels, import products, and test synchronization during this trial period before purchasing a paid subscription.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">2. Subscription Cancellation</h2>
              <p>
                You may cancel your subscription at any time directly through the Billing section of your Workspace dashboard. Once cancelled, your subscription will remain active until the conclusion of your current paid billing period (monthly or annual). You will not be billed again following the cancellation date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">3. Refund Terms</h2>
              <p>
                Because SellSync AI is a digital SaaS platform with immediate cloud infrastructure and API resource allocation, subscription fees are generally non-refundable once billed. Exceptions are granted only in cases of verified billing errors, duplicate charges, or prolonged platform outages attributable entirely to SellSync AI systems.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">4. Refund Requests & Processing</h2>
              <p>
                To dispute a charge or submit a refund request based on technical billing discrepancies, email <strong>billing@sellsync.ai</strong> within 7 days of the invoice date with your Workspace ID, Razorpay payment reference, and GSTIN. Approved refunds are credited back to the original payment method within 5–7 business days.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

