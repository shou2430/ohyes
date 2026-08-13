from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.invitations import router as invitations_router
from app.routers.notifications import router as notifications_router
from app.routers.photos import router as photos_router
from app.tasks.cleanup import run_cleanup

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle. Creates photo storage directory on boot
    and starts the hourly invitation/notification cleanup sweep (D-18,
    D-20, INV-07)."""
    Path(settings.PHOTO_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    scheduler.add_job(run_cleanup, "interval", hours=1, id="cleanup_sweep")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


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
app.include_router(notifications_router)


@app.get("/")
async def root():
    return {"message": "OhYes API"}
