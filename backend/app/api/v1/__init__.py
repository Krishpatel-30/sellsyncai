from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.tenants import router as tenants_router
from app.api.v1.team import router as team_router
from app.api.v1.audit import router as audit_router
from app.api.v1.health import router as health_router
from app.api.v1.marketplaces import router as marketplaces_router
from app.api.v1.products import router as products_router
from app.api.v1.ai import router as ai_router
from app.api.v1.inventory import router as inventory_router
from app.api.v1.orders import router as orders_router
from app.api.v1.billing import router as billing_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(tenants_router)
api_v1_router.include_router(team_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(marketplaces_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(inventory_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(billing_router)

__all__ = ["api_v1_router"]
