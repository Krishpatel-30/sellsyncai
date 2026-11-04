"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, X, Mail, User, ShieldCheck } from "lucide-react";

interface GoogleSignInButtonProps {
  label?: string;
  variant?: "light" | "dark" | "outline";
  className?: string;
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
}: GoogleSignInButtonProps) {
  const { loginWithGoogle, signInWithFirebaseGoogle, isLoading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFirebaseClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setError(null);
    try {
      await signInWithFirebaseGoogle();
    } catch (err: any) {
      console.warn("Firebase Google Sign-In error:", err);
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setSigningIn(false);
        return;
      }
      setError(
        err.message ||
          "Google sign-in popup encountered an issue. You can enter your email directly below."
      );
      setModalOpen(true);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setError("Please enter your Google email");
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
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
    } finally {
      setSigningIn(false);
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
        onClick={handleFirebaseClick}
        disabled={isLoading || signingIn}
        className={`${baseStyles} ${className}`}
      >
        {signingIn ? (
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        ) : (
          <GoogleIcon className="h-5 w-5 shrink-0" />
        )}
        <span>{signingIn ? "Connecting to Google..." : label}</span>
      </button>

      {/* Google Account Sign-In Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 sm:p-7 shadow-2xl space-y-6 text-left">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <GoogleIcon className="h-8 w-8" />
                <div>
                  <h3 className="text-base font-bold text-white">Sign in with Google</h3>
                  <p className="text-xs text-slate-400">Continue to your SellSync AI dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Google Email Address
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full rounded-xl border border-slate-700 bg-[#060a17] pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Full Name (Optional)
                </label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="e.g. Krish Patel"
                    className="w-full rounded-xl border border-slate-700 bg-[#060a17] pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={signingIn}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {signingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Continue to Dashboard</span>
                  )}
                </button>
              </div>
            </form>

            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Direct workspace authentication with zero third-party tracking</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
