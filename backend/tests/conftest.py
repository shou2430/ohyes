from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine, get_db
from app.core.security import create_access_token
from app.main import app
from app.models.user import User


@pytest.fixture
async def db_session():
    """Open a connection, begin a transaction, and roll it back after the test
    so seeded rows (invitations, notifications) never leak between tests.

    `join_transaction_mode="create_savepoint"` is load-bearing: routes under
    test (e.g. `respond_to_invitation`) call `await db.commit()`. Without the
    savepoint mode, that commit would end the outer connection transaction and
    the teardown rollback below would undo nothing, leaking seeded rows into
    the next test.
    """
    async with engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(
            bind=conn,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        try:
            yield session
        finally:
            await session.close()
            await conn.rollback()
            app.dependency_overrides.pop(get_db, None)


@pytest.fixture
async def client(db_session):
    """Async test client for FastAPI app, wired to the rolled-back db_session."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
async def seeded_user(db_session):
    """A real, flushed (never committed) User row for authenticated tests."""
    unique = uuid4().hex
    user = User(
        google_id=f"google-{unique}",
        email=f"{unique}@example.com",
        display_name="Test Creator",
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.fixture
async def second_user(db_session):
    """A second, independent creator — for ownership/IDOR tests."""
    unique = uuid4().hex
    user = User(
        google_id=f"google-{unique}",
        email=f"{unique}@example.com",
        display_name="Test Creator Two",
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.fixture
def auth_headers(seeded_user):
    """Authorization header minted via the production create_access_token."""
    return {"Authorization": "Bearer " + create_access_token(seeded_user.id)}


@pytest.fixture
def second_auth_headers(second_user):
    """Authorization header for the second principal."""
    return {"Authorization": "Bearer " + create_access_token(second_user.id)}
