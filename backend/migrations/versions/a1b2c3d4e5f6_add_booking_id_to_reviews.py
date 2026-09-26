"""add booking_id to reviews

Revision ID: a1b2c3d4e5f6
Revises: ebe97a1d9c71
Create Date: 2026-09-26 09:35:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'ebe97a1d9c71'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.add_column(sa.Column('booking_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_reviews_booking_id', 'bookings', ['booking_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index(batch_op.f('ix_reviews_booking_id'), ['booking_id'], unique=False)

def downgrade() -> None:
    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_reviews_booking_id'))
        batch_op.drop_constraint('fk_reviews_booking_id', type_='foreignkey')
        batch_op.drop_column('booking_id')
