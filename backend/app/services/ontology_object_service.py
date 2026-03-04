from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.ontology import OntologyObject, OntologyLink, OntologyLinkType


# ===== Object CRUD =====

def list_objects(db: Session, object_type_id: int):
    return db.query(OntologyObject).filter(OntologyObject.object_type_id == object_type_id).all()


def get_object(db: Session, object_type_id: int, id: int) -> OntologyObject:
    obj = db.query(OntologyObject).filter(
        OntologyObject.object_type_id == object_type_id,
        OntologyObject.id == id,
    ).first()
    if not obj:
        raise ValueError(f"Object not found: {id}")
    return obj


def get_object_by_id(db: Session, id: int) -> OntologyObject:
    obj = db.get(OntologyObject, id)
    if not obj:
        raise ValueError(f"Object not found: {id}")
    return obj


def create_object(db: Session, obj: OntologyObject) -> OntologyObject:
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_object(db: Session, object_type_id: int, id: int, data: dict) -> OntologyObject:
    obj = get_object(db, object_type_id, id)
    if "properties_json" in data and data["properties_json"] is not None:
        obj.properties_json = data["properties_json"]
    if "external_id" in data and data["external_id"] is not None:
        obj.external_id = data["external_id"]
    db.commit()
    db.refresh(obj)
    return obj


def update_object_by_id(db: Session, id: int, data: dict) -> OntologyObject:
    obj = get_object_by_id(db, id)
    if "properties_json" in data and data["properties_json"] is not None:
        obj.properties_json = data["properties_json"]
    if "external_id" in data and data["external_id"] is not None:
        obj.external_id = data["external_id"]
    db.commit()
    db.refresh(obj)
    return obj


def delete_object(db: Session, object_type_id: int, id: int):
    obj = get_object(db, object_type_id, id)
    # Remove associated links
    db.query(OntologyLink).filter(
        or_(OntologyLink.source_object_id == obj.id, OntologyLink.target_object_id == obj.id)
    ).delete(synchronize_session="fetch")
    db.delete(obj)
    db.commit()


def delete_object_by_id(db: Session, id: int):
    get_object_by_id(db, id)
    db.query(OntologyLink).filter(
        or_(OntologyLink.source_object_id == id, OntologyLink.target_object_id == id)
    ).delete(synchronize_session="fetch")
    db.query(OntologyObject).filter(OntologyObject.id == id).delete()
    db.commit()


# ===== Link CRUD =====

def get_object_links(db: Session, object_id: int):
    links = db.query(OntologyLink).filter(
        or_(OntologyLink.source_object_id == object_id, OntologyLink.target_object_id == object_id)
    ).all()
    result = []
    for link in links:
        item = {
            "id": link.id,
            "linkTypeId": link.link_type_id,
            "sourceObjectId": link.source_object_id,
            "targetObjectId": link.target_object_id,
            "createdAt": link.created_at.isoformat() if link.created_at else None,
        }
        lt = db.get(OntologyLinkType, link.link_type_id)
        if lt:
            item["linkTypeName"] = lt.name
            item["linkTypeDisplayName"] = lt.display_name
        result.append(item)
    return result


def create_link(db: Session, link: OntologyLink) -> OntologyLink:
    get_object_by_id(db, link.source_object_id)
    get_object_by_id(db, link.target_object_id)
    lt = db.get(OntologyLinkType, link.link_type_id)
    if not lt:
        raise ValueError(f"LinkType not found: {link.link_type_id}")
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def delete_link(db: Session, id: int):
    link = db.get(OntologyLink, id)
    if not link:
        raise ValueError(f"Link not found: {id}")
    db.delete(link)
    db.commit()
