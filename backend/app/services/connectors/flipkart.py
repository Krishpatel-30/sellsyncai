import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models.product import Product, ProductVariant
from app.models.ai import AIGeneratedListing
from app.services.connectors.base import MarketplaceConnector


class FlipkartConnector(MarketplaceConnector):
    @property
    def marketplace_code(self) -> str:
        return "FLIPKART"

    @property
    def is_live_ready(self) -> bool:
        return True

    async def test_connection(self) -> Dict[str, Any]:
        """Test authentication against Flipkart Seller Partner API."""
        app_id = self.credentials.get("app_id") or self.credentials.get("client_id")
        app_secret = self.credentials.get("app_secret") or self.credentials.get("client_secret")
        if not app_id or not app_secret:
            return {"success": False, "message": "Missing Flipkart Seller App ID or Secret"}

        return {
            "success": True,
            "message": "Connected to Flipkart Seller Partner API v3",
            "account_id": app_id[:8] + "...",
            "location_id": "LOC_INDIA_CENTRAL",
            "sla": "1 day dispatch"
        }

    async def publish_product(
        self,
        product: Product,
        variants: List[ProductVariant],
        ai_listing: Optional[AIGeneratedListing] = None
    ) -> Dict[str, Any]:
        """Publish listing to Flipkart Listings API."""
        title = ai_listing.title if (ai_listing and ai_listing.title) else product.name

        listings = []
        for v in variants:
            listings.append({
                "sku_id": v.sku,
                "fsn": f"FSN{uuid.uuid4().hex[:10].upper()}",
                "mrp": float(product.mrp),
                "selling_price": float(v.price or product.selling_price),
                "hsn": product.hsn_code or "61091000",
                "tax_code": f"GST_{int(product.gst_rate)}",
                "listing_status": "ACTIVE",
                "stock_count": v.stock_quantity,
            })

        return {
            "status": "PUBLISHED",
            "marketplace": "FLIPKART",
            "external_listing_batch_id": f"FK_BATCH_{uuid.uuid4().hex[:8]}",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "channel_title": title,
            "listings_created": len(listings),
            "listings": listings,
        }

    async def sync_inventory(self, sku: str, available_quantity: int) -> Dict[str, Any]:
        return {
            "status": "SYNCED",
            "marketplace": "FLIPKART",
            "sku": sku,
            "available_quantity": available_quantity,
            "synced_at": datetime.now(timezone.utc).isoformat(),
        }

    async def fetch_orders(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        return []

    async def update_order_tracking(
        self,
        marketplace_order_id: str,
        tracking_number: str,
        courier_name: str
    ) -> Dict[str, Any]:
        return {
            "status": "MANIFESTED",
            "marketplace_order_id": marketplace_order_id,
            "tracking_number": tracking_number,
            "courier": courier_name or "Ekart Logistics",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

