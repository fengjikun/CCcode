from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    type = Column(String)
    location = Column(String)
    status = Column(String, nullable=False, default="ONLINE")
    description = Column(String(500))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
