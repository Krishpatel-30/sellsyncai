"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Boxes, ArrowRight, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#060a17] px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <Boxes className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            SellSync <span className="text-blue-400">AI</span>
          </span>
        </Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter your registered email and we will send you a reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B]/80 px-6 py-8 shadow-2xl backdrop-blur-xl sm:px-10">
          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Password Reset Requested</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If an account exists for <span className="text-white font-medium">{email}</span>, a secure password reset link has been dispatched.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block text-sm font-semibold text-blue-400 hover:text-blue-300"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  Business Email Address
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seller@yourbrand.com"
                    className="block w-full rounded-xl border border-slate-700 bg-[#060a17] pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 transition-all"
              >
                <span>Send Reset Link</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="text-center pt-2">
                <Link href="/login" className="text-xs text-slate-400 hover:text-slate-200">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

