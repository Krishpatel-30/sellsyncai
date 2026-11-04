"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Get in Touch</span>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Contact SellSync AI
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300">
              Our e-commerce solutions team is ready to answer questions regarding enterprise plans, custom integrations, and marketplace onboarding.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6">
                <Mail className="h-6 w-6 text-blue-400" />
                <h3 className="mt-3 text-base font-semibold text-white">Email Us</h3>
                <p className="mt-1 text-xs text-slate-400">General & Support Enquiries</p>
                <a href="mailto:support@sellsync.ai" className="mt-2 block text-sm font-medium text-blue-400 hover:underline">
                  support@sellsync.ai
                </a>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6">
                <Phone className="h-6 w-6 text-indigo-400" />
                <h3 className="mt-3 text-base font-semibold text-white">Sales & Enterprise</h3>
                <p className="mt-1 text-xs text-slate-400">Mon-Fri, 9:30 AM to 6:30 PM IST</p>
                <a href="tel:+9118001234567" className="mt-2 block text-sm font-medium text-indigo-400 hover:underline">
                  +91 (080) 4123-8899
                </a>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6">
                <MapPin className="h-6 w-6 text-emerald-400" />
                <h3 className="mt-3 text-base font-semibold text-white">Headquarters</h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  SellSync AI Technologies Pvt. Ltd.<br />
                  Indiranagar, 100 Feet Road<br />
                  Bengaluru, Karnataka 560038, India
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0B132B] p-8">
              {submitted ? (
                <div className="text-center py-16 space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Message Dispatched</h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out. A dedicated SellSync AI representative will contact you within 1 business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Sunil Rao"
                        className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                        Business Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="sunil@brand.com"
                        className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enterprise Plan Consultation / Marketplace Access"
                      className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                      Message
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Tell us about your catalogue volume, connected sales channels, and requirements..."
                      className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-500 transition-all"
                  >
                    <span>Send Inquiry</span>
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

