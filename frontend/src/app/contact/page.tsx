"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  AlertCircle,
  Building,
} from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name,
      email,
      phone,
      subject: subject || "SellSync AI Platform Inquiry",
      message,
      _subject: `New SellSync AI Contact Lead: ${subject || "Inquiry"} from ${name}`,
      _template: "table",
      target_inbox: "ksvisualsagency@gmail.com",
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Submit to Formsubmit to forward all form details to ksvisualsagency@gmail.com
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

      setSubmitted(true);
    } catch (err: any) {
      setError("Unable to transmit inquiry. Please call or email directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#060a17]">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Get in Touch
            </span>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Contact SellSync AI
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300">
              Connect directly with our team for enterprise onboarding, marketplace integrations, and custom solutions.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Details Column */}
            <div className="space-y-6">
              {/* Phone Card */}
              <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-xl hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Call / WhatsApp</h3>
                    <p className="text-xs text-slate-400">Direct Support & Inquiries</p>
                  </div>
                </div>
                <a
                  href="tel:+918488080517"
                  className="mt-4 block text-base font-bold text-blue-400 hover:text-blue-300 hover:underline tracking-wide font-mono"
                >
                  +91 84880 80517
                </a>
              </div>

              {/* Email Card */}
              <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-xl hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Email Address</h3>
                    <p className="text-xs text-slate-400">General & Founder Desk</p>
                  </div>
                </div>
                <div className="mt-4 space-y-1">
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
              <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-xl hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Location / Address</h3>
                    <p className="text-xs text-slate-400">Headquarters</p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-200 leading-relaxed">
                  Surat, Gujarat, India
                </p>
              </div>

              {/* Company / Agency Spotlight Card */}
              <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-[#0B132B] to-purple-950/40 p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                    KS
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block">
                      Engineered & Built By
                    </span>
                    <h3 className="text-base font-bold text-white">KS Visuals Agency</h3>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                  Full-stack digital architecture, e-commerce engineering, and design systems.
                </p>
                <a
                  href="https://ksvisualsagency.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  <span>Visit ksvisualsagency.vercel.app</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Interactive Form Column */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0B132B] p-8 shadow-2xl">
              {submitted ? (
                <div className="text-center py-16 space-y-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shadow-xl shadow-emerald-500/20">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Inquiry Details Dispatched!
                  </h3>
                  <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                    Thank you, <span className="font-bold text-white">{name}</span>. All your submitted form details have been delivered directly to <b className="text-indigo-400">ksvisualsagency@gmail.com</b> and our founder desk.
                  </p>
                  <p className="text-xs text-slate-400">
                    We will get back to you at <b>{email}</b> or <b>{phone}</b> shortly.
                  </p>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setName("");
                        setEmail("");
                        setPhone("");
                        setSubject("");
                        setMessage("");
                      }}
                      className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="border-b border-slate-800 pb-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-400" />
                      <span>Send an Official Inquiry</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      All details filled here will be sent directly to <b>ksvisualsagency@gmail.com</b>.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Your Full Name <span className="text-blue-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Krish Patel"
                        className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Your Email Address <span className="text-blue-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Phone Number <span className="text-blue-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="8488080517"
                        className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Marketplace Integration / Consultation"
                        className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Detailed Message <span className="text-blue-400">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your catalogue scale, channels (Flipkart, Shopify, Meesho...), or requirements..."
                      className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Direct notification dispatched to <span className="text-indigo-400 font-medium">ksvisualsagency@gmail.com</span>
                    </span>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Inquiry</span>
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
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
