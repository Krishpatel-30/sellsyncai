from enum import Enum
from typing import Dict, List, Set, Union


class Role(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    WORKSPACE_OWNER = "WORKSPACE_OWNER"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    PRODUCT_MANAGER = "PRODUCT_MANAGER"
    INVENTORY_MANAGER = "INVENTORY_MANAGER"
    ORDER_MANAGER = "ORDER_MANAGER"
    VIEWER = "VIEWER"


class Permission(str, Enum):
    # Workspace & Billing
    WORKSPACE_MANAGE = "workspace:manage"
    WORKSPACE_VIEW = "workspace:view"
    BILLING_MANAGE = "billing:manage"
    BILLING_VIEW = "billing:view"

    # Team & RBAC
    TEAM_MANAGE = "team:manage"
    TEAM_VIEW = "team:view"

    # Products & Catalogue
    PRODUCT_CREATE = "product:create"
    PRODUCT_EDIT = "product:edit"
    PRODUCT_DELETE = "product:delete"
    PRODUCT_VIEW = "product:view"
    PRODUCT_IMPORT = "product:import"

    # AI Listing Studio
    AI_GENERATE = "ai:generate"
    AI_VIEW = "ai:view"

    # Marketplace Integrations & Publishing
    MARKETPLACE_CONNECT = "marketplace:connect"
    MARKETPLACE_PUBLISH = "marketplace:publish"
    MARKETPLACE_VIEW = "marketplace:view"

    # Inventory
    INVENTORY_MANAGE = "inventory:manage"
    INVENTORY_VIEW = "inventory:view"

    # Orders
    ORDER_MANAGE = "order:manage"
    ORDER_VIEW = "order:view"

    # Audit & Analytics
    ANALYTICS_VIEW = "analytics:view"
    AUDIT_VIEW = "audit:view"

    # Super Admin Global
    SUPERADMIN_MANAGE = "superadmin:manage"


# Granular Role to Permission Mapping
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.SUPER_ADMIN: set(Permission),  # All permissions
    
    Role.WORKSPACE_OWNER: {
        Permission.WORKSPACE_MANAGE,
        Permission.WORKSPACE_VIEW,
        Permission.BILLING_MANAGE,
        Permission.BILLING_VIEW,
        Permission.TEAM_MANAGE,
        Permission.TEAM_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_EDIT,
        Permission.PRODUCT_DELETE,
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_IMPORT,
        Permission.AI_GENERATE,
        Permission.AI_VIEW,
        Permission.MARKETPLACE_CONNECT,
        Permission.MARKETPLACE_PUBLISH,
        Permission.MARKETPLACE_VIEW,
        Permission.INVENTORY_MANAGE,
        Permission.INVENTORY_VIEW,
        Permission.ORDER_MANAGE,
        Permission.ORDER_VIEW,
        Permission.ANALYTICS_VIEW,
        Permission.AUDIT_VIEW,
    },
    
    Role.ADMIN: {
        Permission.WORKSPACE_VIEW,
        Permission.BILLING_VIEW,
        Permission.TEAM_MANAGE,
        Permission.TEAM_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_EDIT,
        Permission.PRODUCT_DELETE,
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_IMPORT,
        Permission.AI_GENERATE,
        Permission.AI_VIEW,
        Permission.MARKETPLACE_CONNECT,
        Permission.MARKETPLACE_PUBLISH,
        Permission.MARKETPLACE_VIEW,
        Permission.INVENTORY_MANAGE,
        Permission.INVENTORY_VIEW,
        Permission.ORDER_MANAGE,
        Permission.ORDER_VIEW,
        Permission.ANALYTICS_VIEW,
        Permission.AUDIT_VIEW,
    },

    Role.MANAGER: {
        Permission.WORKSPACE_VIEW,
        Permission.TEAM_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_EDIT,
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_IMPORT,
        Permission.AI_GENERATE,
        Permission.AI_VIEW,
        Permission.MARKETPLACE_PUBLISH,
        Permission.MARKETPLACE_VIEW,
        Permission.INVENTORY_MANAGE,
        Permission.INVENTORY_VIEW,
        Permission.ORDER_MANAGE,
        Permission.ORDER_VIEW,
        Permission.ANALYTICS_VIEW,
    },

    Role.PRODUCT_MANAGER: {
        Permission.WORKSPACE_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_EDIT,
        Permission.PRODUCT_DELETE,
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_IMPORT,
        Permission.AI_GENERATE,
        Permission.AI_VIEW,
        Permission.MARKETPLACE_PUBLISH,
        Permission.MARKETPLACE_VIEW,
    },

    Role.INVENTORY_MANAGER: {
        Permission.WORKSPACE_VIEW,
        Permission.PRODUCT_VIEW,
        Permission.INVENTORY_MANAGE,
        Permission.INVENTORY_VIEW,
        Permission.MARKETPLACE_VIEW,
    },

    Role.ORDER_MANAGER: {
        Permission.WORKSPACE_VIEW,
        Permission.PRODUCT_VIEW,
        Permission.ORDER_MANAGE,
        Permission.ORDER_VIEW,
        Permission.MARKETPLACE_VIEW,
    },

    Role.VIEWER: {
        Permission.WORKSPACE_VIEW,
        Permission.PRODUCT_VIEW,
        Permission.MARKETPLACE_VIEW,
        Permission.INVENTORY_VIEW,
        Permission.ORDER_VIEW,
        Permission.ANALYTICS_VIEW,
    },
}


def has_permission(role: Union[Role, str], permission: Permission) -> bool:
    """Check if a given role has a specific permission."""
    try:
        r = Role(role) if isinstance(role, str) else role
    except ValueError:
        return False
    return permission in ROLE_PERMISSIONS.get(r, set())
