import pytest


@pytest.mark.asyncio
async def test_login_redirects_to_google(client):
    """AUTH-01: /api/auth/login should redirect to Google OAuth."""
    response = await client.get("/api/auth/login", follow_redirects=False)
    assert response.status_code in (302, 303, 307)
    assert "accounts.google.com" in response.headers.get("location", "")


@pytest.mark.asyncio
async def test_me_returns_401_without_token(client):
    """AUTH-02: /api/auth/me should return 401/403 without Bearer token."""
    response = await client.get("/api/auth/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_logout_returns_success(client):
    """AUTH-03: /api/auth/logout should return 200 with message."""
    response = await client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out"
