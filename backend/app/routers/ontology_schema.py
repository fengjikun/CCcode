from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ontology import (
    ObjectTypeCreate, ObjectTypeResponse,
    PropertyCreate, PropertyResponse,
    LinkTypeCreate, LinkTypeResponse,
)
from app.services import ontology_schema_service as schema_svc

router = APIRouter(prefix="/api/ontology", tags=["ontology-schema"])


# ===== ObjectType =====

@router.get("/object-types", response_model=List[ObjectTypeResponse])
def list_object_types(db: Session = Depends(get_db)):
    return schema_svc.list_object_types(db)


@router.post("/object-types", response_model=ObjectTypeResponse)
def create_object_type(ot: ObjectTypeCreate, db: Session = Depends(get_db)):
    try:
        return schema_svc.create_object_type(db, ot.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/object-types/{id}", response_model=ObjectTypeResponse)
def get_object_type(id: int, db: Session = Depends(get_db)):
    try:
        return schema_svc.get_object_type(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/object-types/{id}", response_model=ObjectTypeResponse)
def update_object_type(id: int, ot: ObjectTypeCreate, db: Session = Depends(get_db)):
    try:
        return schema_svc.update_object_type(db, id, ot.model_dump(by_alias=False, exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/object-types/{id}", status_code=204)
def delete_object_type(id: int, db: Session = Depends(get_db)):
    try:
        schema_svc.delete_object_type(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== Property =====

@router.get("/object-types/{id}/properties", response_model=List[PropertyResponse])
def list_properties(id: int, db: Session = Depends(get_db)):
    return schema_svc.list_properties(db, id)


@router.post("/object-types/{id}/properties", response_model=PropertyResponse)
def add_property(id: int, prop: PropertyCreate, db: Session = Depends(get_db)):
    try:
        return schema_svc.add_property(db, id, prop.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/properties/{id}", response_model=PropertyResponse)
def update_property(id: int, prop: PropertyCreate, db: Session = Depends(get_db)):
    try:
        return schema_svc.update_property(db, id, prop.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/properties/{id}", status_code=204)
def delete_property(id: int, db: Session = Depends(get_db)):
    try:
        schema_svc.delete_property(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== LinkType =====

@router.get("/link-types", response_model=List[LinkTypeResponse])
def list_link_types(db: Session = Depends(get_db)):
    return schema_svc.list_link_types(db)


@router.post("/link-types", response_model=LinkTypeResponse)
def create_link_type(lt: LinkTypeCreate, db: Session = Depends(get_db)):
    try:
        return schema_svc.create_link_type(db, lt.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/link-types/{id}", response_model=LinkTypeResponse)
def get_link_type(id: int, db: Session = Depends(get_db)):
    try:
        return schema_svc.get_link_type(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/link-types/{id}", response_model=LinkTypeResponse)
def update_link_type(id: int, lt: LinkTypeCreate, db: Session = Depends(get_db)):
    try:
        return schema_svc.update_link_type(db, id, lt.model_dump(by_alias=False, exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/link-types/{id}", status_code=204)
def delete_link_type(id: int, db: Session = Depends(get_db)):
    try:
        schema_svc.delete_link_type(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== Schema Graph =====

@router.get("/schema")
def get_schema_graph(db: Session = Depends(get_db)):
    return schema_svc.get_schema_graph(db)
