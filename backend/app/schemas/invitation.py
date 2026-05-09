from datetime import datetime

from pydantic import BaseModel


class InvitationResponse(BaseModel):
    id: int
    short_code: str
    title: str
    password: str
    photo_url: str
    created_at: datetime
    expires_at: datetime
    share_url: str

    model_config = {"from_attributes": True}


class InvitationPublicResponse(BaseModel):
    short_code: str
    requires_password: bool = True


class InvitationDeleteResponse(BaseModel):
    message: str
