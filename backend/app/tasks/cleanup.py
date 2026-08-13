"""Scheduled hourly sweep: deletes expired invitations (DB row + photo file
on the Railway volume). Guarded by a transaction-scoped PostgreSQL advisory
lock so that only one running instance performs a sweep on any given tick,
even if multiple Uvicorn workers or container replicas each start their own
scheduler (RESEARCH Pitfall 4 / T-04-DBLRUN).

INV-07, D-18, D-19, D-20, D-21, D-22.
"""

import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, text

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.invitation import Invitation

logger = logging.getLogger(__name__)

# Single project-wide PostgreSQL advisory-lock key for the cleanup sweep.
# Must not be reused by any other feature (T-04-LOCKKEY) — a key collision
# would make pg_try_advisory_xact_lock return false forever and silently
# stop the sweep with no error to observe.
CLEANUP_LOCK_KEY = 727100401


async def run_cleanup() -> None:
    """Hourly scheduled job (D-18, D-20). Runs outside any HTTP request, so
    it opens its own session from the session factory rather than using the
    request-scoped `get_db` dependency."""
    async with async_session_factory() as db:
        acquired = (
            await db.execute(
                text("SELECT pg_try_advisory_xact_lock(:k)"),
                {"k": CLEANUP_LOCK_KEY},
            )
        ).scalar()
        if not acquired:
            logger.info("cleanup: lock held by another instance, skipping this tick")
            return

        deleted_photo_filenames = await _delete_expired_invitations(db)
        await db.commit()  # releases the transaction-scoped advisory lock

        removed_photo_count = _remove_photo_files(deleted_photo_filenames)

        logger.info(
            "cleanup: deleted %d invitations, removed %d photo files",
            len(deleted_photo_filenames),
            removed_photo_count,
        )


async def _delete_expired_invitations(db) -> list[str]:
    """Single bulk DELETE ... RETURNING — no per-row loop (RESEARCH Pitfall 3
    / anti-patterns) and no naive (timezone-less) `now()` call (RESEARCH
    Pitfall 2)."""
    now = datetime.now(timezone.utc)
    stmt = (
        delete(Invitation)
        .where(Invitation.expires_at < now)
        .returning(Invitation.photo_filename)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


def _remove_photo_files(filenames) -> int:
    """Remove each photo file after the deleting transaction has already
    committed. A failure removing one file (already missing, or an OSError)
    does not abort the sweep or skip the remaining filenames (D-22) — the DB
    row is already gone, so a bad file must not stall the sweep."""
    removed = 0
    for filename in filenames:
        path = Path(settings.PHOTO_STORAGE_PATH) / filename
        if not path.exists():
            continue
        try:
            os.remove(path)
            removed += 1
        except OSError as exc:
            logger.warning("cleanup: failed to remove photo %s: %s", filename, exc)
            continue
    return removed
