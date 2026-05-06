from pydantic import BaseModel


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}
