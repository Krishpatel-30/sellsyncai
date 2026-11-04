import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_workspaces(client: AsyncClient):
    """Test creating additional workspaces and listing them."""
    reg = await client.post("/api/v1/auth/register", json={
        "email": "multi_ws@example.com",
        "password": "Password123!",
        "full_name": "Multi Seller",
        "workspace_name": "Store One",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create second workspace
    create_res = await client.post(
        "/api/v1/workspaces",
        json={"name": "Store Two"},
        headers=headers
    )
    assert create_res.status_code == 201
    store2 = create_res.json()
    assert store2["name"] == "Store Two"

    # List workspaces
    list_res = await client.get("/api/v1/workspaces", headers=headers)
    assert list_res.status_code == 200
    workspaces = list_res.json()
    assert len(workspaces) == 2
    names = [w["name"] for w in workspaces]
    assert "Store One" in names
    assert "Store Two" in names


@pytest.mark.asyncio
async def test_tenant_isolation_boundary(client: AsyncClient):
    """Verify that User A cannot access or manipulate User B's workspace."""
    # User A
    user_a = await client.post("/api/v1/auth/register", json={
        "email": "usera@example.com",
        "password": "Password123!",
        "full_name": "User Alpha",
        "workspace_name": "Alpha Corp",
    })
    token_a = user_a.json()["access_token"]
    tenant_a_id = user_a.json()["active_tenant"]["id"]

    # User B
    user_b = await client.post("/api/v1/auth/register", json={
        "email": "userb@example.com",
        "password": "Password123!",
        "full_name": "User Beta",
        "workspace_name": "Beta LLC",
    })
    token_b = user_b.json()["access_token"]
    tenant_b_id = user_b.json()["active_tenant"]["id"]

    # User B attempts to access Workspace A using X-Tenant-ID header
    unauth_access = await client.get(
        "/api/v1/workspaces/current",
        headers={
            "Authorization": f"Bearer {token_b}",
            "X-Tenant-ID": tenant_a_id,
        }
    )
    assert unauth_access.status_code == 403
    assert unauth_access.json()["code"] == "TENANT_ACCESS_DENIED"

    # User B attempts to switch to Workspace A
    switch_res = await client.post(
        "/api/v1/auth/switch-workspace",
        json={"tenant_id": tenant_a_id},
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert switch_res.status_code == 403
    assert switch_res.json()["code"] == "TENANT_ACCESS_DENIED"


@pytest.mark.asyncio
async def test_update_workspace_metadata(client: AsyncClient):
    """Test updating workspace details with proper permission."""
    reg = await client.post("/api/v1/auth/register", json={
        "email": "updater@example.com",
        "password": "Password123!",
        "full_name": "Workspace Updater",
        "workspace_name": "Initial Name",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    update_res = await client.patch(
        "/api/v1/workspaces/current",
        json={"name": "Updated Store Name", "currency": "INR"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Store Name"

