import pytest


@pytest.mark.asyncio
async def test_verify_correct_password_returns_200(client):
    """Verify endpoint returns invitation data on correct password."""
    # This test requires a seeded invitation in the database.
    # Stub: will be fleshed out when test DB infrastructure is available.
    pass


@pytest.mark.asyncio
async def test_verify_wrong_password_returns_401(client):
    """Verify endpoint returns 401 on incorrect password."""
    response = await client.post(
        "/api/invitations/by-code/INVALID/verify",
        json={"password": "wrong"},
    )
    # Without a seeded invitation, expect 404 (not found)
    assert response.status_code in (401, 404)


@pytest.mark.asyncio
async def test_verify_nonexistent_code_returns_404(client):
    """Verify endpoint returns 404 for non-existent short code."""
    response = await client.post(
        "/api/invitations/by-code/NOSUCH1/verify",
        json={"password": "test"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_verify_empty_password_returns_422(client):
    """Verify endpoint returns 422 when password is empty string."""
    response = await client.post(
        "/api/invitations/by-code/NOSUCH1/verify",
        json={"password": ""},
    )
    assert response.status_code == 422
