import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """Test standard seller registration with workspace creation."""
    payload = {
        "email": "seller@example.com",
        "password": "StrongPassword123!",
        "full_name": "Rajesh Kumar",
        "workspace_name": "Rajesh Enterprises",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "seller@example.com"
    assert data["user"]["full_name"] == "Rajesh Kumar"
    assert data["active_tenant"]["name"] == "Rajesh Enterprises"
    assert data["role"] == "WORKSPACE_OWNER"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test registration fails with duplicate email."""
    payload = {
        "email": "duplicate@example.com",
        "password": "StrongPassword123!",
        "full_name": "Test Seller",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert res2.json()["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test user login with valid credentials."""
    # Register first
    await client.post("/api/v1/auth/register", json={
        "email": "login_test@example.com",
        "password": "SecretPassword123!",
        "full_name": "Amit Sharma",
        "workspace_name": "Amit Jewels",
    })

    # Login
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "login_test@example.com",
        "password": "SecretPassword123!",
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login_test@example.com"
    assert data["active_tenant"]["name"] == "Amit Jewels"
    assert data["role"] == "WORKSPACE_OWNER"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Test login failure with wrong password."""
    await client.post("/api/v1/auth/register", json={
        "email": "wrong_pw@example.com",
        "password": "CorrectPassword123!",
        "full_name": "Test User",
    })

    login_res = await client.post("/api/v1/auth/login", json={
        "email": "wrong_pw@example.com",
        "password": "IncorrectPassword999!",
    })
    assert login_res.status_code == 401
    assert login_res.json()["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient):
    """Test refresh token validation and rotation."""
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "refresh_user@example.com",
        "password": "Password123!",
        "full_name": "Refresh User",
    })
    old_refresh = reg_res.json()["refresh_token"]

    # Refresh
    ref_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert ref_res.status_code == 200
    new_data = ref_res.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data
    new_refresh = new_data["refresh_token"]
    assert new_refresh != old_refresh

    # Reusing the old refresh token must be rejected
    reuse_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert reuse_res.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    """Test profile retrieval for authenticated user."""
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "me_user@example.com",
        "password": "Password123!",
        "full_name": "Me User",
        "workspace_name": "My Shop",
    })
    token = reg_res.json()["access_token"]

    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["email"] == "me_user@example.com"
    assert len(data["workspaces"]) == 1
    assert data["workspaces"][0]["name"] == "My Shop"
    assert data["workspaces"][0]["role"] == "WORKSPACE_OWNER"


@pytest.mark.asyncio
async def test_google_auth_new_and_existing_user(client: AsyncClient):
    """Test Google sign-in for new user and returning user."""
    # 1. New Google user
    res1 = await client.post("/api/v1/auth/google", json={
        "email": "google.seller@gmail.com",
        "full_name": "Google Seller",
        "avatar_url": "https://lh3.googleusercontent.com/a/test-avatar",
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert "access_token" in data1
    assert "refresh_token" in data1
    assert data1["user"]["email"] == "google.seller@gmail.com"
    assert data1["user"]["full_name"] == "Google Seller"
    assert data1["role"] == "WORKSPACE_OWNER"
    assert "Google Seller's Store" in data1["active_tenant"]["name"]

    # 2. Existing Google user logging in again
    res2 = await client.post("/api/v1/auth/google", json={
        "email": "google.seller@gmail.com",
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["user"]["email"] == "google.seller@gmail.com"
    assert data2["active_tenant"]["id"] == data1["active_tenant"]["id"]

