from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base


class FaultRecord(Base):
    __tablename__ = "fault_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer)
    device_name = Column(String)
    device_type = Column(String)
    symptoms = Column(String(1000), nullable=False)
    description = Column(String(2000))
    severity = Column(String, nullable=False, default="MEDIUM")
    status = Column(String, nullable=False, default="OPEN")
    diagnosis_result = Column(Text)
    reported_at = Column(DateTime, default=datetime.now)
    resolved_at = Column(DateTime)
