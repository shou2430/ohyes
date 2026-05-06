from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/login")
async def login(request: Request):
    """Redirect user to Google OAuth consent screen."""
    redirect_uri = f"{settings.API_URL}/api/auth/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback, upsert user, redirect to frontend with JWT in query param."""
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if not userinfo:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/?error=auth_failed")

    google_id = userinfo["sub"]
    email = userinfo["email"]
    display_name = userinfo.get("name", email)
    avatar_url = userinfo.get("picture")

    # Upsert user
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user:
        user.email = email
        user.display_name = display_name
        user.avatar_url = avatar_url
    else:
        user = User(
            google_id=google_id,
            email=email,
            display_name=display_name,
            avatar_url=avatar_url,
        )
        db.add(user)

    await db.flush()
    await db.refresh(user)

    # Create JWT and redirect to frontend with token in query param
    jwt_token = create_access_token(user.id)
    params = urlencode({"token": jwt_token})
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/auth/callback?{params}")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return current authenticated user info."""
    return current_user


@router.post("/logout")
async def logout():
    """Logout is client-side only (clear localStorage). This endpoint exists for future server-side token revocation."""
    return {"message": "Logged out"}
