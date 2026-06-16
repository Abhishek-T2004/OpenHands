"""Add git_full_clone setting.

Revision ID: 124
Revises: 123
Create Date: 2026-06-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "124"
down_revision: Union[str, None] = "123"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column(
            "git_full_clone", sa.Boolean(), nullable=True, server_default=sa.false()
        ),
    )
    op.add_column(
        "user_settings",
        sa.Column(
            "git_full_clone", sa.Boolean(), nullable=True, server_default=sa.false()
        ),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "git_full_clone")
    op.drop_column("user", "git_full_clone")
