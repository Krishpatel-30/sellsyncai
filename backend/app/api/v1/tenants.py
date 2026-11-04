import secrets
import uuid
from typing import Annotated, List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    TenantContext,
    get_current_tenant_context,
    get_current_user,
    require_permission,
    require_role,
)
from app.api.v1.auth import slugify
from app.core.audit import log_audit_event
from app.core.exceptions import ConflictException, NotFoundException
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.membership import TenantMembership
from app.models.tenant import Tenant
from app.models.user import User
from app.models.inventory import Warehouse
from app.models.product import Product, ProductVariant
from app.models.marketplace import Marketplace, MarketplaceConnection
from app.models.order import Order, OrderItem
from app.services.inventory_engine import inventory_engine
from app.schemas.tenant import TenantCreate, TenantResponse, TenantUpdate, TenantWithRoleResponse

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[TenantWithRoleResponse])
async def list_user_workspaces(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[TenantWithRoleResponse]:
    """List all workspaces the current user belongs to."""
    if current_user.is_superadmin:
        # Super Admin sees all tenants
        t_res = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
        tenants = t_res.scalars().all()
        return [
            TenantWithRoleResponse(
                id=t.id,
                name=t.name,
                slug=t.slug,
                status=t.status,
                currency=t.currency,
                logo_url=t.logo_url,
                created_at=t.created_at,
                updated_at=t.updated_at,
                role=Role.SUPER_ADMIN.value,
                is_active=True,
            )
            for t in tenants
        ]

    res = await db.execute(
        select(TenantMembership)
        .where(TenantMembership.user_id == current_user.id)
        .options(selectinload(TenantMembership.tenant))
        .order_by(TenantMembership.joined_at.desc())
    )
    memberships = res.scalars().all()

    items = []
    for m in memberships:
        if m.tenant:
            items.append(
                TenantWithRoleResponse(
                    id=m.tenant.id,
                    name=m.tenant.name,
                    slug=m.tenant.slug,
                    status=m.tenant.status,
                    currency=m.tenant.currency,
                    logo_url=m.tenant.logo_url,
                    created_at=m.tenant.created_at,
                    updated_at=m.tenant.updated_at,
                    role=m.role,
                    is_active=m.is_active,
                )
            )
    return items


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: TenantCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TenantResponse:
    """Create a new workspace and make the user WORKSPACE_OWNER."""
    base_slug = slugify(data.slug or data.name)
    slug = f"{base_slug}-{secrets.token_hex(3)}"

    new_tenant = Tenant(
        name=data.name,
        slug=slug,
        status="TRIAL",
        currency="INR",
    )
    db.add(new_tenant)
    await db.flush()

    membership = TenantMembership(
        tenant_id=new_tenant.id,
        user_id=current_user.id,
        role=Role.WORKSPACE_OWNER.value,
        is_active=True,
    )
    db.add(membership)

    await log_audit_event(
        db=db,
        action="workspace.create",
        tenant_id=new_tenant.id,
        user_id=current_user.id,
        resource_type="tenant",
        resource_id=str(new_tenant.id),
        details={"name": new_tenant.name, "slug": new_tenant.slug},
        request=request,
    )

    await db.commit()
    await db.refresh(new_tenant)

    return TenantResponse.model_validate(new_tenant)


@router.get("/current", response_model=TenantWithRoleResponse)
async def get_current_workspace(
    context: Annotated[TenantContext, Depends(get_current_tenant_context)]
) -> TenantWithRoleResponse:
    """Get metadata for the currently active workspace."""
    return TenantWithRoleResponse(
        id=context.tenant.id,
        name=context.tenant.name,
        slug=context.tenant.slug,
        status=context.tenant.status,
        currency=context.tenant.currency,
        logo_url=context.tenant.logo_url,
        created_at=context.tenant.created_at,
        updated_at=context.tenant.updated_at,
        role=context.role.value,
        is_active=context.membership.is_active if context.membership else True,
    )


@router.patch("/current", response_model=TenantResponse)
async def update_current_workspace(
    data: TenantUpdate,
    context: Annotated[TenantContext, Depends(require_permission(Permission.WORKSPACE_MANAGE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TenantResponse:
    """Update workspace details (Requires WORKSPACE_MANAGE permission)."""
    tenant = context.tenant

    if data.name is not None:
        tenant.name = data.name
    if data.logo_url is not None:
        tenant.logo_url = data.logo_url
    if data.currency is not None:
        tenant.currency = data.currency

    await log_audit_event(
        db=db,
        action="workspace.update",
        tenant_id=tenant.id,
        user_id=current_user.id,
        resource_type="tenant",
        resource_id=str(tenant.id),
        details={"name": tenant.name},
        request=request,
    )

    await db.commit()
    await db.refresh(tenant)

    return TenantResponse.model_validate(tenant)


@router.post("/seed-demo-data")
async def seed_workspace_demo_data(
    context: Annotated[TenantContext, Depends(get_current_tenant_context)],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Seed starter demo catalog, channels, and simulated orders for an empty workspace."""
    tenant_id = context.tenant.id

    # 1. Ensure central warehouse
    w_res = await db.execute(select(Warehouse).where(Warehouse.tenant_id == tenant_id))
    warehouse = w_res.scalars().first()
    if not warehouse:
        warehouse = Warehouse(
            tenant_id=tenant_id,
            name="Central Fulfilment Hub",
            code="WH-CENTRAL-01",
            city="Bengaluru",
            state="Karnataka",
            pincode="560001",
            is_active=True,
            is_default=True,
        )
        db.add(warehouse)
        await db.flush()

    # 2. Seed starter products if empty
    p_check = await db.execute(select(Product).where(Product.tenant_id == tenant_id))
    existing_prods = p_check.scalars().all()
    created_products_count = len(existing_prods)

    if len(existing_prods) == 0:
        demo_items = [
            {
                "name": "A5 Premium Hardbound Notebook",
                "sku": "STA-NBK-001",
                "brand": "NoteWorks",
                "category": "Books & Stationery",
                "mrp": 499.0,
                "price": 299.0,
                "stock": 100,
                "hsn": "48201000",
                "gst": 18.0,
            },
            {
                "name": "Organic Cotton Casual T-Shirt",
                "sku": "APP-TSH-002",
                "brand": "NoteWorks",
                "category": "Apparel & Fashion",
                "mrp": 1299.0,
                "price": 799.0,
                "stock": 150,
                "hsn": "61091000",
                "gst": 5.0,
            },
            {
                "name": "Slim RFID Bifold Leather Wallet",
                "sku": "ACC-WLT-003",
                "brand": "NoteWorks",
                "category": "Fashion Accessories",
                "mrp": 1999.0,
                "price": 999.0,
                "stock": 75,
                "hsn": "42023120",
                "gst": 18.0,
            },
        ]

        for item in demo_items:
            prod = Product(
                tenant_id=tenant_id,
                name=item["name"],
                sku=item["sku"],
                brand=item["brand"],
                category=item["category"],
                mrp=item["mrp"],
                selling_price=item["price"],
                hsn_code=item["hsn"],
                gst_rate=item["gst"],
            )
            db.add(prod)
            await db.flush()

            variant = ProductVariant(
                product_id=prod.id,
                sku=f"{item['sku']}-DEF",
                title=f"{item['name']} Standard",
                price=item["price"],
                stock_quantity=item["stock"],
            )
            db.add(variant)
            await db.flush()

            await inventory_engine.ensure_variant_inventory(
                db=db,
                tenant_id=tenant_id,
                warehouse_id=warehouse.id,
                variant_id=variant.id,
                initial_stock=item["stock"],
            )
            created_products_count += 1

    # 3. Seed marketplace connections if empty
    c_check = await db.execute(select(MarketplaceConnection).where(MarketplaceConnection.tenant_id == tenant_id))
    existing_conns = c_check.scalars().all()
    created_conns_count = len(existing_conns)

    if len(existing_conns) == 0:
        mp_res = await db.execute(select(Marketplace))
        all_mps = mp_res.scalars().all()
        mp_map = {m.code: m for m in all_mps}

        for code, acc_name in [
            ("FLIPKART", "Flipkart Assured Store"),
            ("SHOPIFY", "Official D2C Storefront"),
            ("MEESHO", "Meesho Reseller Supply"),
        ]:
            mp = mp_map.get(code)
            if mp:
                conn = MarketplaceConnection(
                    tenant_id=tenant_id,
                    marketplace_id=mp.id,
                    account_name=acc_name,
                    status="ACTIVE",
                    is_active=True,
                )
                db.add(conn)
                created_conns_count += 1
        await db.flush()

    # 4. Seed simulated orders if empty
    o_check = await db.execute(select(Order).where(Order.tenant_id == tenant_id))
    existing_orders = o_check.scalars().all()
    created_orders_count = len(existing_orders)

    if len(existing_orders) == 0:
        p_refresh = await db.execute(select(Product).where(Product.tenant_id == tenant_id))
        all_prods = p_refresh.scalars().all()
        p1 = all_prods[0] if len(all_prods) > 0 else None
        p2 = all_prods[1] if len(all_prods) > 1 else None

        sample_orders = [
            {
                "mp": "FLIPKART",
                "ext_id": f"OD{secrets.token_hex(4).upper()}",
                "num": f"ORD-FLK-{secrets.token_hex(3).upper()}",
                "customer": "Aarav Sharma",
                "email": "aarav.sharma@gmail.com",
                "total": 598.0,
                "payment": "PAID",
                "fulfillment": "CONFIRMED",
                "sku": p1.sku if p1 else "STA-NBK-001",
                "qty": 2,
                "price": 299.0,
            },
            {
                "mp": "SHOPIFY",
                "ext_id": f"SHP#{secrets.token_hex(4).upper()}",
                "num": f"ORD-SHP-{secrets.token_hex(3).upper()}",
                "customer": "Priya Nair",
                "email": "priya.nair@outlook.com",
                "total": 1598.0,
                "payment": "PAID",
                "fulfillment": "SHIPPED",
                "sku": p2.sku if p2 else "APP-TSH-002",
                "qty": 2,
                "price": 799.0,
            },
            {
                "mp": "MEESHO",
                "ext_id": f"MSH_{secrets.token_hex(4).upper()}",
                "num": f"ORD-MSH-{secrets.token_hex(3).upper()}",
                "customer": "Ramesh Patel",
                "email": "ramesh.patel@gmail.com",
                "total": 299.0,
                "payment": "PENDING_COD",
                "fulfillment": "PENDING",
                "sku": p1.sku if p1 else "STA-NBK-001",
                "qty": 1,
                "price": 299.0,
            },
        ]

        for s_ord in sample_orders:
            order = Order(
                tenant_id=tenant_id,
                marketplace_code=s_ord["mp"],
                external_order_id=s_ord["ext_id"],
                order_number=s_ord["num"],
                customer_name=s_ord["customer"],
                customer_email=s_ord["email"],
                total_amount=s_ord["total"],
                subtotal=s_ord["total"],
                tax_amount=s_ord["total"] * 0.18,
                currency="INR",
                payment_status=s_ord["payment"],
                fulfillment_status=s_ord["fulfillment"],
            )
            db.add(order)
            await db.flush()

            item = OrderItem(
                order_id=order.id,
                sku=s_ord["sku"],
                title=f"{s_ord['sku']} Item",
                quantity=s_ord["qty"],
                unit_price=s_ord["price"],
                total_price=s_ord["total"],
            )
            db.add(item)
            created_orders_count += 1

    await log_audit_event(
        db=db,
        action="workspace.seed_demo_data",
        tenant_id=tenant_id,
        user_id=current_user.id,
        resource_type="tenant",
        resource_id=str(tenant_id),
        details={"products": created_products_count, "conns": created_conns_count, "orders": created_orders_count},
        request=request,
    )

    await db.commit()

    return {
        "status": "SUCCESS",
        "message": "Demo starter catalog, channels, and orders populated successfully!",
        "products": created_products_count,
        "connections": created_conns_count,
        "orders": created_orders_count,
    }

