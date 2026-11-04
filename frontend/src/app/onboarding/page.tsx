"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Building2,
  FileText,
  Layers,
  CreditCard,
  Store,
  Package,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002/api/v1";

const BUSINESS_CATEGORIES = [
  { id: "apparel", name: "Fashion & Apparel", desc: "Clothing, ethnic wear, athleisure" },
  { id: "jewellery", name: "Jewellery & Accessories", desc: "Precious, imitation, and lifestyle accessories" },
  { id: "footwear", name: "Footwear", desc: "Shoes, sandals, athletic footwear" },
  { id: "electronics", name: "Electronics & Gadgets", desc: "Audio, mobile accessories, smart appliances" },
  { id: "home_kitchen", name: "Home & Kitchen", desc: "Cookware, home decor, furnishings" },
  { id: "beauty", name: "Beauty & Personal Care", desc: "Skincare, cosmetics, wellness" },
];

const ONBOARDING_PLANS = [
  {
    code: "FREE_TRIAL",
    name: "14-Day Free Trial",
    price: "₹0",
    features: ["1 Marketplace Store", "25 Canonical Products", "15 AI Listing Credits", "Atomic Stock Engine"],
  },
  {
    code: "STARTER",
    name: "Starter Tier",
    price: "₹999/mo",
    features: ["2 Marketplace Stores", "500 Products", "200 AI Listing Credits", "Basic Stock Sync"],
  },
  {
    code: "GROWTH",
    name: "Growth Tier (Recommended)",
    price: "₹2,499/mo",
    features: ["4 Marketplace Stores", "5,000 Products", "1,000 AI Listing Credits", "Automated Sync"],
  },
];

