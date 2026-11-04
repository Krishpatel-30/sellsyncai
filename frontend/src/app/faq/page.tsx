import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HelpCircle, ArrowRight } from "lucide-react";

export default function FAQPage() {
  const faqs = [
    {
      q: "What is SellSync AI and who is it designed for?",
      a: "SellSync AI is a centralized multi-channel e-commerce management SaaS engineered for Indian sellers, D2C brands, jewellery/fashion retailers, and wholesale agencies. It unifies product catalogue management, AI listing generation, atomic inventory synchronization, and unified order processing across platforms like Flipkart, Meesho, Shopify, WooCommerce, Myntra, and AJIO.",
    },
    {
      q: "Does SellSync AI use unauthorized scraping or ask for seller passwords?",
      a: "No, never. SellSync AI adheres strictly to official marketplace partner policies. We connect exclusively via authorized developer APIs (e.g. Shopify GraphQL Admin API, WooCommerce REST API v3, official Flipkart Seller API) with encrypted OAuth tokens. We never collect or store your marketplace login passwords.",
    },
    {
      q: "How does the atomic inventory engine prevent overselling?",
      a: "Our formula is Available Stock = On Hand - Reserved Stock - Safety Stock. When an order arrives from any channel, the system uses database row locking to reserve stock instantaneously. The new calculated available quantity is broadcast to all remaining marketplaces within seconds.",
    },
    {
      q: "What happens if an AI generation fails or exhausts my plan limit?",
      a: "Each subscription plan includes a designated monthly quota of AI listing generations. If your quota is reached, you can easily top up credits or upgrade to the next tier from your subscription billing dashboard without downtime.",
    },
    {
      q: "Are subscriptions refundable if I cancel?",
      a: "We offer a fully functional 14-day free trial on all plans so you can test marketplace connections and inventory synchronization before committing. If you cancel an active monthly or annual plan, your access continues until the end of the current billing cycle, per our Refund and Cancellation Policy.",
    },
    {
      q: "Are GST invoices provided for Indian tax input credit?",
      a: "Yes. Every subscription transaction processed via Razorpay generates an official tax invoice containing your registered business name, address, and GSTIN for claiming 18% Input Tax Credit (ITC).",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Knowledge Base</span>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300">
              Clear answers regarding our technology, billing policies, and marketplace connectivity.
            </p>
          </div>

          <div className="mt-14 space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6">
                <h3 className="text-lg font-bold text-white flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed pl-8">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              <span>Still have questions? Contact our dedicated support team</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

