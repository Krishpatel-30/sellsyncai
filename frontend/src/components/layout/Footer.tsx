import React from "react";
import Link from "next/link";
import { Boxes, ShieldCheck, Mail, MapPin, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#060a17] text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md">
                <Boxes className="h-4 w-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                SellSync <span className="text-blue-400">AI</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              One Product. Every Marketplace. One Dashboard. Empowering Indian sellers, D2C brands, and retail agencies to synchronize inventory, automate AI listings, and manage unified orders across Flipkart, Meesho, Shopify, WooCommerce, Myntra, and AJIO.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Enterprise-Grade Encryption & Isolated Multi-Tenant Architecture</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Platform</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/features" className="hover:text-white transition-colors">Features</Link>
              </li>
              <li>
                <Link href="/marketplaces" className="hover:text-white transition-colors">Marketplaces</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">Pricing & Plans</Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">Start 14-Day Trial</Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Company</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
              </li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Legal & Policies</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition-colors">Refund & Cancellation</Link>
              </li>
              <li>
                <Link href="/subscription-policy" className="hover:text-white transition-colors">Subscription Policy</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SellSync AI Technologies Pvt. Ltd. All rights reserved.</p>
          <p className="mt-4 sm:mt-0">Designed & Engineered for Multi-Channel E-commerce in India.</p>
        </div>
      </div>
    </footer>
  );
}

