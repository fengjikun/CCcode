"""Mock ontology router – serves data from JSON files, no DB required."""

import json
import random
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from starlette.responses import Response

from app.services.mock_json_store import (
    ontology_overview_store,
    ontology_store,
    next_onto_id,
)

router = APIRouter(prefix="/api/ontology", tags=["mock-ontology"])


def _find_by_id(items: list[dict], item_id: int, detail: str):
    for item in items:
        if item.get("id") == item_id:
            return item
    raise HTTPException(status_code=404, detail=detail)

# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@router.get("/overview/stats")
def overview_stats():
    d = ontology_overview_store.data
    ots = d.get("objectTypes", [])
    total_props = sum(len(o.get("properties", [])) for o in ots)
    lts = d.get("linkTypes", [])
    actions = d.get("actions", [])
    total_records_raw = sum(o.get("recordCount", 0) for o in ots)
    total_records = f"{total_records_raw / 1000:.1f}K"
    active_actions = sum(1 for a in actions if str(a.get("status", "")).lower() == "active")
    return {
        "objectTypesCount": len(ots),
        "totalProperties": total_props,
        "linkTypesCount": len(lts),
        "actionsCount": len(actions),
        "totalRecords": total_records,
        "activeActions": active_actions,
    }


@router.get("/overview/object-types")
def overview_object_types():
    return ontology_overview_store.data.get("objectTypes", [])


@router.get("/overview/link-types")
def overview_link_types():
    return ontology_overview_store.data.get("linkTypes", [])


@router.get("/overview/actions")
def overview_actions():
    return ontology_overview_store.data.get("actions", [])


# ---------------------------------------------------------------------------
# Object Types CRUD
# ---------------------------------------------------------------------------

@router.get("/object-types")
def list_object_types():
    return ontology_store.data.get("objectTypes", [])


@router.post("/object-types")
async def create_object_type(request: Request):
    body = await request.json()
    new_id = next_onto_id()
    ot = {
        "id": new_id,
        "name": body.get("name", ""),
        "displayName": body.get("displayName", ""),
        "description": body.get("description", ""),
        "icon": body.get("icon", ""),
        "color": body.get("color", ""),
    }
    ontology_store.data.setdefault("objectTypes", []).append(ot)
    ontology_store.save()
    return ot


@router.get("/object-types/{ot_id}")
def get_object_type(ot_id: int):
    return _find_by_id(ontology_store.data.get("objectTypes", []), ot_id, "ObjectType not found")


@router.put("/object-types/{ot_id}")
async def update_object_type(ot_id: int, request: Request):
    body = await request.json()
    target = _find_by_id(ontology_store.data.get("objectTypes", []), ot_id, "ObjectType not found")
    target.update(body)
    ontology_store.save()
    return target


@router.delete("/object-types/{ot_id}")
def delete_object_type(ot_id: int):
    ots = ontology_store.data.get("objectTypes", [])
    ontology_store.data["objectTypes"] = [o for o in ots if o.get("id") != ot_id]
    ontology_store.data.get("properties", {}).pop(str(ot_id), None)
    ontology_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Properties
# ---------------------------------------------------------------------------

@router.get("/object-types/{ot_id}/properties")
def list_properties(ot_id: int):
    return ontology_store.data.get("properties", {}).get(str(ot_id), [])


@router.post("/object-types/{ot_id}/properties")
async def create_property(ot_id: int, request: Request):
    body = await request.json()
    new_id = next_onto_id()
    prop = {
        "id": new_id,
        "name": body.get("name", ""),
        "displayName": body.get("displayName", ""),
        "dataType": body.get("dataType", ""),
        "required": body.get("required", False),
        "defaultValue": body.get("defaultValue"),
        "sortOrder": body.get("sortOrder", 0),
    }
    props = ontology_store.data.setdefault("properties", {})
    props.setdefault(str(ot_id), []).append(prop)
    ontology_store.save()
    return prop


