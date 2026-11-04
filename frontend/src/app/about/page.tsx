import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Boxes, Target, Shield, Users, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Our Mission</span>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              About SellSync AI
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              We empower Indian merchants, direct-to-consumer manufacturers, and digital retail agencies to thrive across all ecommerce marketplaces without operational friction.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-8 space-y-6 text-slate-300 leading-relaxed text-sm sm:text-base">
            <h2 className="text-2xl font-bold text-white">The Multi-Channel Challenge in India</h2>
            <p>
              Selling on multiple ecommerce marketplaces in India—such as Flipkart, Meesho, Myntra, AJIO, and independent Shopify stores—has historically meant juggling separate seller dashboards, disjointed inventory spreadsheets, and disparate order streams. Sellers faced severe penalties for out-of-stock cancellations and spent countless hours reformatting titles and image requirements for each platform.
            </p>
            <p>
              SellSync AI was engineered from the ground up to solve this exact problem: providing one central catalog, an intelligent AI listing studio that understands channel taxonomy, and an atomic inventory synchronization engine that prevents overselling with mathematical certainty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-800 bg-[#0B132B] p-6">
              <Target className="h-6 w-6 text-blue-400" />
              <h3 className="mt-4 text-lg font-bold text-white">Accuracy First</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                We believe AI should structure and optimize listings without ever hallucinating product specifications, materials, or safety certifications.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B132B] p-6">
              <Shield className="h-6 w-6 text-emerald-400" />
              <h3 className="mt-4 text-lg font-bold text-white">Zero Compromise Security</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Enterprise tenant isolation and encrypted credential vaults ensure your business data and sales figures remain exclusively yours.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B132B] p-6">
              <Users className="h-6 w-6 text-indigo-400" />
              <h3 className="mt-4 text-lg font-bold text-white">Seller Centric</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Every feature—from GST invoices to multi-warehouse safety stock buffers—is designed around the daily operational realities of Indian retailers.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

