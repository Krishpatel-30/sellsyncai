import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_subscription_plans_and_entitlements(client: AsyncClient):
    """Test subscription plans listing and default workspace trial entitlements."""
    # 1. Register seller
    reg = await client.post("/api/v1/auth/register", json={
        "email": "billing_user@sellsync.ai",
        "password": "Password123!",
        "full_name": "Billing Test User",
        "workspace_name": "Billing Test Workspace",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get plans
    plans_res = await client.get("/api/v1/billing/plans")
    assert plans_res.status_code == 200
    plans = plans_res.json()
    assert len(plans) >= 5
    plan_codes = [p["code"] for p in plans]
    assert "FREE_TRIAL" in plan_codes
    assert "STARTER" in plan_codes
    assert "GROWTH" in plan_codes
    assert "BUSINESS" in plan_codes
    assert "ENTERPRISE" in plan_codes

    # 3. Get current subscription summary
    sub_res = await client.get("/api/v1/billing/subscription", headers=headers)
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["status"] == "TRIALING"
    assert sub_data["is_active"] is True
    assert sub_data["plan"]["code"] == "FREE_TRIAL"
    assert sub_data["usage"]["products_limit"] == 25
    assert sub_data["usage"]["marketplaces_limit"] == 1


@pytest.mark.asyncio
async def test_razorpay_checkout_and_gst_invoice(client: AsyncClient):
    """Test Razorpay order generation, signature verification, and GST invoice creation."""
    # Register seller
    reg = await client.post("/api/v1/auth/register", json={
        "email": "checkout_user@sellsync.ai",
        "password": "Password123!",
        "full_name": "Checkout Tester",
        "workspace_name": "Scaling Brand Store",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Razorpay order for GROWTH tier
    order_res = await client.post(
        "/api/v1/billing/create-order",
        json={"plan_code": "GROWTH", "billing_cycle": "MONTHLY"},
        headers=headers
    )
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert order_data["plan_name"] == "Growth"
    assert order_data["subtotal"] == 2499.0
    assert order_data["gst_rate"] == 18.0
    # 2499 + 18% (449.82) = 2948.82
    assert order_data["amount_inr"] == 2948.82
    order_id = order_data["razorpay_order_id"]

    # Verify payment with signature
    verify_res = await client.post(
        "/api/v1/billing/verify-payment",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": f"pay_{order_id[6:]}",
            "razorpay_signature": "mock_sig_test_verified"
        },
        headers=headers
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["status"] == "SUCCESS"
    assert "INV-" in verify_data["invoice_number"]

    # Check updated subscription reflects GROWTH entitlements
    sub_res = await client.get("/api/v1/billing/subscription", headers=headers)
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["status"] == "ACTIVE"
    assert sub_data["plan"]["code"] == "GROWTH"
    assert sub_data["usage"]["products_limit"] == 5000
    assert sub_data["usage"]["marketplaces_limit"] == 4

    # Check GST invoice list
    inv_res = await client.get("/api/v1/billing/invoices", headers=headers)
    assert inv_res.status_code == 200
    invoices = inv_res.json()
    assert len(invoices) >= 1
    assert invoices[0]["status"] == "PAID"
    assert invoices[0]["total_amount"] == 2948.82


@pytest.mark.asyncio
async def test_one_click_multi_channel_publish(client: AsyncClient):
    """Test connecting channels and executing one-click publishing across Shopify and Flipkart."""
    # Register seller
    reg = await client.post("/api/v1/auth/register", json={
        "email": "publisher@sellsync.ai",
        "password": "Password123!",
        "full_name": "Multi Channel Publisher",
        "workspace_name": "Omnichannel Store",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upgrade to STARTER so we can connect 2 marketplaces
    ord_res = await client.post(
        "/api/v1/billing/create-order",
        json={"plan_code": "STARTER", "billing_cycle": "MONTHLY"},
        headers=headers
    )
    order_id = ord_res.json()["razorpay_order_id"]
    await client.post(
        "/api/v1/billing/verify-payment",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": f"pay_{order_id[6:]}",
            "razorpay_signature": "mock_sig_starter"
        },
        headers=headers
    )

    # 1. Connect Shopify
    shopify_res = await client.post(
        "/api/v1/marketplaces/connections",
        json={
            "marketplace_code": "SHOPIFY",
            "account_name": "Main Shopify Store",
            "store_url": "my-brand.myshopify.com",
            "credentials": {"access_token": "shpat_mock_9988776655"}
        },
        headers=headers
    )
    assert shopify_res.status_code == 201
    shopify_conn_id = shopify_res.json()["id"]

    # 2. Connect Flipkart
    fk_res = await client.post(
        "/api/v1/marketplaces/connections",
        json={
            "marketplace_code": "FLIPKART",
            "account_name": "Flipkart Official Store",
            "credentials": {"app_id": "fk_app_12345", "app_secret": "fk_sec_67890"}
        },
        headers=headers
    )
    assert fk_res.status_code == 201
    fk_conn_id = fk_res.json()["id"]

    # 3. Create a canonical product
    prod_res = await client.post(
        "/api/v1/products",
        json={
            "name": "Organic Linen Casual Shirt",
            "sku": "LINEN-SHIRT-001",
            "description": "Breathable pure linen shirt tailored for summer.",
            "brand": "SellSync Essentials",
            "category": "Apparel",
            "mrp": 2499.0,
            "selling_price": 1499.0,
            "hsn_code": "62052000",
            "gst_rate": 12.0,
            "variants": [
                {
                    "sku": "LINEN-SHIRT-M",
                    "title": "Medium / Olive Green",
                    "size": "M",
                    "color": "Olive Green",
                    "price": 1499.0,
                    "stock_quantity": 40
                },
                {
                    "sku": "LINEN-SHIRT-L",
                    "title": "Large / Olive Green",
                    "size": "L",
                    "color": "Olive Green",
                    "price": 1499.0,
                    "stock_quantity": 60
                }
            ]
        },
        headers=headers
    )
    assert prod_res.status_code == 201
    product_id = prod_res.json()["id"]

    # 4. Execute One-Click Multi-Marketplace Publish
    publish_res = await client.post(
        f"/api/v1/products/{product_id}/publish",
        json={
            "connection_ids": [shopify_conn_id, fk_conn_id],
            "use_ai_listing": True
        },
        headers=headers
    )
    assert publish_res.status_code == 200
    publish_data = publish_res.json()
    assert publish_data["product_sku"] == "LINEN-SHIRT-001"
    assert len(publish_data["results"]) == 2

    # Verify both channels published successfully
    statuses = {r["marketplace_code"]: r["status"] for r in publish_data["results"]}
    assert statuses["SHOPIFY"] == "PUBLISHED", f"Publish failed with: {publish_data['results']}"
    assert statuses["FLIPKART"] == "PUBLISHED"
