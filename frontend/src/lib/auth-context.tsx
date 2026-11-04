"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { Role, Tenant, TokenResponse, User } from "./types";

interface AuthContextType {
  user: User | null;
  activeWorkspace: Tenant | null;
  workspaces: Tenant[];
  role: Role | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleUser?: {
    email?: string;
    full_name?: string;
    avatar_url?: string;
    credential?: string;
  }) => Promise<void>;
  signInWithFirebaseGoogle: () => Promise<void>;
  register: (email: string, password: string, fullName: string, workspaceName?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (tenantId: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Tenant | null>(null);
  const [workspaces, setWorkspaces] = useState<Tenant[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const initAuth = async () => {
    try {
      const token = localStorage.getItem("sellsync_access_token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Fetch user profile and workspaces
      const data = await api.get<{ user: User; workspaces: Tenant[] }>("/auth/me");
      setUser(data.user);
      setWorkspaces(data.workspaces);

      const savedTenantId = localStorage.getItem("sellsync_active_tenant_id");
      let active = data.workspaces.find((w) => w.id === savedTenantId);
      if (!active && data.workspaces.length > 0) {
        active = data.workspaces[0];
        localStorage.setItem("sellsync_active_tenant_id", active.id);
      }
      setActiveWorkspace(active || null);
      setRole(active?.role || (data.user.is_superadmin ? "SUPER_ADMIN" : "VIEWER"));
    } catch {
      api.clearAuth();
      setUser(null);
      setActiveWorkspace(null);
      setWorkspaces([]);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<TokenResponse>("/auth/login", { email, password });
      api.setTokens(res.access_token, res.refresh_token, res.active_tenant?.id);
      setUser(res.user);
      setActiveWorkspace(res.active_tenant || null);
      setRole((res.role as Role) || "VIEWER");

      // Reload full workspace list
      try {
        const meData = await api.get<{ user: User; workspaces: Tenant[] }>("/auth/me");
        setWorkspaces(meData.workspaces);
      } catch {
        if (res.active_tenant) setWorkspaces([res.active_tenant]);
      }

      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googleUser?: {
    email?: string;
    full_name?: string;
    avatar_url?: string;
    credential?: string;
  }) => {
    setIsLoading(true);
    try {
      const payload: any = {};
      if (googleUser?.credential) payload.credential = googleUser.credential;
      if (googleUser?.email) payload.email = googleUser.email;
      if (googleUser?.full_name) payload.full_name = googleUser.full_name;
      if (googleUser?.avatar_url) payload.avatar_url = googleUser.avatar_url;

      if (!payload.email && !payload.credential) {
        throw new Error("Please enter your Google email address to sign in.");
      }

      const res = await api.post<TokenResponse>("/auth/google", payload);
      api.setTokens(res.access_token, res.refresh_token, res.active_tenant?.id);
      setUser(res.user);
      setActiveWorkspace(res.active_tenant || null);
      setRole((res.role as Role) || "WORKSPACE_OWNER");

      try {
        const meData = await api.get<{ user: User; workspaces: Tenant[] }>("/auth/me");
        setWorkspaces(meData.workspaces);
      } catch {
        if (res.active_tenant) setWorkspaces([res.active_tenant]);
      }

      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithFirebaseGoogle = async () => {
    setIsLoading(true);
    try {
      const { signInWithGooglePopup } = await import("./firebase");
      const cred = await signInWithGooglePopup();
      const fbUser = cred.user;
      const idToken = await fbUser.getIdToken();

      await loginWithGoogle({
        email: fbUser.email || undefined,
        full_name: fbUser.displayName || undefined,
        avatar_url: fbUser.photoURL || undefined,
        credential: idToken,
      });
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        return;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    workspaceName?: string
  ) => {
    setIsLoading(true);
    try {
      const res = await api.post<TokenResponse>("/auth/register", {
        email,
        password,
        full_name: fullName,
        workspace_name: workspaceName,
      });
      api.setTokens(res.access_token, res.refresh_token, res.active_tenant?.id);
      setUser(res.user);
      setActiveWorkspace(res.active_tenant || null);
      setRole((res.role as Role) || "WORKSPACE_OWNER");

      try {
        const meData = await api.get<{ user: User; workspaces: Tenant[] }>("/auth/me");
        setWorkspaces(meData.workspaces);
      } catch {
        if (res.active_tenant) setWorkspaces([res.active_tenant]);
      }

      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors on logout
    } finally {
      api.clearAuth();
      setUser(null);
      setActiveWorkspace(null);
      setWorkspaces([]);
      setRole(null);
      router.push("/login");
    }
  };

  const switchWorkspace = async (tenantId: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<TokenResponse>("/auth/switch-workspace", { tenant_id: tenantId });
      api.setTokens(res.access_token, res.refresh_token, res.active_tenant?.id);
      setActiveWorkspace(res.active_tenant || null);
      setRole((res.role as Role) || null);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    try {
      const data = await api.get<{ user: User; workspaces: Tenant[] }>("/auth/me");
      setUser(data.user);
      setWorkspaces(data.workspaces);
      const savedTenantId = localStorage.getItem("sellsync_active_tenant_id");
      const active = data.workspaces.find((w) => w.id === savedTenantId) || data.workspaces[0];
      setActiveWorkspace(active || null);
      setRole(active?.role || (data.user.is_superadmin ? "SUPER_ADMIN" : "VIEWER"));
    } catch (e) {
      console.error("Failed to refresh user data", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeWorkspace,
        workspaces,
        role,
        isLoading,
        login,
        loginWithGoogle,
        signInWithFirebaseGoogle,
        register,
        logout,
        switchWorkspace,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

