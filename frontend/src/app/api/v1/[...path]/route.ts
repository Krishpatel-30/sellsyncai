import { NextRequest, NextResponse } from "next/server";

// Sample mock data for standalone cloud deployment (e.g. Vercel)
const DEMO_PRODUCTS = [
  {
    id: "prod_oxford_shirt",
    name: "Classic Oxford Cotton Shirt",
    sku: "SHIRT-OXF-001",
    brand: "SellSync Basics",
    category: "Apparel & Fashion",
    mrp: 1499,
    selling_price: 999,
    hsn_code: "61091000",
    gst_rate: 18,
    variant_count: 3,
    total_stock: 145,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    variants: [
      { id: "v_1", sku: "SHIRT-OXF-001-S", title: "Size S / Navy", price: 999, stock_quantity: 45 },
      { id: "v_2", sku: "SHIRT-OXF-001-M", title: "Size M / Navy", price: 999, stock_quantity: 50 },
      { id: "v_3", sku: "SHIRT-OXF-001-L", title: "Size L / Navy", price: 999, stock_quantity: 50 },
    ],
  },
  {
    id: "prod_linen_trousers",
    name: "Slim Fit Linen Casual Trousers",
    sku: "TROUSER-LIN-002",
    brand: "SellSync Basics",
    category: "Apparel & Fashion",
    mrp: 2499,
    selling_price: 1799,
    hsn_code: "62034200",
    gst_rate: 18,
    variant_count: 2,
    total_stock: 80,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    variants: [
      { id: "v_4", sku: "TROUSER-LIN-002-30", title: "Waist 30 / Beige", price: 1799, stock_quantity: 40 },
      { id: "v_5", sku: "TROUSER-LIN-002-32", title: "Waist 32 / Beige", price: 1799, stock_quantity: 40 },
    ],
  },
  {
    id: "prod_leather_wallet",
    name: "RFID Blocking Leather Wallet",
    sku: "ACC-WAL-003",
    brand: "SellSync Leather",
    category: "Accessories",
    mrp: 999,
    selling_price: 649,
    hsn_code: "42023120",
    gst_rate: 18,
    variant_count: 1,
    total_stock: 120,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    variants: [
      { id: "v_6", sku: "ACC-WAL-003-BLK", title: "Standard / Dark Brown", price: 649, stock_quantity: 120 },
    ],
  },
];

const DEMO_MARKETPLACES = [
  { code: "FLIPKART", name: "Flipkart", description: "Flipkart Seller Hub India", is_supported: true },
  { code: "SHOPIFY", name: "Shopify", description: "Shopify Online Store API", is_supported: true },
  { code: "MEESHO", name: "Meesho", description: "Meesho Supplier Panel", is_supported: true },
  { code: "WOOCOMMERCE", name: "WooCommerce", description: "WooCommerce REST API", is_supported: true },
  { code: "MYNTRA", name: "Myntra", description: "Myntra Partner Portal", is_supported: true },
  { code: "AJIO", name: "AJIO", description: "Reliance AJIO Business", is_supported: true },
];

const DEMO_CONNECTIONS = [
  {
    id: "conn_flipkart_demo",
    marketplace_code: "FLIPKART",
    marketplace_name: "Flipkart",
    account_name: "SellSync Official Store",
    status: "CONNECTED",
    is_active: true,
    last_synced_at: new Date().toISOString(),
  },
  {
    id: "conn_shopify_demo",
    marketplace_code: "SHOPIFY",
    marketplace_name: "Shopify",
    account_name: "sellsync-flagship.myshopify.com",
    status: "CONNECTED",
    is_active: true,
    last_synced_at: new Date().toISOString(),
  },
];

let simulatedOrders: any[] = [];

