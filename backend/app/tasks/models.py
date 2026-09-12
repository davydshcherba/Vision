from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, Enum as SAEnum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..attachments.models import Attachment
from ..core.database import Base


class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, name="task_status", values_callable=lambda e: [i.value for i in e]),
        default=TaskStatus.todo,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Зв'язок оголошено лише тут: attachments нічого не знає про задачі,
    # тому модулі не імпортують один одного по колу.
    attachments: Mapped[list[Attachment]] = relationship(
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by=Attachment.id,
    )
