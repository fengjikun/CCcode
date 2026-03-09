"""Mock ontology router – serves data from JSON files, no DB required."""

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
    active_actions = sum(1 for a in actions if a.get("status") == "active")
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


@router.delete("/link-types/{lt_id}")
def delete_link_type(lt_id: int):
    lts = ontology_store.data.get("linkTypes", [])
    ontology_store.data["linkTypes"] = [l for l in lts if l.get("id") != lt_id]
    ontology_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Schema (bulk clear)
# ---------------------------------------------------------------------------

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
    for at in ontology_store.data.get("actionTypes", []):
        if at.get("id") == at_id:
            return at
    raise HTTPException(status_code=404, detail="ActionType not found")


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
            "status": "success",
            "startedAt": now,
            "duration": 1230,
            "triggeredBy": "system",
            "result": "Completed successfully",
        },
        {
            "id": 2,
            "actionTypeId": at_id,
            "status": "success",
            "startedAt": now,
            "duration": 890,
            "triggeredBy": "user",
            "result": "Completed successfully",
        },
        {
            "id": 3,
            "actionTypeId": at_id,
            "status": "failed",
            "startedAt": now,
            "duration": 450,
            "triggeredBy": "schedule",
            "result": "Timeout error",
        },
    ]


@router.post("/action-types/{at_id}/execute")
async def execute_action(at_id: int):
    return {
        "id": random.randint(100, 9999),
        "actionTypeId": at_id,
        "status": "success",
        "startedAt": datetime.now().isoformat(),
        "duration": random.randint(200, 3000),
        "triggeredBy": "user",
        "result": "Execution completed successfully",
    }


# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------

@router.get("/functions")
def list_functions():
    return ontology_store.data.get("functions", [])


@router.post("/functions")
async def create_function(request: Request):
    body = await request.json()
    new_id = next_onto_id()
    fn = {
        "id": new_id,
        "name": body.get("name", ""),
        "displayName": body.get("displayName", ""),
        "description": body.get("description", ""),
        "status": body.get("status", "draft"),
        "scriptType": body.get("scriptType", "python"),
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
async def execute_function(fn_id: int):
    return {
        "id": random.randint(100, 9999),
        "functionId": fn_id,
        "status": "success",
        "startedAt": datetime.now().isoformat(),
        "duration": random.randint(100, 2000),
        "result": "Function executed successfully",
    }
