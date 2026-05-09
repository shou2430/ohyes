import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings

router = APIRouter(prefix="/api/photos", tags=["photos"])

PHOTO_FILENAME_PATTERN = re.compile(r"^[A-Za-z0-9]{7}\.webp$")


@router.get("/{filename}")
async def get_photo(filename: str):
    """Serve a photo file by filename. Validates filename to prevent path traversal."""
    # Strict filename validation — only allow {7 alnum chars}.webp
    if not PHOTO_FILENAME_PATTERN.match(filename):
        raise HTTPException(status_code=404, detail="Photo not found")

    photo_path = Path(settings.PHOTO_STORAGE_PATH) / filename
    if not photo_path.exists() or not photo_path.is_file():
        raise HTTPException(status_code=404, detail="Photo not found")

    return FileResponse(
        photo_path,
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=86400"},
    )
