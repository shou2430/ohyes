from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models.notification import Notification

XFAIL_REASON = "GET/POST /api/notifications land in 04-02 and 04-03"


@pytest.mark.asyncio
@pytest.mark.xfail(reason=XFAIL_REASON, strict=True)
async def test_list_returns_unread(client, db_session, seeded_user, auth_headers):
    """NOTF-01: GET /api/notifications reports is_read flags, newest first."""
    now = datetime.now(timezone.utc)
    unread = Notification(
        user_id=seeded_user.id,
        invitation_title="Movie night?",
        recipient_name="Amy",
        recipient_message="Yes!",
        is_read=False,
        created_at=now,
    )
    read = Notification(
        user_id=seeded_user.id,
        invitation_title="Dinner?",
        recipient_name="Bo",
        recipient_message=None,
        is_read=True,
        created_at=now - timedelta(hours=1),
    )
    db_session.add_all([unread, read])
    await db_session.flush()

    response = await client.get("/api/notifications", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert any(item["is_read"] is False for item in body)
    # Newest created_at first
    assert body[0]["invitation_title"] == "Movie night?"
    assert body[1]["invitation_title"] == "Dinner?"


@pytest.mark.asyncio
@pytest.mark.xfail(reason=XFAIL_REASON, strict=True)
async def test_list_scoped_to_owner(
    client, db_session, seeded_user, second_user, auth_headers, second_auth_headers
):
    """NOTF-02 (T-04-IDOR): GET /api/notifications never leaks another user's rows."""
    now = datetime.now(timezone.utc)
    owner_a_notification = Notification(
        user_id=seeded_user.id,
        invitation_title="Owner A title",
        recipient_name="Amy",
        recipient_message="Yes!",
        is_read=False,
        created_at=now,
    )
    owner_b_notification = Notification(
        user_id=second_user.id,
        invitation_title="Owner B title",
        recipient_name="Bo",
        recipient_message="Sure!",
        is_read=False,
        created_at=now,
    )
    db_session.add_all([owner_a_notification, owner_b_notification])
    await db_session.flush()

    response_b = await client.get("/api/notifications", headers=second_auth_headers)
    assert response_b.status_code == 200
    body_b = response_b.json()
    assert len(body_b) == 1
    assert body_b[0]["invitation_title"] == "Owner B title"
    assert all(item["invitation_title"] != "Owner A title" for item in body_b)

    response_a = await client.get("/api/notifications", headers=auth_headers)
    assert response_a.status_code == 200
    body_a = response_a.json()
    assert len(body_a) == 1
    assert body_a[0]["invitation_title"] == "Owner A title"
    assert all(item["invitation_title"] != "Owner B title" for item in body_a)


@pytest.mark.asyncio
@pytest.mark.xfail(reason=XFAIL_REASON, strict=True)
async def test_mark_all_read(
    client, db_session, seeded_user, second_user, auth_headers
):
    """NOTF-03 (T-04-IDOR): POST /notifications/read only marks the caller's rows."""
    now = datetime.now(timezone.utc)
    seeded_unread_1 = Notification(
        user_id=seeded_user.id,
        invitation_title="Movie night?",
        recipient_name="Amy",
        recipient_message="Yes!",
        is_read=False,
        created_at=now,
    )
    seeded_unread_2 = Notification(
        user_id=seeded_user.id,
        invitation_title="Dinner?",
        recipient_name="Bo",
        recipient_message=None,
        is_read=False,
        created_at=now,
    )
    other_unread = Notification(
        user_id=second_user.id,
        invitation_title="Owner B title",
        recipient_name="Cy",
        recipient_message=None,
        is_read=False,
        created_at=now,
    )
    db_session.add_all([seeded_unread_1, seeded_unread_2, other_unread])
    await db_session.flush()

    response = await client.post("/api/notifications/read", headers=auth_headers)
    assert response.status_code == 200

    result = await db_session.execute(
        select(Notification).where(Notification.user_id == seeded_user.id)
    )
    for notification in result.scalars().all():
        assert notification.is_read is True

    result = await db_session.execute(
        select(Notification).where(Notification.user_id == second_user.id)
    )
    other = result.scalar_one()
    assert other.is_read is False
