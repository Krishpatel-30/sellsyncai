"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Role, TeamMember, Invitation } from "@/lib/types";
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Loader2,
  X,
} from "lucide-react";

export default function TeamManagementPage() {
  const { role, activeWorkspace } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("VIEWER");
  const [inviting, setInviting] = useState(false);
  const [latestInviteLink, setLatestInviteLink] = useState<string | null>(null);

  const canManageTeam = role === "WORKSPACE_OWNER" || role === "ADMIN" || role === "SUPER_ADMIN";

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      const membersData = await api.get<TeamMember[]>("/team/members").catch(() => []);
      setMembers(membersData || []);

      if (canManageTeam) {
        const invitesData = await api.get<Invitation[]>("/team/invitations").catch(() => []);
        setInvitations(invitesData || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [activeWorkspace?.id]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post("/team/invite", {
        email: inviteEmail,
        role: inviteRole,
      });
      setSuccess(`Invitation successfully generated for ${inviteEmail}`);
      setLatestInviteLink(window.location.origin + res.invite_link);
      setInviteEmail("");
      fetchTeamData();
    } catch (err: any) {
      setError(err.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (membershipId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;
    try {
      await api.delete(`/team/members/${membershipId}`);
      setSuccess(`Member successfully removed`);
      fetchTeamData();
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    }
  };

  const handleRoleChange = async (membershipId: string, newRole: Role) => {
    try {
      await api.patch(`/team/members/${membershipId}`, { role: newRole });
      setSuccess(`Member role updated to ${newRole}`);
      fetchTeamData();
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Team Members & Roles
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage who has access to {activeWorkspace?.name} and their operational privileges.
          </p>
        </div>

        {canManageTeam && (
          <button
            onClick={() => {
              setInviteModalOpen(true);
              setLatestInviteLink(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Team Member</span>
          </button>
        )}
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

      {/* Members Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B132B] overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span>Active Workspace Members ({members.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
            Loading team roster...
          </div>
        ) : (
          <>
            {/* Mobile Team Member Cards (Phones & Tablets) */}
            <div className="block md:hidden divide-y divide-slate-800/80">
              {members.map((m) => (
                <div key={m.id} className="p-4 space-y-3 bg-[#0B132B] hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white text-sm">{m.user.full_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{m.user.email}</div>
                    </div>
                    {canManageTeam && m.role !== "WORKSPACE_OWNER" && (
                      <button
                        onClick={() => handleRemoveMember(m.id, m.user.full_name)}
                        title="Remove Member"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-400">
                      Joined: {new Date(m.joined_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <div>
                      {canManageTeam && m.role !== "WORKSPACE_OWNER" ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                          className="rounded-lg border border-slate-700 bg-[#060a17] px-2.5 py-1 text-xs text-white focus:border-blue-500 outline-none"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="PRODUCT_MANAGER">PRODUCT_MANAGER</option>
                          <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                          <option value="ORDER_MANAGER">ORDER_MANAGER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      ) : (
                        <span className="rounded-full bg-blue-950/80 border border-blue-800/60 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                          {m.role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#060a17] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Assigned Role</th>
                    <th className="px-6 py-3.5">Joined Date</th>
                    {canManageTeam && <th className="px-6 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{m.user.full_name}</div>
                        <div className="text-[11px] text-slate-400">{m.user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {canManageTeam && m.role !== "WORKSPACE_OWNER" ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                            className="rounded-lg border border-slate-700 bg-[#060a17] px-2.5 py-1 text-xs text-white focus:border-blue-500 outline-none"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="PRODUCT_MANAGER">PRODUCT_MANAGER</option>
                            <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                            <option value="ORDER_MANAGER">ORDER_MANAGER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <span className="rounded-full bg-blue-950/80 border border-blue-800/60 px-2.5 py-1 font-semibold text-blue-400">
                            {m.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(m.joined_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      {canManageTeam && (
                        <td className="px-6 py-4 text-right">
                          {m.role !== "WORKSPACE_OWNER" && (
                            <button
                              onClick={() => handleRemoveMember(m.id, m.user.full_name)}
                              title="Remove Member"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pending Invitations Table */}
      {canManageTeam && invitations.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-[#0B132B] overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Pending Invitations ({invitations.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#060a17] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Invited Role</th>
                  <th className="px-6 py-3.5">Expires</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-6 py-4 font-medium text-white">{inv.email}</td>
                    <td className="px-6 py-4 text-slate-300">{inv.role}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-[#0B132B] p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Invite New Team Member</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  Colleague's Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@yourbrand.com"
                  className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  Assigned Operational Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-700 bg-[#060a17] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                >
                  <option value="ADMIN">ADMIN - Full team and channel management</option>
                  <option value="MANAGER">MANAGER - Publishing, inventory, and order operations</option>
                  <option value="PRODUCT_MANAGER">PRODUCT_MANAGER - Catalog, AI listings & multi-marketplace publishing</option>
                  <option value="INVENTORY_MANAGER">INVENTORY_MANAGER - Warehouse stock and adjustments</option>
                  <option value="ORDER_MANAGER">ORDER_MANAGER - Order fulfillment, dispatch & returns</option>
                  <option value="VIEWER">VIEWER - Read-only visibility across metrics</option>
                </select>
              </div>

              {latestInviteLink && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-950/40 p-3 space-y-1.5">
                  <span className="text-[11px] font-semibold text-blue-400 block">Invitation Generated:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={latestInviteLink}
                      className="w-full bg-[#060a17] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(latestInviteLink);
                        alert("Invite link copied to clipboard!");
                      }}
                      className="rounded bg-blue-600 p-1.5 text-white hover:bg-blue-500"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-500 disabled:opacity-50"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Create Invitation</span>
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

