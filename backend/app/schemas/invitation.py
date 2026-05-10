from datetime import datetime

from pydantic import BaseModel, Field


class InvitationResponse(BaseModel):
    id: int
    short_code: str
    title: str
    # Password is intentionally returned in plaintext. Per CLAUDE.md, the password
    # is "not a security feature, just a personal touch." The dashboard UI displays
    # it with a show/hide toggle (InvitationCard) so the creator can share it with
    # the recipient. No hashing is used by design.
    password: str
    photo_url: str
    created_at: datetime
    expires_at: datetime
    share_url: str

    model_config = {"from_attributes": True}


class InvitationPublicResponse(BaseModel):
    short_code: str
    title: str
    requires_password: bool = True


class InvitationDeleteResponse(BaseModel):
    message: str


class PasswordVerifyRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=8)


class InvitationRevealResponse(BaseModel):
    short_code: str
    title: str
    photo_url: str


class InvitationRespondRequest(BaseModel):
    name: str | None = Field(None, max_length=100)
    message: str | None = Field(None, max_length=30)


class InvitationRespondResponse(BaseModel):
    message: str
