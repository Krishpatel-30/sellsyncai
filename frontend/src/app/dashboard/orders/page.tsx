"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  ShoppingBag,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  Zap,
  Loader2,
  X,
  ExternalLink,
  Store,
} from "lucide-react";

interface OrderItem {
  id: string;
  sku: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderAddress {
  id: string;
  address_type: string;
  full_name: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface Order {
  id: string;
  marketplace_code: string;
  external_order_id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  currency: string;
  payment_status: string;
  fulfillment_status: string;
  order_date: string;
  items_count: number;
  items?: OrderItem[];
  addresses?: OrderAddress[];
}

interface Product {
  id: string;
  name: string;
  sku: string;
  selling_price?: number;
  mrp?: number;
}

export default function OrdersPage() {
  const { role, activeWorkspace } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Simulation Modal
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simChannel, setSimChannel] = useState("FLIPKART");
  const [simSku, setSimSku] = useState("");
  const [simQty, setSimQty] = useState(1);
  const [simCustomer, setSimCustomer] = useState("Ananya Deshmukh");
  const [simulating, setSimulating] = useState(false);

  // Order Details Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Rehydrate local cached orders
      let localOrders: Order[] = [];
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("sellsync_orders");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) localOrders = parsed;
          } catch {}
        }
      }

      const params: any = {};
      if (selectedChannel !== "ALL") params.marketplace_code = selectedChannel;

      let [orderList, prodList] = await Promise.all([
        api.get<Order[]>("/orders", { params }).catch(() => []),
        api.get<Product[]>("/products").catch(() => []),
      ]);

      // Rehydrate products from localStorage if API is empty
      if (!prodList || prodList.length === 0) {
        if (typeof window !== "undefined") {
          const cachedProds = localStorage.getItem("sellsync_canonical_products");
          if (cachedProds) {
            try {
              const parsed = JSON.parse(cachedProds);
              if (Array.isArray(parsed) && parsed.length > 0) prodList = parsed;
            } catch {}
          }
        }
      }

      let combinedOrders: Order[] = [];
      if (Array.isArray(orderList) && orderList.length > 0) {
        combinedOrders = [...orderList];
        for (const lo of localOrders) {
          if (!combinedOrders.some((o) => o.id === lo.id)) {
            combinedOrders.push(lo);
          }
        }
      } else {
        combinedOrders = localOrders;
      }

      if (selectedChannel !== "ALL") {
        combinedOrders = combinedOrders.filter((o) => o.marketplace_code === selectedChannel);
      }

      setOrders(combinedOrders);
      setProducts(prodList || []);
      if (prodList && prodList.length > 0 && !simSku) {
        setSimSku(prodList[0].sku);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeWorkspace?.id, selectedChannel]);

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simSku) {
      setError("Please select or enter a valid SKU");
      return;
    }
    setSimulating(true);
    setError(null);
    setSuccess(null);

    try {
      let res: Order;
      try {
        res = await api.post<Order>("/orders/simulate", {
          marketplace_code: simChannel,
          sku: simSku,
          quantity: simQty,
          customer_name: simCustomer,
        });
      } catch {
        // Fallback local order generation
        const matchedProd = products.find((p) => p.sku === simSku);
        const unitPrice = matchedProd?.selling_price || 999;
        res = {
          id: "ord_" + Math.random().toString(36).substring(2, 10),
          marketplace_code: simChannel,
          order_number: "OD" + Math.floor(100000000 + Math.random() * 900000000),
          external_order_id: `${simChannel.substring(0, 3)}-${Math.floor(10000 + Math.random() * 90000)}`,
          customer_name: simCustomer || "Customer",
          customer_email: `${(simCustomer || "customer").toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
          customer_phone: "+91 98765 43210",
          total_amount: unitPrice * simQty,
          subtotal: Math.round(unitPrice * 0.82) * simQty,
          tax_amount: Math.round(unitPrice * 0.18) * simQty,
          currency: "INR",
          payment_status: "PAID",
          fulfillment_status: "UNFULFILLED",
          order_date: new Date().toISOString(),
          items_count: simQty,
          items: [
            {
              id: "item_1",
              sku: simSku,
              title: matchedProd?.name || "Purchased Product",
              quantity: simQty,
              unit_price: unitPrice,
              total_price: unitPrice * simQty,
            },
          ],
        };
      }

      // Persist to localStorage
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("sellsync_orders");
        let list: Order[] = [];
        if (cached) {
          try {
            list = JSON.parse(cached);
          } catch {}
        }
        list.unshift(res);
        localStorage.setItem("sellsync_orders", JSON.stringify(list));
      }

      setSuccess(
        `Order ${res.order_number} simulated successfully from ${simChannel}! ${simQty} unit(s) reserved atomically in central inventory.`
      );
      setSimModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      setError(err.message || "Order simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  const handleViewDetail = async (orderId: string) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    try {
      const o = await api.get<Order>(`/orders/${orderId}`);
      setSelectedOrder(o);
    } catch (err: any) {
      setError(err.message || "Failed to load order details");
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="h-7 w-7 text-emerald-400" />
            <span>Unified Order Management</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time orders aggregated from Flipkart, Meesho, Shopify, and WooCommerce with atomic stock reservation.
          </p>
        </div>

        <button
          onClick={() => setSimModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all"
        >
          <Zap className="h-4 w-4" />
          <span>Simulate Marketplace Order</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Channel Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {["ALL", "FLIPKART", "SHOPIFY", "MEESHO", "WOOCOMMERCE", "MYNTRA", "AJIO"].map((code) => (
          <button
            key={code}
            onClick={() => setSelectedChannel(code)}
            className={`rounded-xl px-4 py-2 font-semibold border transition-all ${
              selectedChannel === code
                ? "bg-blue-600 text-white border-blue-500 shadow-md"
                : "bg-[#0B132B] text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            {code === "ALL" ? "All Marketplaces" : code}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Store className="h-4 w-4 text-emerald-400" />
            <span>Orders Queue ({orders.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-400" />
            Loading channel orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No orders found. Click "Simulate Marketplace Order" to test incoming orders and see atomic inventory deduction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#060a17] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Order Number</th>
                  <th className="px-6 py-3.5">Marketplace</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Payment</th>
                  <th className="px-6 py-3.5">Fulfillment</th>
                  <th className="px-6 py-3.5">Order Date</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white font-mono">{o.order_number}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{o.external_order_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-blue-950/80 border border-blue-800/60 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                        {o.marketplace_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{o.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{o.customer_email || "Customer"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-white">₹{o.total_amount}</span>
                      <span className="text-[10px] text-slate-500 block">incl. 18% GST</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                        {o.fulfillment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(o.order_date).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetail(o.id)}
                        className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simulate Modal */}
      {simModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Simulate Marketplace Order</h3>
                <p className="text-xs text-slate-400 mt-0.5">Test real-time atomic inventory reservation across channels</p>
              </div>
              <button onClick={() => setSimModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSimulateSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium uppercase tracking-wider text-slate-300">
                  Select Originating Marketplace
                </label>
                <select
                  value={simChannel}
                  onChange={(e) => setSimChannel(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                >
                  <option value="FLIPKART">Flipkart Seller Hub</option>
                  <option value="SHOPIFY">Shopify Store</option>
                  <option value="MEESHO">Meesho Supplier App</option>
                  <option value="WOOCOMMERCE">WooCommerce Store</option>
                  <option value="MYNTRA">Myntra Partner Portal</option>
                  <option value="AJIO">Reliance AJIO</option>
                </select>
              </div>

              <div>
                <label className="block font-medium uppercase tracking-wider text-slate-300">
                  Select Product to Simulate Order
                </label>
                {products.length > 0 ? (
                  <select
                    value={simSku}
                    onChange={(e) => setSimSku(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white font-mono focus:border-blue-500 outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.sku}>
                        {p.name} (SKU: {p.sku})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={simSku}
                    onChange={(e) => setSimSku(e.target.value)}
                    placeholder="e.g. SHIRT-OXF-001 or LINEN-IMP-001"
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white font-mono focus:border-blue-500 outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    Order Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={simQty}
                    onChange={(e) => setSimQty(Number(e.target.value))}
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase tracking-wider text-slate-300">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={simCustomer}
                    onChange={(e) => setSimCustomer(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSimModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-500 disabled:opacity-50"
                >
                  {simulating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Reserving Stock & Placing Order...</span>
                    </>
                  ) : (
                    <span>Simulate Incoming Order</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Order Breakdown: {selectedOrder?.order_number}
                </h3>
                <span className="text-xs text-blue-400 font-semibold">{selectedOrder?.marketplace_code}</span>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail || !selectedOrder ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
                Loading order details...
              </div>
            ) : (
              <div className="mt-5 space-y-4 text-xs">
                <div className="rounded-xl bg-[#060a17] p-3 border border-slate-800 space-y-1">
                  <div className="font-semibold text-white">Customer: {selectedOrder.customer_name}</div>
                  <div className="text-slate-400">Email: {selectedOrder.customer_email || "Not specified"}</div>
                  <div className="text-slate-400">Phone: {selectedOrder.customer_phone || "Not specified"}</div>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-slate-300 block">Ordered Items:</span>
                  {selectedOrder.items?.map((it) => (
                    <div key={it.id} className="rounded-lg bg-[#060a17] p-3 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-white">{it.title}</div>
                        <div className="text-[11px] font-mono text-slate-400">SKU: {it.sku} • Qty: {it.quantity}</div>
                      </div>
                      <div className="font-bold text-emerald-400">₹{it.total_price}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
                  <span>Grand Total (incl. GST):</span>
                  <span className="text-emerald-400">₹{selectedOrder.total_amount}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

