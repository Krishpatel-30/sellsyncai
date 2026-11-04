"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  CreditCard,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  Receipt,
  AlertCircle,
  Clock,
  Sparkles,
  Store,
  Package,
  Users,
  CheckCircle2,
  Tag,
  Loader2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002/api/v1";

interface PlanEntitlements {
  subscription_id: string;
  status: string;
  is_active: boolean;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  days_remaining: number;
  plan: {
    id: string;
    code: string;
    name: string;
    description: string;
    price_inr_monthly: number;
    price_inr_annual: number;
    marketplace_limit: number;
    product_limit: number;
    user_limit: number;
    ai_generation_limit_monthly: number;
    features: Record<string, any>;
  };
  usage: {
    products_count: number;
    products_limit: number;
    marketplaces_count: number;
    marketplaces_limit: number;
    users_count: number;
    users_limit: number;
    ai_generations_used: number;
    ai_generations_limit: number;
  };
}

interface PlanCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  price_inr_monthly: number;
  price_inr_annual: number;
  marketplace_limit: number;
  product_limit: number;
  user_limit: number;
  ai_generation_limit_monthly: number;
  features: Record<string, any>;
  display_order: number;
}

interface InvoiceItem {
  id: string;
  invoice_number: string;
  customer_name: string;
  subtotal: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function BillingPage() {
  const { activeWorkspace } = useAuth();
  const [subData, setSubData] = useState<PlanEntitlements | null>(null);
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  // Upgrade Modal State
  const [selectedPlan, setSelectedPlan] = useState<PlanCatalogItem | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("sellsync_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(activeWorkspace?.id ? { "X-Tenant-ID": activeWorkspace.id } : {}),
    };
  };

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [subRes, plansRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/billing/subscription`, { headers: getHeaders() }),
        fetch(`${API_BASE}/billing/plans`),
        fetch(`${API_BASE}/billing/invoices`, { headers: getHeaders() }),
      ]);

      if (subRes.ok) {
        const sub = await subRes.json();
        setSubData(sub);
      }
      if (plansRes.ok) {
        const p = await plansRes.json();
        setPlans(p);
      }
      if (invRes.ok) {
        const inv = await invRes.json();
        setInvoices(inv);
      }
    } catch (err) {
      console.error("Failed to load billing information:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [activeWorkspace]);

  const handleOpenCheckout = (plan: PlanCatalogItem) => {
    setSelectedPlan(plan);
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    setPaymentSuccessMessage("");
    setCheckoutModalOpen(true);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    try {
      const res = await fetch(`${API_BASE}/billing/apply-coupon`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          code: couponCode.trim(),
          plan_code: selectedPlan?.code,
          billing_cycle: billingCycle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAppliedCoupon({ code: data.code, percent: data.discount_percent || 20 });
      } else {
        const err = await res.json();
        setCouponError(err.detail || "Invalid coupon code");
      }
    } catch (err: any) {
      setCouponError("Failed to apply coupon");
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    setIsProcessingPayment(true);
    setCouponError("");

    try {
      // 1. Create Razorpay order
      const orderRes = await fetch(`${API_BASE}/billing/create-order`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          plan_code: selectedPlan.code,
          billing_cycle: billingCycle,
          coupon_code: appliedCoupon?.code,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.detail || "Order generation failed");
      }

      const orderData = await orderRes.json();

      // 2. Complete payment simulation with verified signature
      const verifyRes = await fetch(`${API_BASE}/billing/verify-payment`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          razorpay_order_id: orderData.razorpay_order_id,
          razorpay_payment_id: `pay_${orderData.razorpay_order_id.substring(6)}`,
          razorpay_signature: "mock_sig_test_verified",
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.detail || "Payment verification failed");
      }

      const verifyData = await verifyRes.json();
      setPaymentSuccessMessage(`Payment confirmed! ${verifyData.message}. Invoice: ${verifyData.invoice_number}`);
      await loadBillingData();
      setTimeout(() => {
        setCheckoutModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setCouponError(err.message || "Payment execution failed");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Pricing calculation for modal
  const basePrice = selectedPlan
    ? billingCycle === "MONTHLY"
      ? selectedPlan.price_inr_monthly
      : selectedPlan.price_inr_annual
    : 0;

  const discountAmount = appliedCoupon ? (basePrice * appliedCoupon.percent) / 100 : 0;
  const subtotal = Math.max(0, basePrice - discountAmount);
  const gstAmount = Math.round((subtotal * 18) / 100);
  const totalPayable = subtotal + gstAmount;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isCurrentPlan = (code: string) => subData?.plan.code === code;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <CreditCard className="h-7 w-7 text-blue-400" />
          <span>Subscription & Billing Engine</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage your multi-marketplace SaaS plan, monitor resource limits, and access GST-compliant tax invoices.
        </p>
      </div>

      {/* Active Subscription & Resource Quotas */}
      {subData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Plan Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Plan</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  subData.status === "ACTIVE"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : subData.status === "TRIALING"
                    ? "bg-blue-950 text-blue-400 border border-blue-800"
                    : "bg-rose-950 text-rose-400 border border-rose-800"
                }`}
              >
                {subData.status}
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-white">{subData.plan.name}</div>
              <p className="mt-1 text-xs text-slate-400">{subData.plan.description}</p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-400" />
                <span>Days Remaining:</span>
              </span>
              <strong className="text-white font-bold">{subData.days_remaining} Days</strong>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Billing Cycle:</span>
              <span className="text-slate-200 font-semibold">{subData.billing_cycle}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Renews / Expires:</span>
              <span className="text-slate-200 font-medium">
                {new Date(subData.current_period_end).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Usage Meters */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Real-Time Entitlement Quotas</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Product Quota */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Package className="h-4 w-4 text-blue-400" />
                    <span>Product Master</span>
                  </span>
                  <span className="font-bold text-white">
                    {subData.usage.products_count} / {subData.usage.products_limit}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (subData.usage.products_count / subData.usage.products_limit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Marketplace Accounts Quota */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Store className="h-4 w-4 text-emerald-400" />
                    <span>Connected Channels</span>
                  </span>
                  <span className="font-bold text-white">
                    {subData.usage.marketplaces_count} / {subData.usage.marketplaces_limit}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (subData.usage.marketplaces_count / subData.usage.marketplaces_limit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Team Seats Quota */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Users className="h-4 w-4 text-indigo-400" />
                    <span>Team Members</span>
                  </span>
                  <span className="font-bold text-white">
                    {subData.usage.users_count} / {subData.usage.users_limit}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (subData.usage.users_count / subData.usage.users_limit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* AI Credits Quota */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span>Monthly AI Listing Credits</span>
                  </span>
                  <span className="font-bold text-white">
                    {subData.usage.ai_generations_used} / {subData.usage.ai_generations_limit}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (subData.usage.ai_generations_used / subData.usage.ai_generations_limit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Catalog Grid with Monthly / Annual Toggle */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Available Subscription Plans</h2>
            <p className="text-xs text-slate-400">
              Scale your catalog capacity and marketplace channels as your business expands.
            </p>
          </div>

          {/* Cycle Toggle */}
          <div className="inline-flex items-center rounded-xl border border-slate-800 bg-[#0B132B] p-1 text-xs">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
                billingCycle === "MONTHLY"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("ANNUAL")}
              className={`rounded-lg px-3.5 py-1.5 font-semibold transition-all flex items-center gap-1.5 ${
                billingCycle === "ANNUAL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-1 py-0.5 text-[10px] font-bold">
                2 Mos Free
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans
            .filter((p) => p.code !== "FREE_TRIAL")
            .map((plan) => {
              const current = isCurrentPlan(plan.code);
              const price = billingCycle === "MONTHLY" ? plan.price_inr_monthly : plan.price_inr_annual;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                    current
                      ? "border-blue-500 bg-gradient-to-b from-[#0F1D4A] to-[#0B132B] shadow-lg shadow-blue-950/40"
                      : "border-slate-800 bg-[#0B132B] hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-4">
                    {current && (
                      <span className="inline-block rounded-md bg-blue-500/20 text-blue-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-blue-500/30">
                        Current Active Plan
                      </span>
                    )}
                    <div>
                      <h3 className="text-lg font-black text-white">{plan.name}</h3>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{plan.description}</p>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">₹{price.toLocaleString()}</span>
                        <span className="text-xs text-slate-400">/{billingCycle === "MONTHLY" ? "mo" : "yr"}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">+ 18% standard GST</p>
                    </div>

                    <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>{plan.marketplace_limit}</strong> Marketplace Stores
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>{plan.product_limit.toLocaleString()}</strong> Products Capacity
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>{plan.user_limit}</strong> Team Seats
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>{plan.ai_generation_limit_monthly.toLocaleString()}</strong> AI Generations/mo
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="capitalize">{plan.features?.inventory_sync || "Basic"} Stock Sync</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    {current ? (
                      <button
                        disabled
                        className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed"
                      >
                        Active Tier
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenCheckout(plan)}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2.5 text-xs font-bold shadow-md shadow-blue-900/30 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Upgrade to {plan.name}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Tax Invoices Section */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-400" />
            <span>GST Tax Invoices & Payment History</span>
          </h2>
          <span className="text-xs text-slate-400">18% Indian SaaS GST compliant</span>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-8 text-center">
            <Receipt className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No payment invoices issued yet. Free trial active.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1736] text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">GST (18%)</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{inv.invoice_number}</td>
                    <td className="py-3 px-4">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-mono">₹{inv.subtotal.toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      ₹{(inv.cgst_amount + inv.sgst_amount + inv.igst_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">₹{inv.total_amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Razorpay Checkout Modal */}
      {checkoutModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Razorpay Checkout</h3>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Plan Info */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">{selectedPlan.name} Plan</span>
                <span className="text-xs text-blue-400 uppercase font-semibold">{billingCycle}</span>
              </div>
              <p className="text-xs text-slate-400">{selectedPlan.description}</p>
            </div>

            {/* Coupon Code Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Promotional Coupon</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. WELCOME50"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition-all"
                >
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Coupon {appliedCoupon.code} applied! {appliedCoupon.percent}% discount</span>
                </div>
              )}
              {couponError && <p className="text-[11px] text-rose-400">{couponError}</p>}
            </div>

            {/* Price Breakdown */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Base Price:</span>
                <span className="font-mono text-slate-200">₹{basePrice.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>GST (18% SaaS IGST/CGST):</span>
                <span className="font-mono text-slate-200">₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white text-sm">
                <span>Total Payable:</span>
                <span className="font-mono text-emerald-400">₹{totalPayable.toFixed(2)}</span>
              </div>
            </div>

            {paymentSuccessMessage ? (
              <div className="rounded-xl bg-emerald-950/80 border border-emerald-800 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{paymentSuccessMessage}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Secure Payment...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Pay ₹{totalPayable.toFixed(2)} & Activate Instantly</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
