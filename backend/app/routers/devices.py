from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceStatusUpdate
from app.services import device_service

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=List[DeviceResponse])
def search(
    keyword: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return device_service.search(db, keyword, status, type)


@router.get("/types", response_model=List[str])
def get_types(db: Session = Depends(get_db)):
    return device_service.get_types(db)


@router.get("/{id}", response_model=DeviceResponse)
def get_by_id(id: int, db: Session = Depends(get_db)):
    try:
        return device_service.find_by_id(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("", response_model=DeviceResponse, status_code=201)
def create(device: DeviceCreate, db: Session = Depends(get_db)):
    return device_service.create(db, device.model_dump(by_alias=False))


@router.put("/{id}", response_model=DeviceResponse)
def update(id: int, device: DeviceUpdate, db: Session = Depends(get_db)):
    try:
        return device_service.update(db, id, device.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{id}/status", status_code=204)
def update_status(id: int, body: DeviceStatusUpdate, db: Session = Depends(get_db)):
    try:
        device_service.update_status(db, id, body.status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{id}", status_code=204)
def delete(id: int, db: Session = Depends(get_db)):
    try:
        device_service.delete(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
