import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_team_invite_and_accept_flow(client: AsyncClient):
    """Test full cycle: invite user, accept invitation, join workspace."""
    # 1. Owner registers
    owner_reg = await client.post("/api/v1/auth/register", json={
        "email": "owner@retail.com",
        "password": "Password123!",
        "full_name": "Store Owner",
        "workspace_name": "Retail Hub",
    })
    owner_token = owner_reg.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # 2. Member registers
    member_reg = await client.post("/api/v1/auth/register", json={
        "email": "manager@retail.com",
        "password": "Password123!",
        "full_name": "Inventory Manager",
        "workspace_name": "Personal Store",
    })
    member_token = member_reg.json()["access_token"]
    member_headers = {"Authorization": f"Bearer {member_token}"}

    # 3. Owner invites member as INVENTORY_MANAGER
    invite_res = await client.post(
        "/api/v1/team/invite",
        json={"email": "manager@retail.com", "role": "INVENTORY_MANAGER"},
        headers=owner_headers
    )
    assert invite_res.status_code == 201
    invite_data = invite_res.json()
    raw_token = invite_data["token"]
    assert invite_data["role"] == "INVENTORY_MANAGER"

    # 4. Member accepts invitation
    accept_res = await client.post(
        "/api/v1/team/accept-invite",
        json={"token": raw_token},
        headers=member_headers
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["role"] == "INVENTORY_MANAGER"

    # 5. Verify member is listed in team members
    members_res = await client.get("/api/v1/team/members", headers=owner_headers)
    assert members_res.status_code == 200
    team = members_res.json()
    assert len(team) == 2
    emails = [m["user"]["email"] for m in team]
    assert "owner@retail.com" in emails
    assert "manager@retail.com" in emails


@pytest.mark.asyncio
async def test_rbac_permission_enforcement(client: AsyncClient):
    """Test that a VIEWER role cannot invite team members or modify workspace."""
    # 1. Owner registers
    owner_reg = await client.post("/api/v1/auth/register", json={
        "email": "head@brand.com",
        "password": "Password123!",
        "full_name": "Brand Head",
        "workspace_name": "Brand Store",
    })
    owner_token = owner_reg.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    brand_tenant_id = owner_reg.json()["active_tenant"]["id"]

    # 2. Viewer registers
    viewer_reg = await client.post("/api/v1/auth/register", json={
        "email": "intern@brand.com",
        "password": "Password123!",
        "full_name": "Store Intern",
    })
    viewer_token = viewer_reg.json()["access_token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # 3. Owner invites intern as VIEWER
    invite_res = await client.post(
        "/api/v1/team/invite",
        json={"email": "intern@brand.com", "role": "VIEWER"},
        headers=owner_headers
    )
    raw_token = invite_res.json()["token"]

    # 4. Intern accepts invitation
    await client.post(
        "/api/v1/team/accept-invite",
        json={"token": raw_token},
        headers=viewer_headers
    )

    # 5. Intern switches or scopes context to Brand Store
    viewer_context_headers = {
        "Authorization": f"Bearer {viewer_token}",
        "X-Tenant-ID": brand_tenant_id,
    }

    # 6. Intern attempts to invite someone else -> must be 403 Forbidden!
    unauth_invite = await client.post(
        "/api/v1/team/invite",
        json={"email": "thirdparty@brand.com", "role": "VIEWER"},
        headers=viewer_context_headers
    )
    assert unauth_invite.status_code == 403
    assert unauth_invite.json()["code"] == "FORBIDDEN"

    # 7. Intern attempts to modify workspace name -> must be 403 Forbidden!
    unauth_ws_update = await client.patch(
        "/api/v1/workspaces/current",
        json={"name": "Hacked Brand Name"},
        headers=viewer_context_headers
    )
    assert unauth_ws_update.status_code == 403
    assert unauth_ws_update.json()["code"] == "FORBIDDEN"

