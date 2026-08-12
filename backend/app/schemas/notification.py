from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    invitation_title: str
    recipient_name: str | None
    recipient_message: str | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
