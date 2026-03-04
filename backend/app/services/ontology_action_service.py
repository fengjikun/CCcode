import json
from sqlalchemy.orm import Session
from app.models.ontology import (
    OntologyActionType, OntologyActionParameter, OntologyActionRule,
    OntologyActionExecution, OntologyObjectType, OntologyLinkType,
    OntologyObject, OntologyLink, OntologyFunction,
)
from app.services import ontology_object_service as obj_service


# ===== ActionType CRUD =====

def list_action_types(db: Session):
    return db.query(OntologyActionType).all()


def get_action_type(db: Session, id: int) -> OntologyActionType:
    at = db.get(OntologyActionType, id)
    if not at:
        raise ValueError(f"ActionType not found: {id}")
    return at


def create_action_type(db: Session, data: dict) -> OntologyActionType:
    at = OntologyActionType(**data)
    db.add(at)
    db.commit()
    db.refresh(at)
    return at


def update_action_type(db: Session, id: int, data: dict) -> OntologyActionType:
    at = get_action_type(db, id)
    for key, value in data.items():
        if value is not None or key in ("target_object_type_id", "trigger_config_json",
                                         "exception_config_json", "validation_rules_json"):
            setattr(at, key, value)
    db.commit()
    db.refresh(at)
    return at


def delete_action_type(db: Session, id: int):
    get_action_type(db, id)
    db.query(OntologyActionParameter).filter(OntologyActionParameter.action_type_id == id).delete()
    db.query(OntologyActionRule).filter(OntologyActionRule.action_type_id == id).delete()
    db.query(OntologyActionType).filter(OntologyActionType.id == id).delete()
    db.commit()


# ===== Parameter CRUD =====

def list_parameters(db: Session, action_type_id: int):
    return db.query(OntologyActionParameter).filter(
        OntologyActionParameter.action_type_id == action_type_id
    ).order_by(OntologyActionParameter.sort_order).all()


def add_parameter(db: Session, action_type_id: int, data: dict) -> OntologyActionParameter:
    get_action_type(db, action_type_id)
    param = OntologyActionParameter(action_type_id=action_type_id, **data)
    db.add(param)
    db.commit()
    db.refresh(param)
    return param


def update_parameter(db: Session, id: int, data: dict) -> OntologyActionParameter:
    p = db.get(OntologyActionParameter, id)
    if not p:
        raise ValueError(f"Parameter not found: {id}")
    for key, value in data.items():
        if value is not None or key in ("required", "sort_order"):
            setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p


def delete_parameter(db: Session, id: int):
    p = db.get(OntologyActionParameter, id)
    if not p:
        raise ValueError(f"Parameter not found: {id}")
    db.delete(p)
    db.commit()


# ===== Rule CRUD =====

def list_rules(db: Session, action_type_id: int):
    return db.query(OntologyActionRule).filter(
        OntologyActionRule.action_type_id == action_type_id
    ).order_by(OntologyActionRule.sort_order).all()


def add_rule(db: Session, action_type_id: int, data: dict) -> OntologyActionRule:
    get_action_type(db, action_type_id)
    rule = OntologyActionRule(action_type_id=action_type_id, **data)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def update_rule(db: Session, id: int, data: dict) -> OntologyActionRule:
    r = db.get(OntologyActionRule, id)
    if not r:
        raise ValueError(f"Rule not found: {id}")
    for key, value in data.items():
        if value is not None or key == "sort_order":
            setattr(r, key, value)
    db.commit()
    db.refresh(r)
    return r


def delete_rule(db: Session, id: int):
    r = db.get(OntologyActionRule, id)
    if not r:
        raise ValueError(f"Rule not found: {id}")
    db.delete(r)
    db.commit()


# ===== Execution History =====

def list_executions(db: Session, action_type_id: int):
    return db.query(OntologyActionExecution).filter(
        OntologyActionExecution.action_type_id == action_type_id
    ).order_by(OntologyActionExecution.executed_at.desc()).all()


# ===== Execute Action =====

