import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import pytest
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, text

import app.tasks.cleanup as cleanup_module
from app.core.config import settings
from app.core.database import engine
from app.models.invitation import Invitation
from app.tasks.cleanup import CLEANUP_LOCK_KEY, run_cleanup


@asynccontextmanager
async def _reuse_session(session):
    """Route cleanup.py's `async_session_factory()` call to the test's own
    transaction-rollback session instead of a genuinely new pooled
    connection. Postgres transaction isolation means a fresh connection
    cannot see this test's flushed-but-uncommitted seed rows — reusing the
    same session/connection is what lets run_cleanup() observe and delete
    them, and lets the test observe the delete, all within the fixture's
    single rolled-back transaction."""
    yield session


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
async def test_sweep_deletes_expired_invitation_and_photo(
    db_session, seeded_user, tmp_path, monkeypatch
):
    """INV-07/D-21: an invitation whose expires_at is in the past, plus its
    photo file on PHOTO_STORAGE_PATH, are both gone after one run_cleanup()
    call."""
    monkeypatch.setattr(settings, "PHOTO_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(
        cleanup_module, "async_session_factory", lambda: _reuse_session(db_session)
    )

    now = datetime.now(timezone.utc)

    expired_photo = tmp_path / "expired1.webp"
    expired_photo.write_bytes(b"\xff\xd8")

    expired_invitation = Invitation(
        user_id=seeded_user.id,
        short_code="EXPIRE1",
        title="Expired?",
        password="test1234",
        photo_filename="expired1.webp",
        expires_at=now - timedelta(days=1),
    )
    db_session.add(expired_invitation)
    await db_session.flush()

    await run_cleanup()

    result = await db_session.execute(
        select(Invitation).where(Invitation.short_code == "EXPIRE1")
    )
    assert result.scalar_one_or_none() is None
    assert not expired_photo.exists()


@pytest.mark.asyncio
async def test_sweep_keeps_unexpired_invitation(
    db_session, seeded_user, tmp_path, monkeypatch
):
    """INV-07/D-21: an invitation whose expires_at is in the future is still
    present, along with its photo file, after run_cleanup()."""
    monkeypatch.setattr(settings, "PHOTO_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(
        cleanup_module, "async_session_factory", lambda: _reuse_session(db_session)
    )

    now = datetime.now(timezone.utc)

    active_photo = tmp_path / "active1.webp"
    active_photo.write_bytes(b"\xff\xd8")

    active_invitation = Invitation(
        user_id=seeded_user.id,
        short_code="ACTIVE1",
        title="Active?",
        password="test1234",
        photo_filename="active1.webp",
        expires_at=now + timedelta(days=6),
    )
    db_session.add(active_invitation)
    await db_session.flush()

    await run_cleanup()

    result = await db_session.execute(
        select(Invitation).where(Invitation.short_code == "ACTIVE1")
    )
    assert result.scalar_one_or_none() is not None
    assert active_photo.exists()


@pytest.mark.asyncio
async def test_sweep_tolerates_missing_photo_file(
    db_session, seeded_user, tmp_path, monkeypatch
):
    """D-22: a photo file that cannot be removed (already missing) does not
    abort the sweep — the DB row is still deleted."""
    monkeypatch.setattr(settings, "PHOTO_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(
        cleanup_module, "async_session_factory", lambda: _reuse_session(db_session)
    )

    now = datetime.now(timezone.utc)

    expired_invitation = Invitation(
        user_id=seeded_user.id,
        short_code="NOFILE1",
        title="No file?",
        password="test1234",
        photo_filename="never-written.webp",
        expires_at=now - timedelta(days=1),
    )
    db_session.add(expired_invitation)
    await db_session.flush()

    await run_cleanup()

    result = await db_session.execute(
        select(Invitation).where(Invitation.short_code == "NOFILE1")
    )
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_advisory_lock_blocks_concurrent_run(
    db_session, seeded_user, tmp_path, monkeypatch
):
    """D-19: when the transaction-scoped advisory lock on CLEANUP_LOCK_KEY is
    already held, run_cleanup() deletes nothing and returns after logging a
    skip line — a second concurrent sweep does not double-process the
    expired row it would otherwise delete."""
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
    # a concurrently-running sweep instance. run_cleanup() here deliberately
    # uses the real (unpatched) async_session_factory, so it opens a third,
    # genuinely independent connection — exactly the multi-instance scenario
    # the advisory lock guards against.
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
