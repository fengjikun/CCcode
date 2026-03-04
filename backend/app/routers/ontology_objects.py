from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ontology import OntologyObject, OntologyLink
from app.schemas.ontology import ObjectCreate, ObjectResponse, LinkCreate, LinkResponse
from app.services import ontology_object_service as obj_svc

router = APIRouter(prefix="/api/ontology", tags=["ontology-objects"])


# ===== Object CRUD =====

@router.get("/object-types/{type_id}/objects", response_model=List[ObjectResponse])
def list_objects(type_id: int, db: Session = Depends(get_db)):
    return obj_svc.list_objects(db, type_id)


@router.post("/object-types/{type_id}/objects", response_model=ObjectResponse)
def create_object(type_id: int, obj: ObjectCreate, db: Session = Depends(get_db)):
    new_obj = OntologyObject(object_type_id=type_id, **obj.model_dump(by_alias=False))
    return obj_svc.create_object(db, new_obj)


@router.get("/object-types/{type_id}/objects/{id}", response_model=ObjectResponse)
def get_object(type_id: int, id: int, db: Session = Depends(get_db)):
    try:
        return obj_svc.get_object(db, type_id, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/object-types/{type_id}/objects/{id}", response_model=ObjectResponse)
def update_object(type_id: int, id: int, obj: ObjectCreate, db: Session = Depends(get_db)):
    try:
        return obj_svc.update_object(db, type_id, id, obj.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/object-types/{type_id}/objects/{id}", status_code=204)
def delete_object(type_id: int, id: int, db: Session = Depends(get_db)):
    try:
        obj_svc.delete_object(db, type_id, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== Links =====

@router.get("/object-types/{type_id}/objects/{id}/links")
def get_object_links(type_id: int, id: int, db: Session = Depends(get_db)):
    return obj_svc.get_object_links(db, id)


@router.post("/links", response_model=LinkResponse)
def create_link(link: LinkCreate, db: Session = Depends(get_db)):
    try:
        new_link = OntologyLink(**link.model_dump(by_alias=False))
        return obj_svc.create_link(db, new_link)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/links/{id}", status_code=204)
def delete_link(id: int, db: Session = Depends(get_db)):
    try:
        obj_svc.delete_link(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
