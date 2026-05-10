import pytest


@pytest.mark.asyncio
async def test_respond_nonexistent_code_returns_404(client):
    """Respond endpoint returns 404 for non-existent short code."""
    response = await client.post(
        "/api/invitations/by-code/NOSUCH1/respond",
        json={"name": "Test", "message": "Hello"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_respond_message_too_long_returns_422(client):
    """Respond endpoint returns 422 when message exceeds 30 characters."""
    response = await client.post(
        "/api/invitations/by-code/NOSUCH1/respond",
        json={"name": "Test", "message": "A" * 31},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_respond_empty_body_is_valid(client):
    """Respond endpoint accepts request with null name and message."""
    response = await client.post(
        "/api/invitations/by-code/NOSUCH1/respond",
        json={},
    )
    # Should be 404 (not found) not 422 (validation error) — empty fields are optional
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_respond_creates_notification_and_deletes_invitation(client):
    """Full integration test: respond creates notification and deletes invitation + photo."""
    # This test requires a seeded invitation in the database.
    # Stub: will be fleshed out when test DB infrastructure is available.
    pass
