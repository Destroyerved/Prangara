"""add organizations.cluster

Revision ID: c3a1f9d2e4b7
Revises: b128a0883adb
Create Date: 2026-09-13

The Organization model gained a `cluster` column without a migration. A database
built with `alembic upgrade head` therefore lacked it, and the demo seed failed on
its very first insert. Databases built with `create_all` already have the column,
so both directions check before acting instead of failing on those.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "c3a1f9d2e4b7"
down_revision = "b128a0883adb"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    return column in {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    if not _has_column("organizations", "cluster"):
        with op.batch_alter_table("organizations") as batch:
            batch.add_column(sa.Column("cluster", sa.String(length=120), nullable=True))


def downgrade() -> None:
    if _has_column("organizations", "cluster"):
        with op.batch_alter_table("organizations") as batch:
            batch.drop_column("cluster")