@router.put("/properties/{prop_id}")
async def update_property(prop_id: int, request: Request):
    body = await request.json()
    props = ontology_store.data.get("properties", {})
    for key in list(props.keys()):
        for item in props[key]:
            if item.get("id") == prop_id:
                item.update(body)
                ontology_store.save()
                return item
    raise HTTPException(status_code=404, detail="Property not found")


@router.delete("/properties/{prop_id}")
def delete_property(prop_id: int):
    props = ontology_store.data.get("properties", {})
    for key in list(props.keys()):
        props[key] = [p for p in props[key] if p.get("id") != prop_id]
    ontology_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Link Types
# ---------------------------------------------------------------------------

@router.get("/link-types")
def list_link_types():
    return ontology_store.data.get("linkTypes", [])


@router.post("/link-types")
async def create_link_type(request: Request):
    body = await request.json()
    new_id = next_onto_id()
    lt = {
        "id": new_id,
        "name": body.get("name", ""),
        "displayName": body.get("displayName", ""),
        "sourceObjectTypeId": body.get("sourceObjectTypeId"),
        "targetObjectTypeId": body.get("targetObjectTypeId"),
        "cardinality": body.get("cardinality", ""),
        "description": body.get("description", ""),
    }
    ontology_store.data.setdefault("linkTypes", []).append(lt)
    ontology_store.save()
    return lt


@router.get("/link-types/{lt_id}")
def get_link_type(lt_id: int):
    return _find_by_id(ontology_store.data.get("linkTypes", []), lt_id, "LinkType not found")


@router.put("/link-types/{lt_id}")
async def update_link_type(lt_id: int, request: Request):
    body = await request.json()
    target = _find_by_id(ontology_store.data.get("linkTypes", []), lt_id, "LinkType not found")
    target.update(body)
    ontology_store.save()
    return target


@router.delete("/link-types/{lt_id}")
def delete_link_type(lt_id: int):
    lts = ontology_store.data.get("linkTypes", [])
    ontology_store.data["linkTypes"] = [l for l in lts if l.get("id") != lt_id]
    ontology_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Schema (bulk clear)
# ---------------------------------------------------------------------------

@router.get("/schema")
def get_schema():
    return {
        "objectTypes": ontology_store.data.get("objectTypes", []),
        "properties": ontology_store.data.get("properties", {}),
        "linkTypes": ontology_store.data.get("linkTypes", []),
    }


@router.delete("/schema")
def clear_schema():
    ontology_store.data["objectTypes"] = []
    ontology_store.data["properties"] = {}
    ontology_store.data["linkTypes"] = []
    ontology_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Action Types
# ---------------------------------------------------------------------------

@router.get("/action-types")
def list_action_types():
    return ontology_store.data.get("actionTypes", [])


@router.get("/action-types/{at_id}")
def get_action_type(at_id: int):
    return _find_by_id(ontology_store.data.get("actionTypes", []), at_id, "ActionType not found")


@router.post("/action-types")
async def create_action_type(request: Request):
    body = await request.json()
    new_id = next_onto_id()
    body["id"] = new_id
    ontology_store.data.setdefault("actionTypes", []).append(body)
    ontology_store.save()
    return body


@router.put("/action-types/{at_id}")
async def update_action_type(at_id: int, request: Request):
    body = await request.json()
    for at in ontology_store.data.get("actionTypes", []):
        if at.get("id") == at_id:
            at.update(body)
            ontology_store.save()
            return at
    raise HTTPException(status_code=404, detail="ActionType not found")


@router.delete("/action-types/{at_id}")
def delete_action_type(at_id: int):
    ats = ontology_store.data.get("actionTypes", [])
    ontology_store.data["actionTypes"] = [a for a in ats if a.get("id") != at_id]
    ontology_store.data.get("actionParameters", {}).pop(str(at_id), None)
    ontology_store.data.get("actionRules", {}).pop(str(at_id), None)
    ontology_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Action Parameters
# ---------------------------------------------------------------------------

