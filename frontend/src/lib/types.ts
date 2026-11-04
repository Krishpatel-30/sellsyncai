export type Role =
  | "SUPER_ADMIN"
  | "WORKSPACE_OWNER"
  | "ADMIN"
  | "MANAGER"
  | "PRODUCT_MANAGER"
  | "INVENTORY_MANAGER"
  | "ORDER_MANAGER"
  | "VIEWER";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  is_superadmin: boolean;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  currency: string;
  logo_url?: string;
  role?: Role;
  is_active?: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  active_tenant?: Tenant;
  role?: Role;
}

export interface TeamMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: Role;
  is_active: boolean;
  joined_at: string;
  user: User;
}

export interface Invitation {
  id: string;
  tenant_id: string;
  email: string;
  role: Role;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expires_at: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  tenant_id?: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

