import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "SellSync AI - Paid Multi-Marketplace E-commerce SaaS Platform",
  description:
    "One Product. Every Marketplace. One Dashboard. Synchronize listings, inventory and unified orders across Flipkart, Meesho, Shopify, WooCommerce, Myntra, and AJIO.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B132B] font-sans antialiased text-slate-100">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
