from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.invitations import router as invitations_router
from app.routers.photos import router as photos_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle. Creates photo storage directory on boot."""
    Path(settings.PHOTO_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="OhYes API", version="0.1.0", lifespan=lifespan)

# SessionMiddleware — required by Authlib for temporary OAuth state storage
app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET)

# CORS — required because frontend and backend are on separate Railway domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(invitations_router)
app.include_router(photos_router)


@app.get("/")
async def root():
    return {"message": "OhYes API"}
