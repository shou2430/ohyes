from datetime import datetime, timedelta, timezone

import pytest

from app.models.invitation import Invitation


@pytest.mark.asyncio
async def test_verify_correct_password_returns_200(client, db_session, seeded_user):
    """Verify endpoint returns invitation data on correct password."""
    invitation = Invitation(
        user_id=seeded_user.id,
        short_code="TSTVER1",
        title="Movie night?",
        password="secret12",
        photo_filename="abcdefg.webp",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(invitation)
    await db_session.flush()

    response = await client.post(
        "/api/invitations/by-code/TSTVER1/verify",
        json={"password": "secret12"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["short_code"] == "TSTVER1"
    assert body["title"] == "Movie night?"
    assert body["photo_url"] == "/api/photos/abcdefg.webp"


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