@router.get("/action-types/{at_id}/parameters")
def list_action_parameters(at_id: int):
    return ontology_store.data.get("actionParameters", {}).get(str(at_id), [])


@router.post("/action-types/{at_id}/parameters")
async def create_action_parameter(at_id: int, request: Request):
    body = await request.json()
    new_id = next_onto_id()
    body["id"] = new_id
    params = ontology_store.data.setdefault("actionParameters", {})
    params.setdefault(str(at_id), []).append(body)
    ontology_store.save()
    return body


@router.put("/parameters/{param_id}")
async def update_action_parameter(param_id: int, request: Request):
    body = await request.json()
    params = ontology_store.data.get("actionParameters", {})
    for key in list(params.keys()):
        for item in params[key]:
            if item.get("id") == param_id:
                item.update(body)
                ontology_store.save()
                return item
    raise HTTPException(status_code=404, detail="ActionParameter not found")


@router.delete("/parameters/{param_id}")
def delete_action_parameter(param_id: int):
    params = ontology_store.data.get("actionParameters", {})
    for key in list(params.keys()):
        params[key] = [p for p in params[key] if p.get("id") != param_id]
    ontology_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Action Rules
# ---------------------------------------------------------------------------

@router.get("/action-types/{at_id}/rules")
def list_action_rules(at_id: int):
    return ontology_store.data.get("actionRules", {}).get(str(at_id), [])


@router.post("/action-types/{at_id}/rules")
async def create_action_rule(at_id: int, request: Request):
    body = await request.json()
    new_id = next_onto_id()
    body["id"] = new_id
    rules = ontology_store.data.setdefault("actionRules", {})
    rules.setdefault(str(at_id), []).append(body)
    ontology_store.save()
    return body


@router.put("/rules/{rule_id}")
async def update_action_rule(rule_id: int, request: Request):
    body = await request.json()
    rules = ontology_store.data.get("actionRules", {})
    for key in list(rules.keys()):
        for item in rules[key]:
            if item.get("id") == rule_id:
                item.update(body)
                ontology_store.save()
                return item
    raise HTTPException(status_code=404, detail="ActionRule not found")


@router.delete("/rules/{rule_id}")
def delete_action_rule(rule_id: int):
    rules = ontology_store.data.get("actionRules", {})
    for key in list(rules.keys()):
        rules[key] = [r for r in rules[key] if r.get("id") != rule_id]
    ontology_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Executions (mock)
# ---------------------------------------------------------------------------

@router.get("/action-types/{at_id}/executions")
def list_executions(at_id: int):
    now = datetime.now().isoformat()
    return [
        {
            "id": 1,
            "actionTypeId": at_id,
            "status": "SUCCESS",
            "executedAt": now,
            "durationMs": 1230,
            "outputDataJson": "{\"message\":\"Completed successfully\"}",
        },
        {
            "id": 2,
            "actionTypeId": at_id,
            "status": "SUCCESS",
            "executedAt": now,
            "durationMs": 890,
            "outputDataJson": "{\"message\":\"Completed successfully\"}",
        },
        {
            "id": 3,
            "actionTypeId": at_id,
            "status": "FAILED",
            "executedAt": now,
            "durationMs": 450,
            "errorMessage": "Timeout error",
        },
    ]


