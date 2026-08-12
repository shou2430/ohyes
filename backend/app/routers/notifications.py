from fastapi import APIRouter, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's notifications, newest first.

    No pagination parameter (D-06): growth is bounded by the 30-day retention
    sweep, not by page size. Ownership comes only from `current_user`, never
    from a request-supplied identifier (T-04-IDOR).
    """
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
    )
    notifications = result.scalars().all()
    return notifications


@router.post("/read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark every unread notification owned by the current user as read.

    Bulk, owner-scoped update (D-08): one call for everything, no per-item
    mark-read control. Accepts no request body, so no client-supplied
    identity field can ever reach the WHERE clause (T-04-IDOR) — ownership
    comes only from `current_user`, exactly like `list_notifications`.
    """
    result = await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"updated": result.rowcount}
