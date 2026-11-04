const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "http://127.0.0.1:8002/api/v1");

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("sellsync_access_token");
  }

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("sellsync_refresh_token");
  }

  private getActiveTenantId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("sellsync_active_tenant_id");
  }

  public setTokens(accessToken: string, refreshToken: string, tenantId?: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("sellsync_access_token", accessToken);
    localStorage.setItem("sellsync_refresh_token", refreshToken);
    if (tenantId) {
      localStorage.setItem("sellsync_active_tenant_id", tenantId);
    }
  }

  public clearAuth() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("sellsync_access_token");
    localStorage.removeItem("sellsync_refresh_token");
    localStorage.removeItem("sellsync_active_tenant_id");
  }

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        this.clearAuth();
        return null;
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token, data.active_tenant?.id);
      return data.access_token;
    } catch {
      this.clearAuth();
      return null;
    }
  }

  public async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers = {}, ...rest } = options;

    let url = `${BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined) searchParams.append(key, String(val));
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    const token = this.getAccessToken();
    const tenantId = this.getActiveTenantId();

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers as Record<string, string>),
    };

    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }
    if (tenantId) {
      reqHeaders["X-Tenant-ID"] = tenantId;
    }

    let res: Response;
    try {
      res = await fetch(url, {
        ...rest,
        headers: reqHeaders,
      });
    } catch (netErr: any) {
      throw new Error(`Unable to reach API server at ${url}. Please verify connection.`);
    }

    // Handle token refresh on 401
    if (res.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/refresh")) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        const newToken = await this.refreshAccessToken();
        this.isRefreshing = false;

        if (newToken) {
          this.onRefreshed(newToken);
          reqHeaders["Authorization"] = `Bearer ${newToken}`;
          try {
            res = await fetch(url, { ...rest, headers: reqHeaders });
          } catch {
            // keep previous res
          }
        } else {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      } else {
        // Wait for ongoing refresh
        const retryPromise = new Promise<Response>((resolve) => {
          this.subscribeTokenRefresh(async (newToken) => {
            reqHeaders["Authorization"] = `Bearer ${newToken}`;
            try {
              const retryRes = await fetch(url, { ...rest, headers: reqHeaders });
              resolve(retryRes);
            } catch {
              resolve(res);
            }
          });
        });
        res = await retryPromise;
      }
    }

    if (!res.ok) {
      let errData: any = {};
      try {
        errData = await res.json();
      } catch {
        errData = { message: res.statusText };
      }
      const rawDetail = errData.detail;
      const detailStr =
        typeof rawDetail === "string"
          ? rawDetail
          : rawDetail?.message || (Array.isArray(rawDetail) ? rawDetail.map((d: any) => d.msg || d.message).join(", ") : undefined);
      const message = errData.message || detailStr || res.statusText || `Request failed with status ${res.status}`;
      const error: any = new Error(message);
      error.status = res.status;
      error.data = errData;
      throw error;
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  public get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  public post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  public async upload<T = any>(endpoint: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
    const { params, headers = {}, ...rest } = options;

    let url = `${BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined) searchParams.append(key, String(val));
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    const token = this.getAccessToken();
    const tenantId = this.getActiveTenantId();

    const reqHeaders: Record<string, string> = {
      ...(headers as Record<string, string>),
    };

    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }
    if (tenantId) {
      reqHeaders["X-Tenant-ID"] = tenantId;
    }

    let res: Response;
    try {
      res = await fetch(url, {
        ...rest,
        method: "POST",
        headers: reqHeaders,
        body: formData,
      });
    } catch (netErr: any) {
      throw new Error(`Cannot connect to backend server at ${BASE_URL}. Ensure backend is running.`);
    }

    if (!res.ok) {
      let errData: any = {};
      try {
        errData = await res.json();
      } catch {
        errData = { message: res.statusText };
      }
      const errorMsg =
        typeof errData.detail === "string"
          ? errData.detail
          : errData.message || (errData.detail?.length ? JSON.stringify(errData.detail) : "Bulk import failed");
      const error: any = new Error(errorMsg);
      error.status = res.status;
      error.data = errData;
      throw error;
    }

    return res.json();
  }
}

export const api = new ApiClient();

