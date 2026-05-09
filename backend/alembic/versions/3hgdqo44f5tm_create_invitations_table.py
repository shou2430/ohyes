"""create invitations table

Revision ID: 3hgdqo44f5tm
Revises: b14db3594d41
Create Date: 2026-05-09 16:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3hgdqo44f5tm"
down_revision: Union[str, Sequence[str], None] = "b14db3594d41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "invitations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("short_code", sa.String(length=8), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("password", sa.String(length=8), nullable=False),
        sa.Column("photo_filename", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("short_code"),
    )
    op.create_index(
        op.f("ix_invitations_user_id"), "invitations", ["user_id"]
    )
    op.create_index(
        op.f("ix_invitations_short_code"),
        "invitations",
        ["short_code"],
        unique=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_invitations_short_code"), table_name="invitations")
    op.drop_index(op.f("ix_invitations_user_id"), table_name="invitations")
    op.drop_table("invitations")
