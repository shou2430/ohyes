from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://localhost:5432/ohyes"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Secrets
    JWT_SECRET: str = "change-me-in-production"
    SESSION_SECRET: str = "change-me-in-production"

    # URLs
    FRONTEND_URL: str = "http://localhost:5173"
    API_URL: str = "http://localhost:8000"

    # Storage
    PHOTO_STORAGE_PATH: str = "./data/photos"

    @property
    def async_database_url(self) -> str:
        """Convert postgresql:// to postgresql+asyncpg:// for async driver."""
        return self.DATABASE_URL.replace(
            "postgresql://", "postgresql+asyncpg://", 1
        )

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
