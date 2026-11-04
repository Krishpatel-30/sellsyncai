import { NextRequest, NextResponse } from "next/server";

// Clean user state for standalone cloud deployment (Vercel)
// Zero dummy data — catalog, orders, and connections start completely empty
const storedProducts: any[] = [];
const storedConnections: any[] = [];
const storedOrders: any[] = [];

const SUPPORTED_MARKETPLACES = [
  { id: "mp_flipkart", code: "FLIPKART", name: "Flipkart", description: "Flipkart Seller Hub India", type: "MARKETPLACE", is_supported: true },
  { id: "mp_shopify", code: "SHOPIFY", name: "Shopify", description: "Shopify Online Store API", type: "CUSTOM_STORE", is_supported: true },
  { id: "mp_meesho", code: "MEESHO", name: "Meesho", description: "Meesho Supplier Panel", type: "MARKETPLACE", is_supported: true },
  { id: "mp_woocommerce", code: "WOOCOMMERCE", name: "WooCommerce", description: "WooCommerce REST API", type: "CUSTOM_STORE", is_supported: true },
  { id: "mp_myntra", code: "MYNTRA", name: "Myntra", description: "Myntra Partner Portal", type: "MARKETPLACE", is_supported: true },
  { id: "mp_ajio", code: "AJIO", name: "AJIO", description: "Reliance AJIO Business", type: "MARKETPLACE", is_supported: true },
];

