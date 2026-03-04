from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class DiagnosisRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    device_id: Optional[int] = None
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    phenomenon_id: Optional[str] = None
    symptoms: Optional[List[str]] = None
    description: Optional[str] = None
    severity: str = "MEDIUM"


class FaultRecordResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, from_attributes=True)

    id: int
    device_id: Optional[int] = None
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    symptoms: Optional[str] = None
    description: Optional[str] = None
    severity: str = "MEDIUM"
    status: str = "OPEN"
    diagnosis_result: Optional[str] = None
    reported_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
