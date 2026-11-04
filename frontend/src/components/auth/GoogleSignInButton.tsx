"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, X, Check, Mail, User, ShieldCheck } from "lucide-react";

interface GoogleSignInButtonProps {
  label?: string;
  variant?: "light" | "dark" | "outline";
  className?: string;
  showAccountChooser?: boolean;
}

export function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  label = "Continue with Google",
  variant = "light",
  className = "",
  showAccountChooser = true,
}: GoogleSignInButtonProps) {
  const { loginWithGoogle, isLoading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleQuickLogin = async (email: string, name: string) => {
    setSigningIn(true);
    try {
      await loginWithGoogle({
        email,
        full_name: name,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      });
      setModalOpen(false);
    } catch (err) {
      console.error("Google sign in failed:", err);
    } finally {
      setSigningIn(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (showAccountChooser) {
      setModalOpen(true);
    } else {
      handleQuickLogin("seller.google@sellsync.ai", "Google Seller");
    }
  };

  let baseStyles =
    "inline-flex items-center justify-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold transition-all shadow-md active:scale-[0.99] cursor-pointer";

  if (variant === "light") {
    baseStyles += " bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-slate-900/5";
  } else if (variant === "dark") {
    baseStyles += " bg-[#0B132B] text-white hover:bg-slate-900 border border-slate-700 shadow-slate-950/20";
  } else {
    baseStyles += " bg-slate-900/60 text-white hover:bg-slate-800/80 border border-slate-700 backdrop-blur-md";
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || signingIn}
        className={`${baseStyles} ${className}`}
      >
        {signingIn ? (
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        ) : (
          <GoogleIcon className="h-5 w-5 shrink-0" />
        )}
        <span>{signingIn ? "Signing in with Google..." : label}</span>
      </button>

      {/* Google Account Chooser Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl space-y-6 text-left">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <GoogleIcon className="h-7 w-7" />
                <div>
                  <h3 className="text-base font-bold text-white">Sign in with Google</h3>
                  <p className="text-xs text-slate-400">Choose an account to continue to SellSync AI</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Profile Choices */}
            {!showCustomInput ? (
              <div className="space-y-2.5">
                {/* Account 1: Krish */}
                <div
                  onClick={() => handleQuickLogin("krish.seller@gmail.com", "Krish (Google Account)")}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-[#060a17] hover:border-blue-500/50 hover:bg-blue-950/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                      K
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block group-hover:text-blue-400">
                        Krish (Google Account)
                      </span>
                      <span className="text-[11px] text-slate-400 block">krish.seller@gmail.com</span>
                    </div>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>

                {/* Account 2: Rajesh Enterprises */}
                <div
                  onClick={() => handleQuickLogin("rajesh.enterprises@gmail.com", "Rajesh Enterprises")}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-[#060a17] hover:border-blue-500/50 hover:bg-blue-950/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow">
                      R
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block group-hover:text-blue-400">
                        Rajesh Enterprises
                      </span>
                      <span className="text-[11px] text-slate-400 block">rajesh.enterprises@gmail.com</span>
                    </div>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>

                {/* Account 3: Demo Seller */}
                <div
                  onClick={() => handleQuickLogin("demo_seller@sellsync.ai", "Kavita Retail Store (Google)")}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-[#060a17] hover:border-blue-500/50 hover:bg-blue-950/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                      S
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block group-hover:text-blue-400">
                        Kavita Retail Store
                      </span>
                      <span className="text-[11px] text-slate-400 block">demo_seller@sellsync.ai</span>
                    </div>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>

                {/* Custom Account Option */}
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full text-center py-2 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  + Use another Google account
                </button>
              </div>
            ) : (
              /* Custom Google Email Form */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customEmail) {
                    handleQuickLogin(customEmail, customName || customEmail.split("@")[0]);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Google Email Address
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full rounded-xl border border-slate-700 bg-[#060a17] pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Full Name (Optional)
                  </label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Krish Sharma"
                      className="w-full rounded-xl border border-slate-700 bg-[#060a17] pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Back to accounts
                  </button>
                  <button
                    type="submit"
                    disabled={signingIn}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-all cursor-pointer shadow-md"
                  >
                    {signingIn ? "Signing in..." : "Continue with this account"}
                  </button>
                </div>
              </form>
            )}

            {/* Micro disclaimer */}
            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-500 text-center">
              To continue, Google will share your name, email address, and profile picture with SellSync AI.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

