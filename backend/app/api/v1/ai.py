import uuid
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import TenantContext, get_current_tenant_context, get_current_user, require_permission
from app.core.audit import log_audit_event
from app.core.exceptions import NotFoundException
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.ai import AIGeneratedListing
from app.models.product import Product
from app.models.user import User
from app.schemas.ai import (
    AIGeneratedListingResponse,
    ApproveListingRequest,
    GenerateListingRequest,
)
from app.services.ai_studio import ai_studio_service
from app.services.entitlement_service import EntitlementService

router = APIRouter(prefix="/ai-studio", tags=["AI Listing Studio"])


@router.post("/generate", response_model=AIGeneratedListingResponse, status_code=status.HTTP_201_CREATED)
async def generate_product_listing(
    data: GenerateListingRequest,
    context: Annotated[TenantContext, Depends(require_permission(Permission.AI_GENERATE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> AIGeneratedListingResponse:
    """Generate high-converting, channel-compliant listing using AI based strictly on canonical product specs."""
    # Enforce AI credit entitlement
    await EntitlementService.check_ai_generation_limit(db, context.tenant.id)

    # Fetch product with variants
    res = await db.execute(
        select(Product)
        .where(
            Product.id == data.product_id,
            Product.tenant_id == context.tenant.id
        )
        .options(selectinload(Product.variants))
    )
    product = res.scalar_one_or_none()
    if not product:
        raise NotFoundException("Product", data.product_id)

    # Generate listing
    generated = await ai_studio_service.generate_listing(
        product=product,
        marketplace_code=data.marketplace_code,
        focus_keywords=data.focus_keywords,
        target_audience=data.target_audience,
    )

    # Save to database
    listing = AIGeneratedListing(
        tenant_id=context.tenant.id,
        product_id=product.id,
        marketplace_code=data.marketplace_code.upper(),
        title=generated["title"],
        bullet_points=generated["bullet_points"],
        description=generated["description"],
        search_terms=generated["search_terms"],
        attributes=generated["attributes"],
        model_used=generated.get("model_used", "gpt-4o-mini"),
        tokens_used=generated.get("tokens_used", 185),
        is_approved=False,
    )
    db.add(listing)

    await log_audit_event(
        db=db,
        action="ai.generate_listing",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="ai_listing",
        resource_id=str(listing.id),
        details={"marketplace": data.marketplace_code, "product_sku": product.sku},
        request=request,
    )

    await db.commit()
    await db.refresh(listing)

    # Record quota consumption
    await EntitlementService.record_ai_generation_usage(db, context.tenant.id, 1)

    return AIGeneratedListingResponse.model_validate(listing)


@router.get("/listings", response_model=List[AIGeneratedListingResponse])
async def list_generated_listings(
    context: Annotated[TenantContext, Depends(require_permission(Permission.AI_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)],
    product_id: Optional[uuid.UUID] = None,
    marketplace_code: Optional[str] = None,
) -> List[AIGeneratedListingResponse]:
    """List generated listings for products in workspace."""
    stmt = select(AIGeneratedListing).where(AIGeneratedListing.tenant_id == context.tenant.id)
    if product_id:
        stmt = stmt.where(AIGeneratedListing.product_id == product_id)
    if marketplace_code:
        stmt = stmt.where(AIGeneratedListing.marketplace_code == marketplace_code.upper())

    stmt = stmt.order_by(AIGeneratedListing.created_at.desc())
    res = await db.execute(stmt)
    return [AIGeneratedListingResponse.model_validate(l) for l in res.scalars().all()]


@router.post("/listings/{listing_id}/approve", response_model=AIGeneratedListingResponse)
async def approve_and_update_listing(
    listing_id: uuid.UUID,
    data: ApproveListingRequest,
    context: Annotated[TenantContext, Depends(require_permission(Permission.AI_GENERATE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> AIGeneratedListingResponse:
    """Seller reviews, edits, and marks AI listing approved for multi-marketplace publishing."""
    res = await db.execute(
        select(AIGeneratedListing).where(
            AIGeneratedListing.id == listing_id,
            AIGeneratedListing.tenant_id == context.tenant.id
        )
    )
    listing = res.scalar_one_or_none()
    if not listing:
        raise NotFoundException("AI Listing", listing_id)

    if data.title is not None:
        listing.title = data.title
    if data.bullet_points is not None:
        listing.bullet_points = data.bullet_points
    if data.description is not None:
        listing.description = data.description
    if data.search_terms is not None:
        listing.search_terms = data.search_terms
    if data.attributes is not None:
        listing.attributes = data.attributes
    listing.is_approved = data.is_approved

    await log_audit_event(
        db=db,
        action="ai.approve_listing",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="ai_listing",
        resource_id=str(listing.id),
        details={"approved": listing.is_approved, "marketplace": listing.marketplace_code},
        request=request,
    )

    await db.commit()
    await db.refresh(listing)
    return AIGeneratedListingResponse.model_validate(listing)
