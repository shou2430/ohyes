import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, text

from app.core.config import settings
from app.core.database import engine
from app.models.invitation import Invitation
from app.models.notification import Notification

CLEANUP_XFAIL_REASON = "app/tasks/cleanup.py lands in 04-04"


@pytest.mark.asyncio
async def test_asyncio_scheduler_runs_coroutine_job():
    """Retires 04-RESEARCH.md Open Question 1: a bare `async def` job is accepted
    by `AsyncIOScheduler.add_job()` directly and fires on the running event loop,
    with no `asyncio.ensure_future` wrapper and no sync shim."""
    scheduler = AsyncIOScheduler()
    fired = asyncio.Event()

    async def job():
        fired.set()

    scheduler.add_job(job, "interval", seconds=0.2, id="smoke_test_job")
    scheduler.start()
    try:
        await asyncio.wait_for(fired.wait(), timeout=5)
    finally:
        scheduler.shutdown(wait=False)

    assert fired.is_set()


@pytest.mark.asyncio
@pytest.mark.xfail(reason=CLEANUP_XFAIL_REASON, strict=True)
async def test_sweep_deletes_expired_invitation_and_photo(
    db_session, seeded_user, tmp_path, monkeypatch
):
    """INV-07: hourly sweep deletes expired invitations + their photo file, and
    notifications older than 30 days — surviving rows are left untouched."""
    from app.tasks.cleanup import run_cleanup

    monkeypatch.setattr(settings, "PHOTO_STORAGE_PATH", str(tmp_path))

    now = datetime.now(timezone.utc)

    expired_photo = tmp_path / "expired1.webp"
    expired_photo.write_bytes(b"\xff\xd8")
    active_photo = tmp_path / "active1.webp"
    active_photo.write_bytes(b"\xff\xd8")

    expired_invitation = Invitation(
        user_id=seeded_user.id,
        short_code="EXPIRE1",
        title="Expired?",
        password="test1234",
        photo_filename="expired1.webp",
        expires_at=now - timedelta(days=1),
    )
    active_invitation = Invitation(
        user_id=seeded_user.id,
        short_code="ACTIVE1",
        title="Active?",
        password="test1234",
        photo_filename="active1.webp",
        expires_at=now + timedelta(days=6),
    )
    old_notification = Notification(
        user_id=seeded_user.id,
        invitation_title="Old notification",
        recipient_name="Amy",
        recipient_message="Yes!",
        is_read=False,
        created_at=now - timedelta(days=31),
    )
    recent_notification = Notification(
        user_id=seeded_user.id,
        invitation_title="Recent notification",
        recipient_name="Bo",
        recipient_message="Sure!",
        is_read=False,
        created_at=now - timedelta(days=29),
    )
    db_session.add_all(
        [expired_invitation, active_invitation, old_notification, recent_notification]
    )
    await db_session.flush()

    await run_cleanup()

    result = await db_session.execute(
        select(Invitation).where(Invitation.short_code == "EXPIRE1")
    )
    assert result.scalar_one_or_none() is None
    assert not expired_photo.exists()

    result = await db_session.execute(
        select(Invitation).where(Invitation.short_code == "ACTIVE1")
    )
    assert result.scalar_one_or_none() is not None
    assert active_photo.exists()

    result = await db_session.execute(
        select(Notification).where(
            Notification.invitation_title == "Old notification"
        )
    )
    assert result.scalar_one_or_none() is None

    result = await db_session.execute(
        select(Notification).where(
            Notification.invitation_title == "Recent notification"
        )
    )
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
@pytest.mark.xfail(reason=CLEANUP_XFAIL_REASON, strict=True)
async def test_advisory_lock_blocks_concurrent_run(
    db_session, seeded_user, tmp_path, monkeypatch
):
    """INV-07: a second concurrent sweep is blocked by the advisory lock while
    the first holder's transaction is still open, so it does not double-process
    the expired row it would otherwise delete."""
    from app.tasks.cleanup import CLEANUP_LOCK_KEY, run_cleanup

    monkeypatch.setattr(settings, "PHOTO_STORAGE_PATH", str(tmp_path))

    now = datetime.now(timezone.utc)
    expired_invitation = Invitation(
        user_id=seeded_user.id,
        short_code="LOCKED1",
        title="Locked?",
        password="test1234",
        photo_filename="locked1.webp",
        expires_at=now - timedelta(days=1),
    )
    db_session.add(expired_invitation)
    await db_session.flush()

    # Hold the advisory lock on a separate connection/transaction, simulating
    # a concurrently-running sweep instance.
    async with engine.connect() as lock_conn:
        await lock_conn.begin()
        await lock_conn.execute(
            text("SELECT pg_advisory_xact_lock(:k)"), {"k": CLEANUP_LOCK_KEY}
        )

        await run_cleanup()

        result = await db_session.execute(
            select(Invitation).where(Invitation.short_code == "LOCKED1")
        )
        # The lock was held, so run_cleanup should have skipped this tick —
        # the expired row it would otherwise delete is still present.
        assert result.scalar_one_or_none() is not None

        await lock_conn.rollback()
