"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  RefreshCw,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  History,
  Sliders,
  Loader2,
  X,
  Warehouse,
} from "lucide-react";

interface InventoryItem {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  variant_id: string;
  product_name: string;
  sku: string;
  variant_title: string;
  on_hand: number;
  reserved: number;
  safety_stock: number;
  available: number;
  is_low_stock: boolean;
  updated_at: string;
}

interface InventoryMovement {
  id: string;
  inventory_item_id: string;
  change_type: string;
  quantity_delta: number;
  reason?: string;
  created_at: string;
}

export default function InventoryPage() {
  const { role, activeWorkspace } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [delta, setDelta] = useState<number>(10);
  const [changeType, setChangeType] = useState<string>("ADJUSTMENT");
  const [reason, setReason] = useState<string>("Routine stock adjustment");
  const [adjusting, setAdjusting] = useState(false);

  const canManage = role === "WORKSPACE_OWNER" || role === "ADMIN" || role === "INVENTORY_MANAGER" || role === "SUPER_ADMIN";

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invData, movData] = await Promise.all([
        api.get<InventoryItem[]>("/inventory/overview").catch(() => []),
        api.get<InventoryMovement[]>("/inventory/movements").catch(() => []),
      ]);
      setItems(invData || []);
      setMovements(movData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [activeWorkspace?.id]);

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setDelta(10);
    setReason("Physical stock adjustment");
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setAdjusting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post("/inventory/adjust", {
        inventory_item_id: selectedItem.id,
        quantity_delta: delta,
        change_type: changeType,
        reason,
      });
      setSuccess(`Inventory updated for SKU ${selectedItem.sku}!`);
      setAdjustModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      setError(err.message || "Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <RefreshCw className="h-7 w-7 text-cyan-400" />
          <span>Atomic Inventory Engine</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Central warehouse stock with row-locked atomic reservations to prevent double-selling across channels.
        </p>
      </div>

      {/* Formula Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-bold">
              ∑
            </span>
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-cyan-400">
                Synchronization Formula
              </span>
              <div className="text-lg font-bold text-white font-mono mt-0.5">
                Available Stock = On Hand - Reserved - Safety Stock
              </div>
            </div>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Overselling Prevention Active
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="rounded-xl bg-[#060a17] p-3 border border-slate-800">
            <span className="text-xs text-slate-400">Total Physical On Hand</span>
            <div className="text-xl font-bold text-white mt-1">
              {items.reduce((acc, i) => acc + i.on_hand, 0)} Units
            </div>
          </div>
          <div className="rounded-xl bg-[#060a17] p-3 border border-slate-800">
            <span className="text-xs text-slate-400">Reserved (Live Orders)</span>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {items.reduce((acc, i) => acc + i.reserved, 0)} Units
            </div>
          </div>
          <div className="rounded-xl bg-[#060a17] p-3 border border-slate-800">
            <span className="text-xs text-slate-400">Configured Safety Buffers</span>
            <div className="text-xl font-bold text-rose-400 mt-1">
              {items.reduce((acc, i) => acc + i.safety_stock, 0)} Units
            </div>
          </div>
          <div className="rounded-xl bg-[#060a17] p-3 border border-slate-800">
            <span className="text-xs text-slate-400">Available to Marketplaces</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {items.reduce((acc, i) => acc + i.available, 0)} Units
            </div>
          </div>
        </div>
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

      {/* Inventory Items Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-cyan-400" />
            <span>Warehouse Inventory Items ({items.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Calculating warehouse stock...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No inventory items found. Add products in the Product Master to initialize stock.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#060a17] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">SKU & Variant</th>
                  <th className="px-6 py-3.5">Warehouse</th>
                  <th className="px-6 py-3.5">On Hand</th>
                  <th className="px-6 py-3.5">Reserved</th>
                  <th className="px-6 py-3.5">Safety Stock</th>
                  <th className="px-6 py-3.5">Available Stock</th>
                  <th className="px-6 py-3.5">Sync Health</th>
                  {canManage && <th className="px-6 py-3.5 text-right">Adjust</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{item.sku}</div>
                      <div className="text-[11px] text-slate-400">{item.product_name} • {item.variant_title}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">
                      {item.warehouse_name}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {item.on_hand}
                    </td>
                    <td className="px-6 py-4 text-amber-400 font-medium">
                      {item.reserved}
                    </td>
                    <td className="px-6 py-4 text-rose-400 font-medium">
                      {item.safety_stock}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-400 text-sm">
                        {item.available} Units
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.is_low_stock ? (
                        <span className="rounded-full bg-rose-950/80 border border-rose-800 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                          Low Stock
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          Healthy
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenAdjust(item)}
                          className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-slate-700 transition-colors"
                        >
                          Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Adjust Stock: {selectedItem.sku}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Current Physical On-Hand: {selectedItem.on_hand} Units</p>
              </div>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium uppercase tracking-wider text-slate-300">
                  Quantity Adjustment (Delta)
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    required
                    value={delta}
                    onChange={(e) => setDelta(Number(e.target.value))}
                    placeholder="+25 or -10"
                    className="w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white font-mono focus:border-cyan-500 outline-none"
                  />
                  <div className="text-[11px] text-slate-400 shrink-0">
                    New On Hand: <strong className="text-white">{selectedItem.on_hand + delta}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium uppercase tracking-wider text-slate-300">
                  Reason for Adjustment
                </label>
                <select
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-cyan-500 outline-none"
                >
                  <option value="PURCHASE">New Inbound Stock / Supplier Purchase</option>
                  <option value="ADJUSTMENT">Physical Audit / Inventory Recount</option>
                  <option value="RETURN">Customer Return Restock</option>
                  <option value="DAMAGE">Damaged / Written-Off Goods</option>
                </select>
              </div>

              <div>
                <label className="block font-medium uppercase tracking-wider text-slate-300">
                  Audit Notes
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. PO-8890 delivery received"
                  className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-white focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2 text-xs font-semibold text-white shadow-md hover:bg-cyan-500 disabled:opacity-50"
                >
                  {adjusting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Recording Movement...</span>
                    </>
                  ) : (
                    <span>Commit Adjustment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

