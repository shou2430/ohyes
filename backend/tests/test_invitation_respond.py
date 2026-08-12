from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.invitation import Invitation
from app.models.notification import Notification


@pytest.mark.asyncio
async def test_respond_nonexistent_code_returns_404(client):
    """Respond endpoint returns 404 for non-existent short code."""
    response = await client.post(
        "/api/invitations/by-code/NOSUCH1/respond",
        json={"password": "test123", "name": "Test", "message": "Hello"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_respond_message_too_long_returns_422(client):
    """Respond endpoint returns 422 when message exceeds 30 characters."""
    response = await client.post(
        "/api/invitations/by-code/NOSUCH1/respond",
        json={"password": "test123", "name": "Test", "message": "A" * 31},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_respond_empty_body_is_valid(client):
    """Respond endpoint accepts request with null name and message."""
    response = await client.post(
        "/api/invitations/by-code/NOSUCH1/respond",
        json={"password": "test123"},
    )
    # Should be 404 (not found) not 422 (validation error) — name/message are optional
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_respond_missing_password_returns_422(client):
    """Respond endpoint returns 422 when the required password field is omitted."""
    response = await client.post(
        "/api/invitations/by-code/NOSUCH1/respond",
        json={},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_respond_creates_notification_and_deletes_invitation(
    client, db_session, seeded_user, tmp_path, monkeypatch
):
    """Integration: respond creates a notification and deletes invitation + photo."""
    monkeypatch.setattr(settings, "PHOTO_STORAGE_PATH", str(tmp_path))
    photo_path = tmp_path / "zyxwvut.webp"
    photo_path.write_bytes(b"\xff\xd8")

    invitation = Invitation(
        user_id=seeded_user.id,
        short_code="TSTRSP1",
        title="Dinner?",
        password="yes12345",
        photo_filename="zyxwvut.webp",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(invitation)
    await db_session.flush()

    response = await client.post(
        "/api/invitations/by-code/TSTRSP1/respond",
        json={"password": "yes12345", "name": "Amy", "message": "I love you"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Response recorded"

    result = await db_session.execute(
        select(Invitation).where(Invitation.short_code == "TSTRSP1")
    )
    assert result.scalar_one_or_none() is None

    result = await db_session.execute(
        select(Notification).where(Notification.user_id == seeded_user.id)
    )
    notifications = result.scalars().all()
    assert len(notifications) == 1
    notification = notifications[0]
    assert notification.invitation_title == "Dinner?"
    assert notification.recipient_name == "Amy"
    assert notification.recipient_message == "I love you"
    assert notification.is_read is False

    assert not photo_path.exists()
