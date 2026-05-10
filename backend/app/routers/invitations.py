import hmac
import os
import re
import secrets
import string
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.invitation import Invitation
from app.models.notification import Notification
from app.models.user import User
from app.schemas.invitation import (
    InvitationDeleteResponse,
    InvitationPublicResponse,
    InvitationRespondRequest,
    InvitationRespondResponse,
    InvitationResponse,
    InvitationRevealResponse,
    PasswordVerifyRequest,
)
from app.utils.photo import process_photo, validate_file_size

router = APIRouter(prefix="/api/invitations", tags=["invitations"])

ALPHABET = string.ascii_letters + string.digits
CODE_LENGTH = 7
INVITATION_TTL_DAYS = 7
MAX_ACTIVE_INVITATIONS = 2
PHOTO_FILENAME_PATTERN = re.compile(r"^[A-Za-z0-9]{7}\.webp$")


def generate_short_code() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))


async def create_unique_short_code(db: AsyncSession) -> str:
    for _ in range(5):
        code = generate_short_code()
        result = await db.execute(
            select(Invitation.id).where(Invitation.short_code == code)
        )
        if not result.scalar_one_or_none():
            return code
    raise HTTPException(status_code=500, detail="Failed to generate unique code")


def build_invitation_response(invitation: Invitation) -> InvitationResponse:
    photo_url = f"/api/photos/{invitation.photo_filename}"
    share_url = f"{settings.FRONTEND_URL}/i/{invitation.short_code}"
    return InvitationResponse(
        id=invitation.id,
        short_code=invitation.short_code,
        title=invitation.title,
        password=invitation.password,
        photo_url=photo_url,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
        share_url=share_url,
    )


@router.post("", response_model=InvitationResponse, status_code=201)
async def create_invitation(
    title: str = Form(..., min_length=1, max_length=255),
    password: str = Form(..., min_length=4, max_length=8),
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new invitation with title, password, and photo."""
    # Check active invitation count with row-level lock to prevent TOCTOU race.
    # Lock the user's active invitation rows first, then count them.
    # FOR UPDATE cannot be used with aggregate functions, so we lock rows
    # and count in Python.
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Invitation.id).where(
            Invitation.user_id == current_user.id,
            Invitation.expires_at > now,
        ).with_for_update()
    )
    active_count = len(result.all())
    if active_count >= MAX_ACTIVE_INVITATIONS:
        raise HTTPException(
            status_code=409,
            detail="Maximum of 2 active invitations reached. Delete one to create a new one.",
        )

    # Read and validate photo
    contents = await photo.read()
    try:
        validate_file_size(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        processed_photo = process_photo(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Generate short code and create invitation
    short_code = await create_unique_short_code(db)
    photo_filename = f"{short_code}.webp"
    expires_at = now + timedelta(days=INVITATION_TTL_DAYS)

    invitation = Invitation(
        user_id=current_user.id,
        short_code=short_code,
        title=title,
        password=password,
        photo_filename=photo_filename,
        expires_at=expires_at,
    )
    db.add(invitation)
    await db.flush()
    await db.refresh(invitation)

    # Save photo to disk after successful DB flush (before commit).
    # If write fails, the session rollback removes the DB row — no orphan.
    storage_path = Path(settings.PHOTO_STORAGE_PATH)
    storage_path.mkdir(parents=True, exist_ok=True)
    photo_path = storage_path / photo_filename
    try:
        photo_path.write_bytes(processed_photo)
    except OSError:
        raise HTTPException(
            status_code=503,
            detail="Photo storage failed. Please try again.",
        )

    await db.commit()
    return build_invitation_response(invitation)


@router.get("", response_model=list[InvitationResponse])
async def list_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's active (non-expired) invitations."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Invitation)
        .where(
            Invitation.user_id == current_user.id,
            Invitation.expires_at > now,
        )
        .order_by(Invitation.created_at.desc())
    )
    invitations = result.scalars().all()
    return [build_invitation_response(inv) for inv in invitations]


@router.delete(
    "/{invitation_id}",
    response_model=InvitationDeleteResponse,
)
async def delete_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an invitation owned by the current user."""
    result = await db.execute(
        select(Invitation).where(
            Invitation.id == invitation_id,
            Invitation.user_id == current_user.id,
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    # Delete DB row first, then remove photo file. If DB delete fails, the photo
    # stays intact. An orphaned photo file (no DB row) is less severe than an
    # orphaned DB row pointing to a missing file.
    photo_path = Path(settings.PHOTO_STORAGE_PATH) / invitation.photo_filename
    await db.delete(invitation)
    await db.commit()

    if photo_path.exists():
        os.remove(photo_path)

    return InvitationDeleteResponse(message="Invitation deleted")


@router.get("/by-code/{short_code}", response_model=InvitationPublicResponse)
async def get_invitation_by_code(
    short_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: check if an invitation exists and is active."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Invitation).where(
            Invitation.short_code == short_code,
            Invitation.expires_at > now,
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or expired")

    return InvitationPublicResponse(
        short_code=invitation.short_code,
        title=invitation.title,
        requires_password=True,
    )


@router.post("/by-code/{short_code}/verify", response_model=InvitationRevealResponse)
async def verify_invitation_password(
    short_code: str,
    body: PasswordVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: verify password and return invitation content."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Invitation).where(
            Invitation.short_code == short_code,
            Invitation.expires_at > now,
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or expired")

    if not hmac.compare_digest(invitation.password, body.password):
        raise HTTPException(status_code=401, detail="Incorrect password")

    photo_url = f"/api/photos/{invitation.photo_filename}"
    return InvitationRevealResponse(
        short_code=invitation.short_code,
        title=invitation.title,
        photo_url=photo_url,
    )


@router.post("/by-code/{short_code}/respond", response_model=InvitationRespondResponse)
async def respond_to_invitation(
    short_code: str,
    body: InvitationRespondRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: recipient says Yes. Creates notification, deletes invitation and photo."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Invitation).where(
            Invitation.short_code == short_code,
            Invitation.expires_at > now,
        ).with_for_update()
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or expired")

    if not hmac.compare_digest(invitation.password, body.password):
        raise HTTPException(status_code=401, detail="Incorrect password")

    # Snapshot data needed for notification before deleting invitation
    notification = Notification(
        user_id=invitation.user_id,
        invitation_title=invitation.title,
        recipient_name=body.name,
        recipient_message=body.message,
    )
    db.add(notification)

    # Delete invitation row
    photo_filename = invitation.photo_filename
    await db.delete(invitation)
    await db.commit()

    # Delete photo file after successful commit (same pattern as delete_invitation)
    photo_path = Path(settings.PHOTO_STORAGE_PATH) / photo_filename
    if photo_path.exists():
        os.remove(photo_path)

    return InvitationRespondResponse(message="Response recorded")