def execute_action(db: Session, action_type_id: int, input_parameters: dict) -> OntologyActionExecution:
    execution = OntologyActionExecution(
        action_type_id=action_type_id,
        parameters_json=_to_json(input_parameters),
    )

    try:
        action_type = get_action_type(db, action_type_id)
        if action_type.status != "ACTIVE":
            raise ValueError(f"ActionType is not ACTIVE: {action_type.status}")

        # Validate required parameters
        params = db.query(OntologyActionParameter).filter(
            OntologyActionParameter.action_type_id == action_type_id
        ).order_by(OntologyActionParameter.sort_order).all()
        for p in params:
            if p.required and p.name not in input_parameters:
                raise ValueError(f"Missing required parameter: {p.name}")

        # Execute rules in order
        rules = db.query(OntologyActionRule).filter(
            OntologyActionRule.action_type_id == action_type_id
        ).order_by(OntologyActionRule.sort_order).all()
        rule_results = []

        for rule in rules:
            if rule.condition_json and rule.condition_json.strip():
                if not _evaluate_condition(rule.condition_json, input_parameters):
                    continue
            rule_result = _execute_rule(db, rule, input_parameters)
            rule_results.append(rule_result)

        execution.status = "SUCCESS"
        execution.result_json = _to_json({"ruleResults": rule_results})

    except Exception as e:
        execution.status = "FAILED"
        execution.error_message = str(e)
        execution.result_json = _to_json({"error": str(e)})

    db.add(execution)
    db.commit()
    db.refresh(execution)
    return execution


def _execute_rule(db: Session, rule: OntologyActionRule, params: dict) -> dict:
    result = {"ruleId": rule.id, "ruleType": rule.rule_type}

    try:
        resolved_props = _resolve_property_mappings(rule.property_mappings_json, params)

        if rule.rule_type == "CREATE_OBJECT":
            ot = db.query(OntologyObjectType).filter(
                OntologyObjectType.name == rule.target_object_type_name
            ).first()
            if not ot:
                raise ValueError(f"ObjectType: {rule.target_object_type_name}")
            obj = OntologyObject(object_type_id=ot.id, properties_json=_to_json(resolved_props))
            created = obj_service.create_object(db, obj)
            result["objectId"] = created.id
            result["status"] = "created"

        elif rule.rule_type == "MODIFY_OBJECT":
            obj_id = params.get("objectId")
            if obj_id is None:
                raise ValueError("MODIFY_OBJECT requires 'objectId' parameter")
            obj_service.update_object_by_id(db, int(obj_id), {"properties_json": _to_json(resolved_props)})
            result["objectId"] = int(obj_id)
            result["status"] = "modified"

        elif rule.rule_type == "DELETE_OBJECT":
            obj_id = params.get("objectId")
            if obj_id is None:
                raise ValueError("DELETE_OBJECT requires 'objectId' parameter")
            obj_service.delete_object_by_id(db, int(obj_id))
            result["objectId"] = int(obj_id)
            result["status"] = "deleted"

        elif rule.rule_type == "CREATE_LINK":
            lt = db.query(OntologyLinkType).filter(
                OntologyLinkType.name == rule.target_link_type_name
            ).first()
            if not lt:
                raise ValueError(f"LinkType: {rule.target_link_type_name}")
            link = OntologyLink(
                link_type_id=lt.id,
                source_object_id=int(params["sourceObjectId"]),
                target_object_id=int(params["targetObjectId"]),
            )
            created = obj_service.create_link(db, link)
            result["linkId"] = created.id
            result["status"] = "created"

        elif rule.rule_type == "DELETE_LINK":
            link_id = int(params["linkId"])
            obj_service.delete_link(db, link_id)
            result["linkId"] = link_id
            result["status"] = "deleted"

        else:
            raise ValueError(f"Unknown ruleType: {rule.rule_type}")

    except Exception as e:
        result["status"] = "failed"
        result["error"] = str(e)

    return result


def _evaluate_condition(condition_json: str, params: dict) -> bool:
    try:
        condition = json.loads(condition_json)
        field = condition.get("field")
        operator = condition.get("operator")
        value = condition.get("value")
        actual = params.get(field)
        if actual is None:
            return False
        if operator == "eq":
            return str(actual) == str(value)
        elif operator == "neq":
            return str(actual) != str(value)
        elif operator == "exists":
            return True
        return True
    except Exception:
        return True


def _resolve_property_mappings(mappings_json: str, params: dict) -> dict:
    if not mappings_json or not mappings_json.strip():
        return {}
    try:
        mappings = json.loads(mappings_json)
        resolved = {}
        for key, val in mappings.items():
            val_str = str(val)
            if val_str.startswith("$parameters."):
                param_name = val_str[len("$parameters."):]
                resolved[key] = params.get(param_name, "")
            else:
                resolved[key] = val
        return resolved
    except Exception:
        return {}


def _to_json(obj) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False)
    except Exception:
        return "{}"