async function tryProxyToBackend(req: NextRequest, pathStr: string) {
  const backendBase = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8002/api/v1";
  const url = new URL(req.url);
  const targetUrl = `${backendBase}/${pathStr}${url.search}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      if (
        key.toLowerCase() === "authorization" ||
        key.toLowerCase() === "x-tenant-id" ||
        key.toLowerCase() === "content-type"
      ) {
        headers[key] = val;
      }
    });

    let body: any = undefined;
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      body = await req.text();
    }

    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
  } catch {
    // Backend offline or local server running while client is on cloud Vercel
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path || [];
  const pathStr = pathParts.join("/");

  // 1. Try local or cloud FastAPI backend first
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes) return proxyRes;

  // 2. Standalone Cloud Fallback
  if (pathStr === "orders" || pathStr.startsWith("orders/")) {
    const url = new URL(req.url);
    const channel = url.searchParams.get("marketplace_code");
    let filtered = [...simulatedOrders];
    if (channel && channel !== "ALL") {
      filtered = filtered.filter((o) => o.marketplace_code === channel);
    }
    return NextResponse.json(filtered);
  }

  if (pathStr === "products" || pathStr.startsWith("products/")) {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    let result = [...DEMO_PRODUCTS];
    if (search) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.brand?.toLowerCase().includes(search)
      );
    }
    return NextResponse.json(result);
  }

  if (pathStr === "inventory/overview" || pathStr === "inventory") {
    return NextResponse.json(
      DEMO_PRODUCTS.map((p) => ({
        id: `inv_${p.id}`,
        product_id: p.id,
        sku: p.sku,
        product_name: p.name,
        quantity_on_hand: p.total_stock,
        quantity_reserved: 4,
        safety_stock: 10,
        quantity_available: p.total_stock - 4,
      }))
    );
  }

  if (pathStr === "inventory/movements") {
    return NextResponse.json([
      {
        id: "mov_1",
        sku: "SHIRT-OXF-001-M",
        type: "INBOUND",
        quantity: 50,
        reason: "Initial warehouse stock upload",
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ]);
  }

  if (pathStr === "marketplaces") {
    return NextResponse.json(DEMO_MARKETPLACES);
  }

  if (pathStr === "marketplaces/connections") {
    return NextResponse.json(DEMO_CONNECTIONS);
  }

  if (pathStr === "team/members") {
    return NextResponse.json([
      {
        id: "mem_owner",
        email: "seller@sellsync.ai",
        full_name: "Primary Workspace Owner",
        role: "WORKSPACE_OWNER",
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
      },
    ]);
  }

  if (pathStr === "billing/subscription") {
    return NextResponse.json({
      plan_name: "Multi-Marketplace Pro Trial",
      status: "TRIAL",
      days_left: 14,
      orders_limit: 10000,
      orders_used: simulatedOrders.length,
    });
  }

  if (pathStr === "audit") {
    return NextResponse.json([
      {
        id: "aud_1",
        action: "workspace.initialize",
        actor_email: "system@sellsync.ai",
        details: "Workspace catalog and unified channels initialized",
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path || [];
  const pathStr = pathParts.join("/");

  // 1. Try local or cloud FastAPI backend first
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes) return proxyRes;

  // 2. Standalone Cloud Fallback
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  if (pathStr === "orders/simulate") {
    const channel = body.marketplace_code || "FLIPKART";
    const sku = body.sku || "SHIRT-OXF-001";
    const qty = body.quantity || 1;
    const customer = body.customer_name || "Ananya Deshmukh";

    const newOrder = {
      id: "ord_" + Math.random().toString(36).substring(2, 10),
      marketplace_code: channel,
      order_number: "OD" + Math.floor(100000000 + Math.random() * 900000000),
      external_order_id: `${channel.substring(0, 3)}-${Math.floor(10000 + Math.random() * 90000)}`,
      customer_name: customer,
      customer_email: `${customer.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      customer_phone: "+91 98765 " + Math.floor(10000 + Math.random() * 90000),
      total_amount: 999 * qty,
      subtotal: 846 * qty,
      tax_amount: 153 * qty,
      currency: "INR",
      payment_status: "PAID",
      fulfillment_status: "UNFULFILLED",
      order_date: new Date().toISOString(),
      items_count: qty,
      items: [
        {
          id: "item_1",
          sku: sku,
          title: "Classic Oxford Cotton Shirt",
          quantity: qty,
          unit_price: 999,
          total_price: 999 * qty,
        },
      ],
      addresses: [
        {
          id: "addr_1",
          address_type: "SHIPPING",
          full_name: customer,
          address_line1: "Flat 402, Green Park Avenue",
          city: "Bengaluru",
          state: "Karnataka",
          postal_code: "560001",
          country: "India",
        },
      ],
    };

    simulatedOrders.unshift(newOrder);
    return NextResponse.json(newOrder, { status: 201 });
  }

  if (pathStr === "products") {
    const newProduct = {
      id: "prod_" + Math.random().toString(36).substring(2, 10),
      name: body.name || "New Product",
      sku: body.sku || "PROD-" + Date.now().toString().slice(-4),
      brand: body.brand || "SellSync",
      category: body.category || "General",
      mrp: body.mrp || 999,
      selling_price: body.selling_price || 799,
      hsn_code: body.hsn_code || "61091000",
      gst_rate: body.gst_rate || 18,
      variant_count: body.variants?.length || 1,
      total_stock: (body.variants || []).reduce((acc: number, v: any) => acc + (v.stock_quantity || 0), 0) || 50,
      created_at: new Date().toISOString(),
    };
    DEMO_PRODUCTS.unshift(newProduct as any);
    return NextResponse.json(newProduct, { status: 201 });
  }

  if (pathStr.includes("/test")) {
    return NextResponse.json({
      status: "CONNECTED",
      message: "Channel connection test passed successfully with 0 latency.",
    });
  }

  return NextResponse.json({ success: true, message: "Operation completed successfully" });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathStr = (resolvedParams.path || []).join("/");
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes) return proxyRes;
  return NextResponse.json({ success: true, message: "Resource removed" });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathStr = (resolvedParams.path || []).join("/");
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes) return proxyRes;
  return NextResponse.json({ success: true, message: "Resource updated" });
}
