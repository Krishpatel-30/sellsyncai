"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AuditLogItem } from "@/lib/types";
import { History, Shield, Search, Loader2 } from "lucide-react";

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterAction.trim()) {
        params.action = filterAction.trim();
      }
      const data = await api.get<AuditLogItem[]>("/audit", { params });
      setLogs(data);
    } catch (e) {
      console.error("Failed to load audit trail", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Workspace Audit Trail
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Immutable security log recording administrative, authentication, and inventory operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchAuditLogs()}
              placeholder="Filter by action (e.g. auth.login)..."
              className="rounded-xl border border-slate-700 bg-[#0B132B] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none w-64"
            />
          </div>
          <button
            onClick={fetchAuditLogs}
            className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Audit Events ({logs.length})</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Tenant Scoped</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
            Querying audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No audit records found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#060a17] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">Payload Details</th>
                  <th className="px-6 py-3.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded bg-blue-950 px-2 py-0.5 text-blue-300 border border-blue-900 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {log.resource_type || "system"}
                    </td>
                    <td className="px-6 py-3 text-slate-400 max-w-xs truncate font-sans text-[11px]">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-[11px]">
                      {log.ip_address || "internal"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

