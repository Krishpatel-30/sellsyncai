import uuid
from typing import Any, Dict, Optional, Type
from app.services.connectors.base import MarketplaceConnector
from app.services.connectors.shopify import ShopifyConnector
from app.services.connectors.woocommerce import WooCommerceConnector
from app.services.connectors.flipkart import FlipkartConnector
from app.services.connectors.enterprise_adapters import (
    MeeshoConnector,
    MyntraConnector,
    AJIOConnector,
)

CONNECTOR_REGISTRY: Dict[str, Type[MarketplaceConnector]] = {
    "SHOPIFY": ShopifyConnector,
    "WOOCOMMERCE": WooCommerceConnector,
    "FLIPKART": FlipkartConnector,
    "MEESHO": MeeshoConnector,
    "MYNTRA": MyntraConnector,
    "AJIO": AJIOConnector,
}


def get_marketplace_connector(
    marketplace_code: str,
    connection_id: uuid.UUID,
    credentials: Dict[str, Any],
    store_url: Optional[str] = None
) -> MarketplaceConnector:
    """Factory to instantiate the appropriate marketplace connector adapter."""
    code = marketplace_code.upper()
    connector_cls = CONNECTOR_REGISTRY.get(code)
    if not connector_cls:
        raise ValueError(f"No connector adapter implemented for marketplace code: {marketplace_code}")
    return connector_cls(connection_id=connection_id, credentials=credentials, store_url=store_url)


__all__ = [
    "MarketplaceConnector",
    "ShopifyConnector",
    "WooCommerceConnector",
    "FlipkartConnector",
    "MeeshoConnector",
    "MyntraConnector",
    "AJIOConnector",
    "get_marketplace_connector",
    "CONNECTOR_REGISTRY",
]

