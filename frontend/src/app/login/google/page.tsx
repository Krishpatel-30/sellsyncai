"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Boxes, ArrowRight, Mail, User, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { GoogleIcon } from "@/components/auth/GoogleSignInButton";

export default function GoogleAuthPage() {
  const { loginWithGoogle, signInWithFirebaseGoogle, isLoading } = useAuth();
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFirebaseOneClick = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithFirebaseGoogle();
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setSigningIn(false);
        return;
      }
      setError(err.message || "Google popup sign-in encountered an issue. You can continue below with your Google email.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setError("Please enter your Google account email address.");
      return;
    }

    setSigningIn(true);
    setError(null);
    try {
      const cleanEmail = googleEmail.trim().toLowerCase();
      const cleanName = googleName.trim() || cleanEmail.split("@")[0].replace(".", " ").replace(/\b\w/g, (c) => c.toUpperCase());
      await loginWithGoogle({
        email: cleanEmail,
        full_name: cleanName,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      });
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google. Please check your credentials.");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#060a17] px-4 py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
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
          Google Workspace Sign-In
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in or create your multi-marketplace workspace with Google
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B]/90 px-6 py-8 shadow-2xl backdrop-blur-xl sm:px-10 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Option A: 1-Click Firebase Popup Button */}
          <div>
            <button
              type="button"
              onClick={handleFirebaseOneClick}
              disabled={isLoading || signingIn}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-md hover:bg-slate-100 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : (
                <GoogleIcon className="h-5 w-5 shrink-0" />
              )}
              <span>{signingIn ? "Connecting with Google..." : "One-Click Google Sign-In"}</span>
            </button>

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/80" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0B132B] px-3 text-slate-400 font-semibold tracking-wider">
                  Or enter your Google email
                </span>
              </div>
            </div>
          </div>

          {/* Option B: Direct Google Email Form */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Google Email Address
              </label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="seller@gmail.com"
                  className="block w-full rounded-xl border border-slate-700 bg-[#060a17] pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Full Name (Optional)
              </label>
              <div className="relative mt-2">
                <User className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="e.g. Krish Patel"
                  className="block w-full rounded-xl border border-slate-700 bg-[#060a17] pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || signingIn}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {signingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & Return Links */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">
              ← Standard Email Login
            </Link>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>SSL Protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
