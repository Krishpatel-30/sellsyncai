import uuid
from datetime import datetime, timezone
from typing import Annotated, List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import TenantContext, get_current_tenant_context, get_current_user, require_permission
from app.core.audit import log_audit_event
from app.core.encryption import decrypt_data, encrypt_data, mask_credential
from app.core.exceptions import ConflictException, NotFoundException
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.marketplace import IntegrationCredential, Marketplace, MarketplaceConnection
from app.models.user import User
from app.schemas.marketplace import (
    MarketplaceConnectionCreate,
    MarketplaceConnectionResponse,
    MarketplaceConnectionUpdate,
    MarketplaceResponse,
    TestConnectionResponse,
)
from app.services.marketplace_service import marketplace_service
from app.services.entitlement_service import EntitlementService

router = APIRouter(prefix="/marketplaces", tags=["Marketplace Integrations"])


@router.get("", response_model=List[MarketplaceResponse])
async def list_available_marketplaces(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[MarketplaceResponse]:
    """List all supported marketplace platforms (Shopify, Flipkart, WooCommerce, etc.)."""
    await marketplace_service.seed_marketplaces_if_needed(db)
    res = await db.execute(select(Marketplace).where(Marketplace.is_active == True))
    return [MarketplaceResponse.model_validate(m) for m in res.scalars().all()]


@router.get("/connections", response_model=List[MarketplaceConnectionResponse])
async def list_marketplace_connections(
    context: Annotated[TenantContext, Depends(require_permission(Permission.MARKETPLACE_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[MarketplaceConnectionResponse]:
    """List all connected marketplace accounts for the active workspace."""
    res = await db.execute(
        select(MarketplaceConnection)
        .where(MarketplaceConnection.tenant_id == context.tenant.id)
        .options(
            selectinload(MarketplaceConnection.marketplace),
            selectinload(MarketplaceConnection.credential)
        )
        .order_by(MarketplaceConnection.created_at.desc())
    )
    connections = res.scalars().all()

    items = []
    for c in connections:
        masked = {}
        if c.credential and c.credential.encrypted_payload:
            creds = decrypt_data(c.credential.encrypted_payload)
            masked = {k: mask_credential(str(v)) for k, v in creds.items()}

        items.append(
            MarketplaceConnectionResponse(
                id=c.id,
                tenant_id=c.tenant_id,
                marketplace_id=c.marketplace_id,
                marketplace_code=c.marketplace.code if c.marketplace else "UNKNOWN",
                marketplace_name=c.marketplace.name if c.marketplace else "Unknown Channel",
                account_name=c.account_name,
                store_url=c.store_url,
                status=c.status,
                is_active=c.is_active,
                masked_credentials=masked,
                error_message=c.error_message,
                last_synced_at=c.last_synced_at,
                created_at=c.created_at,
            )
        )
    return items


@router.post("/connections", response_model=MarketplaceConnectionResponse, status_code=status.HTTP_201_CREATED)
async def connect_marketplace_account(
    data: MarketplaceConnectionCreate,
    context: Annotated[TenantContext, Depends(require_permission(Permission.MARKETPLACE_CONNECT))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> MarketplaceConnectionResponse:
    """Connect a new marketplace account using API credentials stored with AES-256 encryption."""
    # Enforce SaaS subscription marketplace connection limit
    await EntitlementService.check_marketplace_limit(db, context.tenant.id)

    # Find marketplace
    mp_res = await db.execute(select(Marketplace).where(Marketplace.code == data.marketplace_code.upper()))
    marketplace = mp_res.scalar_one_or_none()
    if not marketplace:
        await marketplace_service.seed_marketplaces_if_needed(db)
        mp_res = await db.execute(select(Marketplace).where(Marketplace.code == data.marketplace_code.upper()))
        marketplace = mp_res.scalar_one_or_none()
        if not marketplace:
            raise NotFoundException("Marketplace platform", data.marketplace_code)

    # Check for duplicate account name in this workspace
    existing_res = await db.execute(
        select(MarketplaceConnection).where(
            MarketplaceConnection.tenant_id == context.tenant.id,
            MarketplaceConnection.marketplace_id == marketplace.id,
            MarketplaceConnection.account_name == data.account_name
        )
    )
    if existing_res.scalar_one_or_none():
        raise ConflictException(f"Account '{data.account_name}' already exists for {marketplace.name}")

    # Validate credentials
    valid, message = marketplace_service.validate_and_test_credentials(
        marketplace_code=marketplace.code,
        credentials=data.credentials,
        store_url=data.store_url
    )
    if not valid:
        raise ConflictException(f"Marketplace authentication failed: {message}")

    # Create connection record
    connection = MarketplaceConnection(
        tenant_id=context.tenant.id,
        marketplace_id=marketplace.id,
        account_name=data.account_name,
        store_url=data.store_url,
        status="CONNECTED",
        is_active=True,
        last_synced_at=datetime.now(timezone.utc),
    )
    db.add(connection)
    await db.flush()

    # Store encrypted credentials
    encrypted_str = encrypt_data(data.credentials)
    cred = IntegrationCredential(
        connection_id=connection.id,
        encrypted_payload=encrypted_str,
    )
    db.add(cred)

    await log_audit_event(
        db=db,
        action="marketplace.connect",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="marketplace_connection",
        resource_id=str(connection.id),
        details={"marketplace": marketplace.name, "account": connection.account_name},
        request=request,
    )

    await db.commit()
    await db.refresh(connection)

    masked = {k: mask_credential(str(v)) for k, v in data.credentials.items()}

    return MarketplaceConnectionResponse(
        id=connection.id,
        tenant_id=connection.tenant_id,
        marketplace_id=connection.marketplace_id,
        marketplace_code=marketplace.code,
        marketplace_name=marketplace.name,
        account_name=connection.account_name,
        store_url=connection.store_url,
        status=connection.status,
        is_active=connection.is_active,
        masked_credentials=masked,
        error_message=None,
        last_synced_at=connection.last_synced_at,
        created_at=connection.created_at,
    )


@router.post("/connections/{connection_id}/test", response_model=TestConnectionResponse)
async def test_connection(
    connection_id: uuid.UUID,
    context: Annotated[TenantContext, Depends(require_permission(Permission.MARKETPLACE_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TestConnectionResponse:
    """Test live connectivity for a connected marketplace account."""
    res = await db.execute(
        select(MarketplaceConnection)
        .where(
            MarketplaceConnection.id == connection_id,
            MarketplaceConnection.tenant_id == context.tenant.id
        )
        .options(
            selectinload(MarketplaceConnection.marketplace),
            selectinload(MarketplaceConnection.credential)
        )
    )
    conn = res.scalar_one_or_none()
    if not conn:
        raise NotFoundException("Marketplace connection", connection_id)

    creds = {}
    if conn.credential and conn.credential.encrypted_payload:
        creds = decrypt_data(conn.credential.encrypted_payload)

    success, message = marketplace_service.validate_and_test_credentials(
        marketplace_code=conn.marketplace.code if conn.marketplace else "SHOPIFY",
        credentials=creds,
        store_url=conn.store_url
    )

    conn.status = "CONNECTED" if success else "ERROR"
    conn.error_message = None if success else message
    conn.last_synced_at = datetime.now(timezone.utc)
    await db.commit()

    return TestConnectionResponse(
        success=success,
        message=message,
        status=conn.status,
        timestamp=datetime.now(timezone.utc),
    )


@router.delete("/connections/{connection_id}", status_code=status.HTTP_200_OK)
async def disconnect_marketplace(
    connection_id: uuid.UUID,
    context: Annotated[TenantContext, Depends(require_permission(Permission.MARKETPLACE_CONNECT))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Disconnect and delete a marketplace integration."""
    res = await db.execute(
        select(MarketplaceConnection).where(
            MarketplaceConnection.id == connection_id,
            MarketplaceConnection.tenant_id == context.tenant.id
        )
    )
    conn = res.scalar_one_or_none()
    if not conn:
        raise NotFoundException("Marketplace connection", connection_id)

    await db.delete(conn)

    await log_audit_event(
        db=db,
        action="marketplace.disconnect",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="marketplace_connection",
        resource_id=str(connection_id),
        details={"account_name": conn.account_name},
        request=request,
    )

    await db.commit()
    return {"message": "Marketplace account successfully disconnected"}
