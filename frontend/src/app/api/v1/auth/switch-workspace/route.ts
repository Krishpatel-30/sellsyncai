import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tenantId = body.tenant_id || "ws_primary_store";
    return NextResponse.json({
      access_token: "sellsync_jwt_switched_" + tenantId,
      refresh_token: "sellsync_rt_" + Date.now(),
      token_type: "bearer",
      expires_in: 3600,
      active_tenant: {
        id: tenantId,
        name: "Primary Workspace",
        slug: "primary-workspace",
        status: "ACTIVE",
        currency: "INR",
        logo_url: null,
      },
      role: "WORKSPACE_OWNER",
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

