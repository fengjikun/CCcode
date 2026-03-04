from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class DeviceBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    name: str
    type: Optional[str] = None
    location: Optional[str] = None
    status: str = "ONLINE"
    description: Optional[str] = None


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(DeviceBase):
    pass


class DeviceResponse(DeviceBase):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DeviceStatusUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    status: str
