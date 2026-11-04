import abc
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.models.product import Product, ProductVariant
from app.models.ai import AIGeneratedListing


class MarketplaceConnector(abc.ABC):
    """
    Abstract base interface for all external ecommerce marketplace integrations.
    Each marketplace connector encapsulates platform authentication, schema translation,
    inventory synchronization, and order ingestion.
    """

    def __init__(self, connection_id: uuid.UUID, credentials: Dict[str, Any], store_url: Optional[str] = None):
        self.connection_id = connection_id
        self.credentials = credentials
        self.store_url = store_url.rstrip("/") if store_url else None

    @property
    @abc.abstractmethod
    def marketplace_code(self) -> str:
        """Uppercase platform identifier (SHOPIFY, WOOCOMMERCE, FLIPKART, MEESHO, MYNTRA, AJIO)."""
        pass

    @property
    @abc.abstractmethod
    def is_live_ready(self) -> bool:
        """Indicates if official authorized API access is production-certified."""
        pass

    @abc.abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test API authentication and handshake with the marketplace."""
        pass

    @abc.abstractmethod
    async def publish_product(
        self,
        product: Product,
        variants: List[ProductVariant],
        ai_listing: Optional[AIGeneratedListing] = None
    ) -> Dict[str, Any]:
        """Publish canonical product and variants to the marketplace."""
        pass

    @abc.abstractmethod
    async def sync_inventory(self, sku: str, available_quantity: int) -> Dict[str, Any]:
        """Push atomic available quantity to the marketplace for a given SKU."""
        pass

    @abc.abstractmethod
    async def fetch_orders(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Pull recent orders from the marketplace into the canonical format."""
        pass

    @abc.abstractmethod
    async def update_order_tracking(
        self,
        marketplace_order_id: str,
        tracking_number: str,
        courier_name: str
    ) -> Dict[str, Any]:
        """Dispatch shipping tracking information to the marketplace."""
        pass

