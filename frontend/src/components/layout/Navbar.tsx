"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Boxes, ChevronDown, Menu, X, Zap } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export function Navbar() {
  const { user, activeWorkspace } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#060a17]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            SellSync <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link href="/features" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link href="/marketplaces" className="hover:text-white transition-colors">
            Marketplaces
          </Link>
          <Link href="/about" className="hover:text-white transition-colors">
            About
          </Link>
          <Link href="/contact" className="hover:text-white transition-colors">
            Contact
          </Link>
          <Link href="/faq" className="hover:text-white transition-colors">
            FAQ
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
            >
              <span>Dashboard ({activeWorkspace?.name || "Workspace"})</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <GoogleSignInButton
                label="Google Sign In"
                variant="dark"
                className="py-2 px-3 text-xs"
              />
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-300 hover:text-white px-2 py-2 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                <span>Free Trial</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#060a17] px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-300 hover:text-white"
          >
            Features
          </Link>
          <Link
            href="/marketplaces"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-300 hover:text-white"
          >
            Marketplaces
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-300 hover:text-white"
          >
            About
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-300 hover:text-white"
          >
            Contact
          </Link>
          <Link
            href="/faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-300 hover:text-white"
          >
            FAQ
          </Link>
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <GoogleSignInButton
                  label="Sign In with Google"
                  className="w-full py-2.5 text-xs"
                />
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-white"
                >
                  Log In with Email
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-semibold text-white"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

