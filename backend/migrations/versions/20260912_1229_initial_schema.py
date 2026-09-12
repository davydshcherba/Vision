"""Початкова схема: tasks + attachments

Revision ID: 56a094539b4c
Revises: 
Create Date: 2026-09-12 12:29:50.685457
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '56a094539b4c'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('status', sa.Enum('todo', 'in_progress', 'done', name='task_status'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('attachments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('task_id', sa.Integer(), nullable=False),
    sa.Column('filename', sa.String(length=255), nullable=False),
    sa.Column('stored_name', sa.String(length=255), nullable=False),
    sa.Column('content_type', sa.String(length=160), nullable=True),
    sa.Column('size', sa.BigInteger(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('stored_name')
    )
    op.create_index(op.f('ix_attachments_task_id'), 'attachments', ['task_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_attachments_task_id'), table_name='attachments')
    op.drop_table('attachments')
    op.drop_table('tasks')
    # drop_table не прибирає enum-тип у Postgres — інакше повторний upgrade впаде
    sa.Enum(name='task_status').drop(op.get_bind(), checkfirst=True)
