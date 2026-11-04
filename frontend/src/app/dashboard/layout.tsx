"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Boxes,
  LayoutDashboard,
  Package,
  Sparkles,
  Store,
  RefreshCw,
  ShoppingBag,
  Users,
  History,
  ChevronDown,
  LogOut,
  X,
  Menu,
  Check,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, activeWorkspace, workspaces, role, isLoading, logout, switchWorkspace } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060a17]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Marketplace Accounts", href: "/dashboard/channels", icon: Store },
    { name: "Product Master", href: "/dashboard/products", icon: Package },
    { name: "AI Listing Studio", href: "/dashboard/ai-studio", icon: Sparkles },
    { name: "Inventory Engine", href: "/dashboard/inventory", icon: RefreshCw },
    { name: "Unified Orders", href: "/dashboard/orders", icon: ShoppingBag },
    { name: "Team & RBAC", href: "/dashboard/team", icon: Users },
    { name: "Audit Trail", href: "/dashboard/audit", icon: History },
  ];

  return (
    <div className="flex min-h-screen bg-[#060a17] text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-[#0B132B] transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* App Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              SellSync <span className="text-blue-400">AI</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="relative border-b border-slate-800 px-4 py-3">
          <button
            onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
            className="flex w-full items-center justify-between rounded-xl bg-[#060a17] p-2.5 text-left border border-slate-800 hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 font-bold text-xs">
                {activeWorkspace?.name?.charAt(0).toUpperCase() || "W"}
              </div>
              <div className="truncate">
                <span className="block truncate text-xs font-semibold text-white">
                  {activeWorkspace?.name || "Select Workspace"}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {role || "VIEWER"}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
          </button>

          {/* Workspaces Menu */}
          {workspaceDropdownOpen && (
            <div className="absolute left-4 right-4 top-16 z-50 rounded-xl border border-slate-800 bg-[#0B132B] p-2 shadow-2xl space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Your Workspaces
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws.id);
                    setWorkspaceDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                    ws.id === activeWorkspace?.id
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === activeWorkspace?.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Operations Dashboard
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Current User Card */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 font-semibold text-xs text-white">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <div className="truncate">
                <span className="block truncate text-xs font-medium text-white">
                  {user.full_name}
                </span>
                <span className="block truncate text-[10px] text-slate-400">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Body */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-[#0B132B]/80 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Workspace:</span>
              <span className="font-semibold text-white">{activeWorkspace?.name}</span>
              <span className="rounded-full bg-blue-950 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-800">
                {role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Tenant Isolation Active</span>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
