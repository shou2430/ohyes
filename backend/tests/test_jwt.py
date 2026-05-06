import jwt
import pytest

from app.core.config import settings
from app.core.security import JWT_ALGORITHM, create_access_token


def test_create_access_token_contains_sub():
    """JWT token should contain the user ID as 'sub' claim."""
    token = create_access_token(user_id=42)
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
    assert payload["sub"] == "42"


def test_create_access_token_contains_exp():
    """JWT token should contain an 'exp' claim."""
    token = create_access_token(user_id=1)
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
    assert "exp" in payload


def test_create_access_token_invalid_secret_fails():
    """JWT token should fail validation with wrong secret."""
    token = create_access_token(user_id=1)
    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(token, "wrong-secret", algorithms=[JWT_ALGORITHM])