@router.post("/action-types/{at_id}/execute")
async def execute_action(at_id: int, request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    return {
        "id": random.randint(100, 9999),
        "actionTypeId": at_id,
        "status": "SUCCESS",
        "executedAt": datetime.now().isoformat(),
        "durationMs": random.randint(200, 3000),
        "outputDataJson": "{\"message\":\"Execution completed successfully\"}",
        "parametersJson": json.dumps(body, ensure_ascii=False),
    }


# ---------------------------------------------------------------------------
# Objects & Links
# ---------------------------------------------------------------------------

@router.get("/objects/{type_id}")
def list_objects(type_id: int):
    return [
        o
        for o in ontology_store.data.setdefault("objects", [])
        if o.get("objectTypeId") == type_id
    ]


@router.post("/objects/{type_id}")
async def create_object(type_id: int, request: Request):
    body = await request.json()
    new_id = next_onto_id()
    item = {
        "id": new_id,
        "objectTypeId": type_id,
        "externalId": body.get("externalId"),
        "propertiesJson": body.get("propertiesJson"),
    }
    ontology_store.data.setdefault("objects", []).append(item)
    ontology_store.save()
    return item


@router.delete("/objects/{object_id}")
def delete_object(object_id: int):
    objects = ontology_store.data.get("objects", [])
    ontology_store.data["objects"] = [o for o in objects if o.get("id") != object_id]
    links = ontology_store.data.get("links", [])
    ontology_store.data["links"] = [
        l
        for l in links
        if l.get("sourceObjectId") != object_id and l.get("targetObjectId") != object_id
    ]
    ontology_store.save()
    return Response(status_code=204)


@router.get("/links")
def list_links():
    return ontology_store.data.setdefault("links", [])


@router.post("/links")
async def create_link(request: Request):
    body = await request.json()
    new_id = next_onto_id()
    item = {
        "id": new_id,
        "linkTypeId": body.get("linkTypeId"),
        "sourceObjectId": body.get("sourceObjectId"),
        "targetObjectId": body.get("targetObjectId"),
    }
    ontology_store.data.setdefault("links", []).append(item)
    ontology_store.save()
    return item


@router.delete("/links/{link_id}")
def delete_link(link_id: int):
    links = ontology_store.data.get("links", [])
    ontology_store.data["links"] = [l for l in links if l.get("id") != link_id]
    ontology_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------

@router.get("/functions")
def list_functions():
    return ontology_store.data.get("functions", [])


@router.get("/functions/{fn_id}")
def get_function(fn_id: int):
    return _find_by_id(ontology_store.data.get("functions", []), fn_id, "Function not found")


@router.post("/functions")
async def create_function(request: Request):
    body = await request.json()
    new_id = next_onto_id()
    fn = {
        "id": new_id,
        "name": body.get("name", ""),
        "displayName": body.get("displayName", ""),
        "description": body.get("description", ""),
        "status": body.get("status", "DRAFT"),
        "scriptType": body.get("scriptType", "PYTHON"),
        "scriptContent": body.get("scriptContent", ""),
    }
    ontology_store.data.setdefault("functions", []).append(fn)
    ontology_store.save()
    return fn


@router.put("/functions/{fn_id}")
async def update_function(fn_id: int, request: Request):
    body = await request.json()
    for fn in ontology_store.data.get("functions", []):
        if fn.get("id") == fn_id:
            fn.update(body)
            ontology_store.save()
            return fn
    raise HTTPException(status_code=404, detail="Function not found")


@router.delete("/functions/{fn_id}")
def delete_function(fn_id: int):
    fns = ontology_store.data.get("functions", [])
    ontology_store.data["functions"] = [f for f in fns if f.get("id") != fn_id]
    ontology_store.save()
    return Response(status_code=204)


@router.post("/functions/{fn_id}/execute")
async def execute_function(fn_id: int, request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    return {
        "id": random.randint(100, 9999),
        "functionId": fn_id,
        "status": "SUCCESS",
        "executedAt": datetime.now().isoformat(),
        "durationMs": random.randint(100, 2000),
        "inputDataJson": json.dumps(body, ensure_ascii=False),
        "outputDataJson": "{\"message\":\"Function executed successfully\"}",
    }


@router.get("/functions/{fn_id}/logs")
def list_function_logs(fn_id: int):
    now = datetime.now().isoformat()
    return [
        {
            "id": random.randint(100, 9999),
            "functionId": fn_id,
            "status": "SUCCESS",
            "durationMs": random.randint(100, 800),
            "executedAt": now,
            "outputDataJson": "{\"message\":\"Function executed successfully\"}",
        }
    ]
