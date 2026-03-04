from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.device import Device


def search(db: Session, keyword: str = None, status: str = None, type_: str = None):
    query = db.query(Device)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(or_(
            Device.name.ilike(like),
            Device.type.ilike(like),
            Device.location.ilike(like),
            Device.description.ilike(like),
        ))
    if status:
        query = query.filter(Device.status == status.upper())
    if type_:
        query = query.filter(Device.type == type_)
    return query.all()


def find_by_id(db: Session, device_id: int) -> Device:
    device = db.get(Device, device_id)
    if not device:
        raise ValueError(f"设备不存在：id={device_id}")
    return device


def create(db: Session, data: dict) -> Device:
    device = Device(**data)
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


def update(db: Session, device_id: int, data: dict) -> Device:
    device = find_by_id(db, device_id)
    for key, value in data.items():
        setattr(device, key, value)
    db.commit()
    db.refresh(device)
    return device


def update_status(db: Session, device_id: int, status: str):
    device = find_by_id(db, device_id)
    device.status = status.upper()
    db.commit()


def delete(db: Session, device_id: int):
    device = find_by_id(db, device_id)
    db.delete(device)
    db.commit()


def get_types(db: Session):
    devices = db.query(Device.type).distinct().all()
    return sorted([d[0] for d in devices if d[0]])
