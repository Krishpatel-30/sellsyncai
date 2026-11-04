import io
import re
import csv
import uuid
from datetime import datetime, timezone
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import TenantContext, get_current_tenant_context, get_current_user, require_permission
from app.core.audit import log_audit_event
from app.core.exceptions import ConflictException, NotFoundException
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.inventory import InventoryItem, Warehouse
from app.models.product import Product, ProductImage, ProductVariant
from app.models.user import User
from app.schemas.product import (
    BulkImportResponse,
    ProductCreate,
    ProductDetailResponse,
    ProductResponse,
    ProductUpdate,
)
from app.services.inventory_engine import inventory_engine
from app.services.entitlement_service import EntitlementService
from app.core.encryption import decrypt_data
from app.services.connectors import get_marketplace_connector
from app.models.marketplace import MarketplaceConnection, IntegrationCredential
from app.models.ai import AIGeneratedListing
from pydantic import BaseModel

router = APIRouter(prefix="/products", tags=["Central Product Master"])


@router.get("", response_model=List[ProductResponse])
async def list_products(
    context: Annotated[TenantContext, Depends(require_permission(Permission.PRODUCT_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: Optional[str] = Query(None, description="Search by name, SKU or brand"),
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> List[ProductResponse]:
    """Retrieve catalog products with variant and stock counts."""
    stmt = (
        select(Product)
        .where(
            Product.tenant_id == context.tenant.id,
            Product.is_archived == False
        )
        .options(selectinload(Product.variants))
    )

    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(term),
                Product.sku.ilike(term),
                Product.brand.ilike(term),
            )
        )
    if category:
        stmt = stmt.where(Product.category == category)
    if brand:
        stmt = stmt.where(Product.brand == brand)

    stmt = stmt.order_by(Product.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(stmt)
    products = res.scalars().all()

    items = []
    for p in products:
        v_count = len(p.variants)
        t_stock = sum(v.stock_quantity for v in p.variants)
        items.append(
            ProductResponse(
                id=p.id,
                tenant_id=p.tenant_id,
                name=p.name,
                sku=p.sku,
                description=p.description,
                brand=p.brand,
                category=p.category,
                subcategory=p.subcategory,
                mrp=float(p.mrp),
                selling_price=float(p.selling_price),
                purchase_price=float(p.purchase_price or 0.0),
                hsn_code=p.hsn_code,
                gst_rate=float(p.gst_rate),
                weight_kg=float(p.weight_kg or 0.5),
                dimensions=p.dimensions,
                is_archived=p.is_archived,
                variant_count=v_count,
                total_stock=t_stock,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )
    return items


@router.post("", response_model=ProductDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    context: Annotated[TenantContext, Depends(require_permission(Permission.PRODUCT_CREATE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> ProductDetailResponse:
    """Create a new canonical product, its multi-attribute variants, and initialize central inventory."""
    # Enforce SaaS subscription product entitlement limit
    await EntitlementService.check_product_limit(db, context.tenant.id, adding_count=1)

    # Check duplicate SKU in workspace
    sku_check = await db.execute(
        select(Product).where(
            Product.tenant_id == context.tenant.id,
            Product.sku == data.sku.strip()
        )
    )
    if sku_check.scalar_one_or_none():
        raise ConflictException(f"A product with SKU '{data.sku}' already exists in your workspace")

    # Create Product
    product = Product(
        tenant_id=context.tenant.id,
        name=data.name.strip(),
        sku=data.sku.strip(),
        description=data.description,
        brand=data.brand,
        category=data.category or "General",
        subcategory=data.subcategory,
        mrp=data.mrp,
        selling_price=data.selling_price,
        purchase_price=data.purchase_price or 0.0,
        hsn_code=data.hsn_code or "61091000",
        gst_rate=data.gst_rate,
        weight_kg=data.weight_kg or 0.5,
        dimensions=data.dimensions or "10x10x5 cm",
        is_archived=False,
    )
    db.add(product)
    await db.flush()

    # Get default warehouse
    warehouse = await inventory_engine.get_or_create_default_warehouse(db, context.tenant.id)

    # Create Variants
    created_variants = []
    if data.variants and len(data.variants) > 0:
        for v_data in data.variants:
            variant = ProductVariant(
                product_id=product.id,
                sku=v_data.sku.strip(),
                title=v_data.title,
                size=v_data.size,
                color=v_data.color,
                material=v_data.material,
                barcode=v_data.barcode,
                price=v_data.price,
                stock_quantity=v_data.stock_quantity,
            )
            db.add(variant)
            await db.flush()
            created_variants.append(variant)

            # Initialize inventory
            await inventory_engine.ensure_variant_inventory(
                db=db,
                tenant_id=context.tenant.id,
                warehouse_id=warehouse.id,
                variant_id=variant.id,
                initial_stock=v_data.stock_quantity,
            )
    else:
        # Default single variant
        default_variant = ProductVariant(
            product_id=product.id,
            sku=f"{product.sku}-DEF",
            title=f"{product.name} (Standard)",
            price=product.selling_price,
            stock_quantity=50,
        )
        db.add(default_variant)
        await db.flush()
        created_variants.append(default_variant)

        await inventory_engine.ensure_variant_inventory(
            db=db,
            tenant_id=context.tenant.id,
            warehouse_id=warehouse.id,
            variant_id=default_variant.id,
            initial_stock=50,
        )

    # Save images
    if data.images:
        for idx, img_url in enumerate(data.images):
            img = ProductImage(
                product_id=product.id,
                url=img_url,
                position=idx,
                is_primary=(idx == 0),
            )
            db.add(img)

    await log_audit_event(
        db=db,
        action="product.create",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="product",
        resource_id=str(product.id),
        details={"name": product.name, "sku": product.sku, "variants": len(created_variants)},
        request=request,
    )

    await db.commit()
    await db.refresh(product)

    # Re-query product with relations
    p_full = (
        await db.execute(
            select(Product)
            .where(Product.id == product.id)
            .options(
                selectinload(Product.variants),
                selectinload(Product.images)
            )
        )
    ).scalar_one()

    total_stock = sum(v.stock_quantity for v in p_full.variants)
    return ProductDetailResponse(
        id=p_full.id,
        tenant_id=p_full.tenant_id,
        name=p_full.name,
        sku=p_full.sku,
        description=p_full.description,
        brand=p_full.brand,
        category=p_full.category,
        subcategory=p_full.subcategory,
        mrp=float(p_full.mrp),
        selling_price=float(p_full.selling_price),
        purchase_price=float(p_full.purchase_price or 0.0),
        hsn_code=p_full.hsn_code,
        gst_rate=float(p_full.gst_rate),
        weight_kg=float(p_full.weight_kg or 0.5),
        dimensions=p_full.dimensions,
        is_archived=p_full.is_archived,
        variant_count=len(p_full.variants),
        total_stock=total_stock,
        variants=p_full.variants,
        images=p_full.images,
        created_at=p_full.created_at,
        updated_at=p_full.updated_at,
    )


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product_detail(
    product_id: uuid.UUID,
    context: Annotated[TenantContext, Depends(require_permission(Permission.PRODUCT_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> ProductDetailResponse:
    """Retrieve full product details including variants and image assets."""
    res = await db.execute(
        select(Product)
        .where(
            Product.id == product_id,
            Product.tenant_id == context.tenant.id,
            Product.is_archived == False
        )
        .options(
            selectinload(Product.variants),
            selectinload(Product.images)
        )
    )
    product = res.scalar_one_or_none()
    if not product:
        raise NotFoundException("Product", product_id)

    total_stock = sum(v.stock_quantity for v in product.variants)
    return ProductDetailResponse(
        id=product.id,
        tenant_id=product.tenant_id,
        name=product.name,
        sku=product.sku,
        description=product.description,
        brand=product.brand,
        category=product.category,
        subcategory=product.subcategory,
        mrp=float(product.mrp),
        selling_price=float(product.selling_price),
        purchase_price=float(product.purchase_price or 0.0),
        hsn_code=product.hsn_code,
        gst_rate=float(product.gst_rate),
        weight_kg=float(product.weight_kg or 0.5),
        dimensions=product.dimensions,
        is_archived=product.is_archived,
        variant_count=len(product.variants),
        total_stock=total_stock,
        variants=product.variants,
        images=product.images,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import_csv(
    context: Annotated[TenantContext, Depends(require_permission(Permission.PRODUCT_IMPORT))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> BulkImportResponse:
    """Bulk import products and variants via CSV."""
    contents = await file.read()
    decoded = contents.decode("utf-8-sig")
    raw_rows = list(csv.DictReader(io.StringIO(decoded)))

    def get_val(r: dict, *keys, default=None):
        lookup = {k.strip().lower(): v for k, v in r.items() if k}
        for k in keys:
            norm = k.strip().lower()
            if norm in lookup and lookup[norm] not in (None, ""):
                return str(lookup[norm]).strip()
        return default

    def clean_num(val, default=0.0) -> float:
        if val is None or val == "":
            return default
        cleaned = re.sub(r"[^\d.]", "", str(val))
        try:
            return float(cleaned) if cleaned else default
        except ValueError:
            return default

    # Enforce product limit for batch
    if raw_rows:
        await EntitlementService.check_product_limit(db, context.tenant.id, adding_count=len(raw_rows))

    warehouse = await inventory_engine.get_or_create_default_warehouse(db, context.tenant.id)

    imported = 0
    errors = []

    for row_idx, row in enumerate(raw_rows, start=1):
        name = get_val(row, "name", "title", "product_name", "product name", "item name")
        sku = get_val(row, "sku", "item_code", "product_code", "code", "sku code")

        if not name or not sku:
            errors.append(f"Row {row_idx}: Missing required 'name' or 'sku'")
            continue

        # Check existing SKU in this workspace
        sku_check = await db.execute(
            select(Product).where(
                Product.tenant_id == context.tenant.id,
                Product.sku == sku.strip()
            )
        )
        if sku_check.scalar_one_or_none():
            errors.append(f"Row {row_idx}: SKU '{sku}' already exists (skipped)")
            continue

        try:
            mrp = clean_num(get_val(row, "mrp", "maximum retail price", "compare price", "list price"), 999.0)
            price = clean_num(get_val(row, "selling_price", "selling price", "price", "sale price", "rate"), mrp)
            stock = int(clean_num(get_val(row, "stock", "stock_quantity", "quantity", "qty", "inventory"), 50.0))
            category = get_val(row, "category", "product_category", default="General")
            brand = get_val(row, "brand", "brand_name")
            hsn = get_val(row, "hsn", "hsn_code", "hsn code", default="61091000")
            gst = clean_num(get_val(row, "gst", "gst_rate", "tax", "tax_rate"), 18.0)
            size = get_val(row, "size")
            color = get_val(row, "color", "colour")
            material = get_val(row, "material", "fabric")

            product = Product(
                tenant_id=context.tenant.id,
                name=name.strip(),
                sku=sku.strip(),
                brand=brand,
                category=category,
                mrp=mrp,
                selling_price=price,
                hsn_code=hsn,
                gst_rate=gst,
            )
            db.add(product)
            await db.flush()

            variant = ProductVariant(
                product_id=product.id,
                sku=f"{sku.strip()}-DEF",
                title=f"{name.strip()} Standard",
                size=size,
                color=color,
                material=material,
                price=price,
                stock_quantity=stock,
            )
            db.add(variant)
            await db.flush()

            await inventory_engine.ensure_variant_inventory(
                db=db,
                tenant_id=context.tenant.id,
                warehouse_id=warehouse.id,
                variant_id=variant.id,
                initial_stock=stock,
            )
            imported += 1
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")

    await db.commit()

    await log_audit_event(
        db=db,
        action="product.bulk_import",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="product",
        details={"total_imported": imported, "errors": len(errors)},
        request=request,
    )

    return BulkImportResponse(total_imported=imported, errors=errors)


class PublishProductRequest(BaseModel):
    connection_ids: List[uuid.UUID]
    use_ai_listing: bool = True


class PublishResultItem(BaseModel):
    connection_id: uuid.UUID
    marketplace_code: str
    account_name: str
    status: str
    external_id: Optional[str] = None
    message: Optional[str] = None


class PublishProductResponse(BaseModel):
    product_id: uuid.UUID
    product_sku: str
    results: List[PublishResultItem]


@router.post("/{product_id}/publish", response_model=PublishProductResponse)
async def publish_product_to_marketplaces(
    product_id: uuid.UUID,
    data: PublishProductRequest,
    context: Annotated[TenantContext, Depends(require_permission(Permission.MARKETPLACE_PUBLISH))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> PublishProductResponse:
    """One-Click Product Publishing across selected connected ecommerce channels."""
    # Fetch product with variants
    stmt = (
        select(Product)
        .where(Product.id == product_id, Product.tenant_id == context.tenant.id)
        .options(selectinload(Product.variants))
    )
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    if not product:
        raise NotFoundException("Product", product_id)

    results: List[PublishResultItem] = []

    for conn_id in data.connection_ids:
        c_stmt = (
            select(MarketplaceConnection)
            .where(
                MarketplaceConnection.id == conn_id,
                MarketplaceConnection.tenant_id == context.tenant.id,
                MarketplaceConnection.is_active == True
            )
            .options(
                selectinload(MarketplaceConnection.marketplace),
                selectinload(MarketplaceConnection.credential)
            )
        )
        c_res = await db.execute(c_stmt)
        conn = c_res.scalar_one_or_none()
        if not conn:
            continue

        try:
            raw_creds = {}
            if conn.credential:
                raw_creds = decrypt_data(conn.credential.encrypted_payload)

            connector = get_marketplace_connector(
                marketplace_code=conn.marketplace.code,
                connection_id=conn.id,
                credentials=raw_creds,
                store_url=conn.store_url
            )

            # Check if AI listing exists
            ai_listing = None
            if data.use_ai_listing:
                ai_stmt = (
                    select(AIGeneratedListing)
                    .where(
                        AIGeneratedListing.product_id == product.id,
                        AIGeneratedListing.marketplace_code == conn.marketplace.code
                    )
                    .order_by(AIGeneratedListing.created_at.desc())
                )
                ai_res = await db.execute(ai_stmt)
                ai_listing = ai_res.scalars().first()

            publish_res = await connector.publish_product(
                product=product,
                variants=product.variants,
                ai_listing=ai_listing
            )

            conn.last_synced_at = datetime.now(timezone.utc)
            results.append(PublishResultItem(
                connection_id=conn.id,
                marketplace_code=conn.marketplace.code,
                account_name=conn.account_name,
                status=publish_res.get("status", "PUBLISHED"),
                external_id=publish_res.get("external_product_id") or publish_res.get("external_listing_batch_id"),
                message=f"Successfully submitted to {conn.marketplace.name}"
            ))
        except Exception as e:
            results.append(PublishResultItem(
                connection_id=conn.id,
                marketplace_code=conn.marketplace.code,
                account_name=conn.account_name,
                status="FAILED",
                message=str(e)
            ))

    await log_audit_event(
        db=db,
        action="product.multi_channel_publish",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="product",
        resource_id=str(product.id),
        details={"channels_published": len(results), "sku": product.sku},
        request=request,
    )

    await db.commit()

    return PublishProductResponse(
        product_id=product.id,
        product_sku=product.sku,
        results=results
    )
