"""Add cognito_sub and auth_provider to users

Revision ID: 9c81f2a4d110
Revises: 3b40ab53b080
Create Date: 2026-11-18 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c81f2a4d110'
down_revision: Union[str, Sequence[str], None] = '3b40ab53b080'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('cognito_sub', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('auth_provider', sa.String(length=50), server_default='local', nullable=False))
        batch_op.create_index(batch_op.f('ix_users_cognito_sub'), ['cognito_sub'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_cognito_sub'))
        batch_op.drop_column('auth_provider')
        batch_op.drop_column('cognito_sub')