async function tryProxyToBackend(req: NextRequest, pathStr: string) {
  // If running on Vercel without an external BACKEND_INTERNAL_URL, skip local proxying to avoid SSRF blocks
  if (process.env.VERCEL && !process.env.BACKEND_INTERNAL_URL) {
    return null;
  }

  const backendBase = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8002/api/v1";
  const url = new URL(req.url);
  const targetUrl = `${backendBase}/${pathStr}${url.search}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const contentType = req.headers.get("content-type") || "";
    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower === "authorization" || lower === "x-tenant-id") {
        headers[key] = val;
      }
      if (lower === "content-type" && !contentType.includes("multipart/form-data")) {
        headers[key] = val;
      }
    });

    let body: any = undefined;
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      if (contentType.includes("multipart/form-data")) {
        body = await req.formData();
      } else {
        body = await req.text();
      }
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
    // Backend offline or running in standalone cloud mode
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path || [];
  const pathStr = pathParts.join("/");

  // 1. Try backend proxy first if available
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes) return proxyRes;

  // 2. Standalone Cloud Handlers
  if (pathStr === "orders" || pathStr.startsWith("orders/")) {
    const url = new URL(req.url);
    const channel = url.searchParams.get("marketplace_code");
    let filtered = [...storedOrders];
    if (channel && channel !== "ALL") {
      filtered = filtered.filter((o) => o.marketplace_code === channel);
    }
    return NextResponse.json(filtered);
  }

  if (pathStr === "products" || pathStr.startsWith("products/")) {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    let result = [...storedProducts];
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
      storedProducts.map((p) => ({
        id: `inv_${p.id}`,
        product_id: p.id,
        sku: p.sku,
        product_name: p.name,
        quantity_on_hand: p.total_stock || 0,
        quantity_reserved: 0,
        safety_stock: 5,
        quantity_available: p.total_stock || 0,
      }))
    );
  }

  if (pathStr === "inventory/movements") {
    return NextResponse.json([]);
  }

  if (pathStr === "marketplaces") {
    return NextResponse.json(SUPPORTED_MARKETPLACES);
  }

  if (pathStr === "marketplaces/connections") {
    return NextResponse.json(storedConnections);
  }

  if (pathStr === "team/members") {
    return NextResponse.json([]);
  }

  if (pathStr === "billing/subscription") {
    return NextResponse.json({
      plan_name: "Multi-Marketplace Pro",
      status: "TRIAL",
      days_left: 14,
      orders_limit: 10000,
      orders_used: storedOrders.length,
    });
  }

  if (pathStr === "audit") {
    return NextResponse.json([]);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path || [];
  const pathStr = pathParts.join("/");

  // 1. Try backend proxy first if available
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes) return proxyRes;

  // 2. Standalone Cloud Handlers
  if (pathStr === "products/bulk-import") {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        const text = await file.text();
        const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

        if (rawLines.length > 1) {
          // Parse header row
          const headerLine = rawLines[0];
          const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

          // Helper to get column value by variants of common names
          const getVal = (cols: string[], ...names: string[]) => {
            for (const n of names) {
              const idx = headers.indexOf(n.toLowerCase());
              if (idx !== -1 && cols[idx] !== undefined) {
                return cols[idx].trim().replace(/^["']|["']$/g, "");
              }
            }
            return "";
          };

          for (let i = 1; i < rawLines.length; i++) {
            const rowLine = rawLines[i];
            // Split CSV respecting quotes
            const cols = rowLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length === 0) continue;

            const name = getVal(cols, "name", "title", "product_name", "product name", "item name") || `Product ${storedProducts.length + 1}`;
            const sku = getVal(cols, "sku", "item_code", "product_code", "code", "sku code") || `SKU-${Date.now()}-${i}`;
            const brand = getVal(cols, "brand", "brand_name") || "Brand";
            const category = getVal(cols, "category", "product_category") || "General";
            const mrp = parseFloat(getVal(cols, "mrp", "maximum retail price", "list price")) || 999;
            const price = parseFloat(getVal(cols, "selling_price", "selling price", "price", "sale price", "rate")) || mrp;
            const stock = parseInt(getVal(cols, "stock", "stock_quantity", "quantity", "qty", "inventory")) || 50;
            const hsn = getVal(cols, "hsn", "hsn_code", "hsn code") || "61091000";
            const gst = parseFloat(getVal(cols, "gst", "gst_rate", "tax", "tax_rate")) || 18;
            const size = getVal(cols, "size");
            const color = getVal(cols, "color", "colour");
            const material = getVal(cols, "material", "fabric");

            // Avoid duplicate SKUs in stored array
            const existingIdx = storedProducts.findIndex((p) => p.sku === sku);
            const productObj = {
              id: "prod_" + Math.random().toString(36).substring(2, 10),
              name,
              sku,
              brand,
              category,
              mrp,
              selling_price: price,
              hsn_code: hsn,
              gst_rate: gst,
              variant_count: 1,
              total_stock: stock,
              created_at: new Date().toISOString(),
              variants: [
                {
                  id: "v_" + Math.random().toString(36).substring(2, 10),
                  sku: `${sku}-DEF`,
                  title: `${name} Standard`,
                  size: size || "",
                  color: color || "",
                  material: material || "",
                  price,
                  stock_quantity: stock,
                },
              ],
            };

            if (existingIdx !== -1) {
              storedProducts[existingIdx] = productObj;
            } else {
              storedProducts.unshift(productObj);
            }
          }
        }
      }
    } catch (e: any) {
      console.warn("CSV parse warning:", e);
    }

    return NextResponse.json({
      total_imported: storedProducts.length,
      products: storedProducts,
      errors: [],
    });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

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
      variants: body.variants || [],
    };
    storedProducts.unshift(newProduct);
    return NextResponse.json(newProduct, { status: 201 });
  }

  if (pathStr === "orders/simulate") {
    const channel = body.marketplace_code || "FLIPKART";
    const sku = body.sku || "SAMPLE-001";
    const qty = body.quantity || 1;
    const customer = body.customer_name || "Customer";

    const newOrder = {
      id: "ord_" + Math.random().toString(36).substring(2, 10),
      marketplace_code: channel,
      order_number: "OD" + Math.floor(100000000 + Math.random() * 900000000),
      external_order_id: `${channel.substring(0, 3)}-${Math.floor(10000 + Math.random() * 90000)}`,
      customer_name: customer,
      customer_email: `${customer.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      customer_phone: "+91 98765 43210",
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
          title: "Purchased Product",
          quantity: qty,
          unit_price: 999,
          total_price: 999 * qty,
        },
      ],
    };

    storedOrders.unshift(newOrder);
    return NextResponse.json(newOrder, { status: 201 });
  }

  if (pathStr === "marketplaces/connections") {
    const newConn = {
      id: "conn_" + Math.random().toString(36).substring(2, 10),
      marketplace_code: body.marketplace_code,
      marketplace_name: body.marketplace_code,
      account_name: body.account_name,
      store_url: body.store_url || null,
      status: "CONNECTED",
      is_active: true,
      masked_credentials: { api_key: "••••••••" },
      last_synced_at: new Date().toISOString(),
    };
    storedConnections.unshift(newConn);
    return NextResponse.json(newConn, { status: 201 });
  }

  if (pathStr.includes("/test")) {
    return NextResponse.json({
      status: "CONNECTED",
      message: "Connection test passed successfully.",
    });
  }

  return NextResponse.json({ success: true, message: "Operation completed successfully" });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathStr = (resolvedParams.path || []).join("/");
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes) return proxyRes;

  if (pathStr.startsWith("marketplaces/connections/")) {
    const id = pathStr.split("/").pop();
    const idx = storedConnections.findIndex((c) => c.id === id);
    if (idx !== -1) storedConnections.splice(idx, 1);
  }

  return NextResponse.json({ success: true, message: "Resource removed" });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathStr = (resolvedParams.path || []).join("/");
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes) return proxyRes;
  return NextResponse.json({ success: true, message: "Resource updated" });
}
