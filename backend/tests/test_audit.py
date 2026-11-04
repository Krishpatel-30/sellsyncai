import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_audit_logs_generation(client: AsyncClient):
    """Test that authentication, workspace and team actions generate immutable audit logs."""
    # Register
    reg = await client.post("/api/v1/auth/register", json={
        "email": "audit_tester@example.com",
        "password": "Password123!",
        "full_name": "Audit Tester",
        "workspace_name": "Audit Workspace",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Invite a member (triggers team.invite audit log)
    await client.post(
        "/api/v1/team/invite",
        json={"email": "colleague@example.com", "role": "MANAGER"},
        headers=headers
    )

    # Fetch audit logs
    audit_res = await client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 2
    actions = [l["action"] for l in logs]
    assert "auth.register" in actions
    assert "team.invite" in actions

