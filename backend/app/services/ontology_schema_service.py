from sqlalchemy.orm import Session
from app.models.ontology import OntologyObjectType, OntologyProperty, OntologyLinkType


# ===== ObjectType =====

def list_object_types(db: Session):
    return db.query(OntologyObjectType).all()


def get_object_type(db: Session, id: int) -> OntologyObjectType:
    ot = db.get(OntologyObjectType, id)
    if not ot:
        raise ValueError(f"ObjectType not found: {id}")
    return ot


def create_object_type(db: Session, data: dict) -> OntologyObjectType:
    existing = db.query(OntologyObjectType).filter(OntologyObjectType.name == data.get("name")).first()
    if existing:
        raise ValueError(f"ObjectType name already exists: {data.get('name')}")
    ot = OntologyObjectType(**data)
    db.add(ot)
    db.commit()
    db.refresh(ot)
    return ot


def update_object_type(db: Session, id: int, data: dict) -> OntologyObjectType:
    ot = get_object_type(db, id)
    for key, value in data.items():
        if value is not None:
            setattr(ot, key, value)
    db.commit()
    db.refresh(ot)
    return ot


def delete_object_type(db: Session, id: int):
    get_object_type(db, id)
    db.query(OntologyProperty).filter(OntologyProperty.object_type_id == id).delete()
    db.query(OntologyObjectType).filter(OntologyObjectType.id == id).delete()
    db.commit()


# ===== Property =====

def list_properties(db: Session, object_type_id: int):
    return db.query(OntologyProperty).filter(
        OntologyProperty.object_type_id == object_type_id
    ).order_by(OntologyProperty.sort_order).all()


def add_property(db: Session, object_type_id: int, data: dict) -> OntologyProperty:
    get_object_type(db, object_type_id)
    prop = OntologyProperty(object_type_id=object_type_id, **data)
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


def update_property(db: Session, id: int, data: dict) -> OntologyProperty:
    prop = db.get(OntologyProperty, id)
    if not prop:
        raise ValueError(f"Property not found: {id}")
    for key, value in data.items():
        if value is not None or key in ("required", "sort_order"):
            setattr(prop, key, value)
    db.commit()
    db.refresh(prop)
    return prop


def delete_property(db: Session, id: int):
    prop = db.get(OntologyProperty, id)
    if not prop:
        raise ValueError(f"Property not found: {id}")
    db.delete(prop)
    db.commit()


# ===== LinkType =====

def list_link_types(db: Session):
    return db.query(OntologyLinkType).all()


def get_link_type(db: Session, id: int) -> OntologyLinkType:
    lt = db.get(OntologyLinkType, id)
    if not lt:
        raise ValueError(f"LinkType not found: {id}")
    return lt


def create_link_type(db: Session, data: dict) -> OntologyLinkType:
    get_object_type(db, data["source_object_type_id"])
    get_object_type(db, data["target_object_type_id"])
    lt = OntologyLinkType(**data)
    db.add(lt)
    db.commit()
    db.refresh(lt)
    return lt


def update_link_type(db: Session, id: int, data: dict) -> OntologyLinkType:
    lt = get_link_type(db, id)
    for key, value in data.items():
        if value is not None:
            setattr(lt, key, value)
    db.commit()
    db.refresh(lt)
    return lt


def delete_link_type(db: Session, id: int):
    get_link_type(db, id)
    db.query(OntologyLinkType).filter(OntologyLinkType.id == id).delete()
    db.commit()


# ===== Schema Graph =====

def get_schema_graph(db: Session) -> dict:
    types = db.query(OntologyObjectType).all()
    links = db.query(OntologyLinkType).all()

    nodes = []
    for ot in types:
        prop_count = db.query(OntologyProperty).filter(
            OntologyProperty.object_type_id == ot.id
        ).count()
        nodes.append({
            "id": f"ot_{ot.id}",
            "label": ot.display_name,
            "name": ot.name,
            "type": "ObjectType",
            "color": ot.color or "#5b8dee",
            "icon": ot.icon,
            "propertyCount": prop_count,
        })

    edges = []
    for lt in links:
        edges.append({
            "id": f"lt_{lt.id}",
            "source": f"ot_{lt.source_object_type_id}",
            "target": f"ot_{lt.target_object_type_id}",
            "label": lt.display_name,
            "name": lt.name,
            "cardinality": lt.cardinality,
        })

    return {"nodes": nodes, "edges": edges}