export default function OnboardingWizardPage() {
  const router = useRouter();
  const { user, activeWorkspace, switchWorkspace } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name || "");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState("D2C");
  const [selectedCategory, setSelectedCategory] = useState("apparel");
  const [selectedPlan, setSelectedPlan] = useState("FREE_TRIAL");

  // Step 5: Marketplace
  const [connectMarketplace, setConnectMarketplace] = useState("NONE");
  const [marketplaceAccountName, setMarketplaceAccountName] = useState("");
  const [marketplaceStoreUrl, setMarketplaceStoreUrl] = useState("");
  const [marketplaceApiKey, setMarketplaceApiKey] = useState("");

  // Step 6: First Product
  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productMrp, setProductMrp] = useState("1999");
  const [productPrice, setProductPrice] = useState("999");
  const [productStock, setProductStock] = useState("50");

  const getHeaders = () => {
    const token = localStorage.getItem("sellsync_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(activeWorkspace?.id ? { "X-Tenant-ID": activeWorkspace.id } : {}),
    };
  };

  const handleNext = async () => {
    setError("");

    if (currentStep === 1) {
      if (!workspaceName.trim()) {
        setError("Please enter a workspace name");
        return;
      }
      // If user doesn't have a workspace, create one
      if (!activeWorkspace) {
        try {
          setLoading(true);
          const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
          const res = await fetch(`${API_BASE}/workspaces`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ name: workspaceName, slug }),
          });
          if (res.ok) {
            const newWs = await res.json();
            await switchWorkspace(newWs.id);
          }
        } catch (err) {
          console.error("Workspace creation failed:", err);
        } finally {
          setLoading(false);
        }
      }
    }

    if (currentStep === 5 && connectMarketplace !== "NONE") {
      // Connect marketplace if provided
      try {
        setLoading(true);
        await fetch(`${API_BASE}/marketplaces/connections`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            marketplace_code: connectMarketplace,
            account_name: marketplaceAccountName || `${connectMarketplace} Store`,
            store_url: marketplaceStoreUrl,
            credentials: { access_token: marketplaceApiKey || "demo_token" },
          }),
        });
      } catch (err) {
        console.error("Failed to connect marketplace in onboarding:", err);
      } finally {
        setLoading(false);
      }
    }

    if (currentStep === 6 && productName.trim() && productSku.trim()) {
      // Create first product
      try {
        setLoading(true);
        await fetch(`${API_BASE}/products`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            name: productName.trim(),
            sku: productSku.trim(),
            category: selectedCategory,
            mrp: parseFloat(productMrp) || 1999,
            selling_price: parseFloat(productPrice) || 999,
            variants: [
              {
                sku: `${productSku.trim()}-DEFAULT`,
                title: "Standard",
                price: parseFloat(productPrice) || 999,
                stock_quantity: parseInt(productStock) || 50,
              },
            ],
          }),
        });
      } catch (err) {
        console.error("Failed to create first product:", err);
      } finally {
        setLoading(false);
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handlePrev = () => {
    setError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const steps = [
    { num: 1, title: "Workspace", icon: Building2 },
    { num: 2, title: "Business Details", icon: FileText },
    { num: 3, title: "Category", icon: Layers },
    { num: 4, title: "Plan", icon: CreditCard },
    { num: 5, title: "Channels", icon: Store },
    { num: 6, title: "First Product", icon: Package },
    { num: 7, title: "Complete", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#060a17] text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black shadow-md shadow-blue-900/30">
            S
          </div>
          <span className="text-base font-extrabold text-white">SellSync AI</span>
        </div>
        <div className="text-xs text-slate-400">
          Step <strong className="text-white">{currentStep}</strong> of 7
        </div>
      </div>

      {/* Main Stepper Card */}
      <div className="max-w-4xl mx-auto w-full my-8">
        {/* Stepper Progress Bar */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;

            return (
              <div key={s.num} className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white ring-4 ring-blue-500/20"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <span
                  className={`text-xs hidden sm:inline font-medium ${
                    isCurrent ? "text-white font-bold" : "text-slate-400"
                  }`}
                >
                  {s.title}
                </span>
                {s.num < 7 && <div className="h-0.5 w-6 sm:w-10 bg-slate-800 mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Step Container */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 sm:p-10 shadow-2xl">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-950/80 border border-rose-800 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* STEP 1: WORKSPACE */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-2xl font-black text-white">Set Up Your Multi-Tenant Workspace</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Every store operates in a cryptographically isolated tenant environment.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Workspace / Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kavita Retail Store or Apex D2C Brands"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: BUSINESS DETAILS */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-2xl font-black text-white">Business Profile & GSTIN</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Provide your registered tax credentials for Indian GST e-invoicing and logistics.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Legal Entity Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kavita Retail Private Limited"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">GSTIN (Optional for Trial)</label>
                  <input
                    type="text"
                    placeholder="27AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Primary Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Business Model</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="D2C">Direct to Consumer (D2C Brand)</option>
                    <option value="RETAIL">Independent Retail Seller</option>
                    <option value="WHOLESALE">Wholesale & B2B Distributor</option>
                    <option value="AGENCY">Ecommerce Management Agency</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Registered Office Address</label>
                  <input
                    type="text"
                    placeholder="104 Commercial Tower, Indiranagar, Bengaluru, Karnataka - 560038"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BUSINESS CATEGORY */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-2xl font-black text-white">Select Primary Product Category</h2>
                <p className="mt-1 text-xs text-slate-400">
                  SellSync AI configures channel taxonomy, HSN codes, and GST slab rates tailored to your category.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {BUSINESS_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                      selectedCategory === cat.id
                        ? "border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-950/50"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{cat.name}</span>
                      {selectedCategory === cat.id && (
                        <CheckCircle2 className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: SUBSCRIPTION PLAN */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-2xl font-black text-white">Choose Your Initial SaaS Tier</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Every account starts with an unrestricted 14-day free trial. No credit card required upfront.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ONBOARDING_PLANS.map((plan) => (
                  <div
                    key={plan.code}
                    onClick={() => setSelectedPlan(plan.code)}
                    className={`rounded-2xl border p-6 cursor-pointer flex flex-col justify-between transition-all ${
                      selectedPlan === plan.code
                        ? "border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-950/50"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{plan.name}</span>
                        {selectedPlan === plan.code && (
                          <CheckCircle2 className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <div className="text-2xl font-black text-white">{plan.price}</div>
                      <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                        {plan.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: CONNECT MARKETPLACE */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Connect Your First Channel</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Link your store API credentials or skip to complete this later in settings.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setConnectMarketplace("NONE");
                    handleNext();
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Skip for Now →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["SHOPIFY", "FLIPKART", "WOOCOMMERCE", "MEESHO"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConnectMarketplace(m)}
                    className={`rounded-xl border p-3 text-xs font-bold transition-all ${
                      connectMarketplace === m
                        ? "border-blue-500 bg-blue-950/60 text-white"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {connectMarketplace !== "NONE" && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Store Account Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Brand Store"
                      value={marketplaceAccountName}
                      onChange={(e) => setMarketplaceAccountName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Store URL</label>
                    <input
                      type="text"
                      placeholder="e.g. my-store.myshopify.com"
                      value={marketplaceStoreUrl}
                      onChange={(e) => setMarketplaceStoreUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">API Token / Secret Key</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••••••••••"
                      value={marketplaceApiKey}
                      onChange={(e) => setMarketplaceApiKey(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: FIRST PRODUCT */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Create Your First Canonical Product</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Add a seed product to verify atomic stock tracking and multi-channel publishing.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setProductName("");
                    handleNext();
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Skip for Now →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Product Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Premium Cotton Oversized Tee"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Master SKU</label>
                  <input
                    type="text"
                    placeholder="TEE-COTTON-001"
                    value={productSku}
                    onChange={(e) => setProductSku(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">MRP (₹)</label>
                  <input
                    type="number"
                    value={productMrp}
                    onChange={(e) => setProductMrp(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Initial Central Warehouse Stock</label>
                  <input
                    type="number"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: COMPLETE */}
          {currentStep === 7 && (
            <div className="text-center py-8 space-y-6 animate-in fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto border border-emerald-500/30">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">Your Workspace Is Ready!</h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  You are all set to manage catalog listings, sync inventory across marketplaces, and unify orders.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Workspace:</span>
                  <strong className="text-white">{workspaceName || activeWorkspace?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subscription:</span>
                  <span className="text-emerald-400 font-bold">14-Day Free Trial (Active)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Channels:</span>
                  <span className="text-slate-200">Flipkart, Shopify, WooCommerce</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-blue-900/40 hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                <span>Launch Seller Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Stepper Footer Buttons */}
          {currentStep < 7 && (
            <div className="mt-10 pt-6 border-t border-slate-800 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-900/30 transition-all disabled:opacity-50"
              >
                <span>{currentStep === 6 ? "Finish Onboarding" : "Continue"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-[11px] text-slate-500">
        SellSync AI • Multi-Marketplace E-Commerce Management Platform • 256-Bit TLS Secured
      </div>
    </div>
  );
}
