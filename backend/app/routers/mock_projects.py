"""Mock projects router – serves data from JSON files, no DB required."""

import math
import random
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from starlette.responses import Response

from app.services.mock_json_store import project_store, next_proj_id

router = APIRouter(prefix="/api/projects", tags=["mock-projects"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def find_project(pid: str):
    """Return (project_dict, index) or raise 404."""
    for idx, p in enumerate(project_store.data.get("projects", [])):
        if str(p.get("id")) == str(pid):
            return p, idx
    raise HTTPException(status_code=404, detail="Project not found")


def _now() -> str:
    return datetime.now().isoformat()


def _project_summary(p: dict) -> dict:
    return {
        "id": p.get("id"),
        "name": p.get("name", ""),
        "category": p.get("category", ""),
        "description": p.get("description", ""),
        "createdAt": p.get("createdAt", ""),
        "updatedAt": p.get("updatedAt", ""),
        "documentCount": len(p.get("documents", [])),
        "versionCount": len(p.get("versions", [])),
        "latestRunStatus": p.get("latestRunStatus"),
    }


# ---------------------------------------------------------------------------
# Project CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_projects():
    return [_project_summary(p) for p in project_store.data.get("projects", [])]


@router.post("/")
async def create_project(request: Request):
    body = await request.json()
    new_id = next_proj_id()
    now = _now()
    proj = {
        "id": new_id,
        "name": body.get("name", ""),
        "description": body.get("description", ""),
        "category": body.get("category", ""),
        "createdAt": now,
        "updatedAt": now,
        "documents": [],
        "dataSources": [],
        "schema": {"entityTypes": [], "relationTypes": [], "prompts": {}},
        "skills": [],
        "runs": [],
        "versions": [],
        "actions": [],
        "functions": [],
        "latestRunStatus": None,
    }
    project_store.data.setdefault("projects", []).append(proj)
    project_store.save()
    return _project_summary(proj)


@router.get("/{pid}")
def get_project(pid: str):
    proj, _ = find_project(pid)
    return proj


@router.patch("/{pid}")
async def patch_project(pid: str, request: Request):
    body = await request.json()
    proj, _ = find_project(pid)
    for field in ("name", "description", "category"):
        if field in body:
            proj[field] = body[field]
    proj["updatedAt"] = _now()
    project_store.save()
    return _project_summary(proj)


@router.delete("/{pid}")
def delete_project(pid: str):
    projects = project_store.data.get("projects", [])
    project_store.data["projects"] = [p for p in projects if str(p.get("id")) != str(pid)]
    project_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

@router.post("/{pid}/documents")
async def upload_document(pid: str, file: UploadFile = File(...)):
    proj, _ = find_project(pid)
    new_id = next_proj_id()
    doc = {
        "id": new_id,
        "fileName": file.filename,
        "fileSize": 0,
        "enabled": True,
        "uploadedAt": _now(),
    }
    content = await file.read()
    doc["fileSize"] = len(content)
    proj.setdefault("documents", []).append(doc)
    proj["updatedAt"] = _now()
    project_store.save()
    return doc


@router.patch("/{pid}/documents/{did}")
async def patch_document(pid: str, did: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for doc in proj.get("documents", []):
        if str(doc.get("id")) == str(did):
            if "enabled" in body:
                doc["enabled"] = body["enabled"]
            project_store.save()
            return doc
    raise HTTPException(status_code=404, detail="Document not found")


@router.delete("/{pid}/documents/{did}")
def delete_document(pid: str, did: str):
    proj, _ = find_project(pid)
    proj["documents"] = [d for d in proj.get("documents", []) if str(d.get("id")) != str(did)]
    proj["updatedAt"] = _now()
    project_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Data Sources
# ---------------------------------------------------------------------------

@router.post("/{pid}/data-sources")
async def create_data_source(pid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    new_id = next_proj_id()
    ds = {**body, "id": new_id, "createdAt": _now(), "enabled": True}
    proj.setdefault("dataSources", []).append(ds)
    proj["updatedAt"] = _now()
    project_store.save()
    return ds


@router.put("/{pid}/data-sources/{dsid}")
async def update_data_source(pid: str, dsid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for ds in proj.get("dataSources", []):
        if str(ds.get("id")) == str(dsid):
            ds.update(body)
            project_store.save()
            return ds
    raise HTTPException(status_code=404, detail="DataSource not found")


@router.patch("/{pid}/data-sources/{dsid}")
async def patch_data_source(pid: str, dsid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for ds in proj.get("dataSources", []):
        if str(ds.get("id")) == str(dsid):
            if "enabled" in body:
                ds["enabled"] = body["enabled"]
            project_store.save()
            return ds
    raise HTTPException(status_code=404, detail="DataSource not found")


@router.delete("/{pid}/data-sources/{dsid}")
def delete_data_source(pid: str, dsid: str):
    proj, _ = find_project(pid)
    proj["dataSources"] = [d for d in proj.get("dataSources", []) if str(d.get("id")) != str(dsid)]
    proj["updatedAt"] = _now()
    project_store.save()
    return Response(status_code=204)


@router.post("/{pid}/data-sources/{dsid}/test-connection")
async def test_connection(pid: str, dsid: str):
    success = random.random() < 0.85
    return {
        "success": success,
        "message": "Connection successful" if success else "Connection failed: timeout",
        "latencyMs": random.randint(50, 500),
        "testedAt": _now(),
    }


# ---------------------------------------------------------------------------
# Schema – Entity Types
# ---------------------------------------------------------------------------

@router.post("/{pid}/schema/entity-types")
async def create_entity_type(pid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    new_id = next_proj_id()
    et = {
        **body,
        "id": new_id,
        "properties": body.get("properties", []),
        "createdAt": _now(),
    }
    proj.setdefault("schema", {}).setdefault("entityTypes", []).append(et)
    proj["updatedAt"] = _now()
    project_store.save()
    return et


@router.put("/{pid}/schema/entity-types/{etid}")
async def update_entity_type(pid: str, etid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for et in proj.get("schema", {}).get("entityTypes", []):
        if str(et.get("id")) == str(etid):
            et.update(body)
            project_store.save()
            return et
    raise HTTPException(status_code=404, detail="EntityType not found")


@router.delete("/{pid}/schema/entity-types/{etid}")
def delete_entity_type(pid: str, etid: str):
    proj, _ = find_project(pid)
    ets = proj.get("schema", {}).get("entityTypes", [])
    proj["schema"]["entityTypes"] = [e for e in ets if str(e.get("id")) != str(etid)]
    proj["updatedAt"] = _now()
    project_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Schema – Relation Types
# ---------------------------------------------------------------------------

@router.post("/{pid}/schema/relation-types")
async def create_relation_type(pid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    new_id = next_proj_id()
    rt = {**body, "id": new_id, "createdAt": _now()}
    proj.setdefault("schema", {}).setdefault("relationTypes", []).append(rt)
    proj["updatedAt"] = _now()
    project_store.save()
    return rt


@router.put("/{pid}/schema/relation-types/{rtid}")
async def update_relation_type(pid: str, rtid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for rt in proj.get("schema", {}).get("relationTypes", []):
        if str(rt.get("id")) == str(rtid):
            rt.update(body)
            project_store.save()
            return rt
    raise HTTPException(status_code=404, detail="RelationType not found")


@router.delete("/{pid}/schema/relation-types/{rtid}")
def delete_relation_type(pid: str, rtid: str):
    proj, _ = find_project(pid)
    rts = proj.get("schema", {}).get("relationTypes", [])
    proj["schema"]["relationTypes"] = [r for r in rts if str(r.get("id")) != str(rtid)]
    proj["updatedAt"] = _now()
    project_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Schema – Clear & Prompts
# ---------------------------------------------------------------------------

@router.delete("/{pid}/schema")
def clear_schema(pid: str):
    proj, _ = find_project(pid)
    proj["schema"] = {"entityTypes": [], "relationTypes": [], "prompts": {}}
    proj["updatedAt"] = _now()
    project_store.save()
    return Response(status_code=204)


@router.patch("/{pid}/schema/prompts")
async def update_prompts(pid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    prompts = proj.setdefault("schema", {}).setdefault("prompts", {})
    for field in ("entityScope", "relationScope", "skills"):
        if field in body:
            prompts[field] = body[field]
    proj["updatedAt"] = _now()
    project_store.save()
    return prompts


# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------

@router.post("/{pid}/skills/upload")
async def upload_skill(pid: str, file: UploadFile = File(...)):
    proj, _ = find_project(pid)
    new_id = next_proj_id()
    content = await file.read()
    skill = {
        "id": new_id,
        "fileName": file.filename,
        "fileSize": len(content),
        "uploadedAt": _now(),
    }
    proj.setdefault("skills", []).append(skill)
    proj["updatedAt"] = _now()
    project_store.save()
    return skill


@router.delete("/{pid}/skills/{sid}")
def delete_skill(pid: str, sid: str):
    proj, _ = find_project(pid)
    proj["skills"] = [s for s in proj.get("skills", []) if str(s.get("id")) != str(sid)]
    proj["updatedAt"] = _now()
    project_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# AI Insight
# ---------------------------------------------------------------------------

@router.post("/{pid}/schema/ai-insight")
async def ai_insight(pid: str):
    proj, _ = find_project(pid)
    now = _now()
    mock_entities = [
        {"id": next_proj_id(), "name": "Customer", "displayName": "客户", "properties": [
            {"name": "name", "dataType": "string"}, {"name": "level", "dataType": "string"}
        ], "createdAt": now},
        {"id": next_proj_id(), "name": "Order", "displayName": "订单", "properties": [
            {"name": "orderNo", "dataType": "string"}, {"name": "amount", "dataType": "number"}
        ], "createdAt": now},
        {"id": next_proj_id(), "name": "Product", "displayName": "产品", "properties": [
            {"name": "sku", "dataType": "string"}, {"name": "price", "dataType": "number"}
        ], "createdAt": now},
    ]
    schema = proj.setdefault("schema", {})
    ets = schema.setdefault("entityTypes", [])
    ets.extend(mock_entities)
    proj["updatedAt"] = now
    run = {
        "id": next_proj_id(),
        "status": "completed",
        "startedAt": now,
        "completedAt": now,
        "entitiesExtracted": len(mock_entities),
        "relationsExtracted": 0,
        "entities": mock_entities,
    }
    project_store.save()
    return run


# ---------------------------------------------------------------------------
# Extraction Runs
# ---------------------------------------------------------------------------

@router.post("/{pid}/runs")
async def create_run(pid: str):
    proj, _ = find_project(pid)
    now = _now()
    run_id = next_proj_id()
    entity_types = proj.get("schema", {}).get("entityTypes", [])
    review_items = []
    for et in entity_types[:5]:
        for i in range(random.randint(2, 5)):
            review_items.append({
                "id": next_proj_id(),
                "entityType": et.get("name", "Unknown"),
                "entityName": f"{et.get('displayName', 'Item')}_{i + 1}",
                "status": "pending",
                "confidence": round(random.uniform(0.6, 0.99), 2),
                "source": "document",
                "extractedAt": now,
            })
    run = {
        "id": run_id,
        "status": "completed",
        "startedAt": now,
        "completedAt": now,
        "totalItems": len(review_items),
        "pendingReviewCount": len(review_items),
        "reviewItems": review_items,
    }
    proj.setdefault("runs", []).append(run)
    proj["latestRunStatus"] = "completed"
    proj["updatedAt"] = now
    project_store.save()
    return run


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------

@router.patch("/{pid}/runs/{rid}/review-items/batch")
async def batch_review(pid: str, rid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    item_ids = [str(i) for i in body.get("itemIds", [])]
    new_status = body.get("status", "approved")
    updated = 0
    pending = 0
    for run in proj.get("runs", []):
        if str(run.get("id")) == str(rid):
            for item in run.get("reviewItems", []):
                if str(item.get("id")) in item_ids:
                    item["status"] = new_status
                    updated += 1
            pending = sum(1 for it in run.get("reviewItems", []) if it.get("status") == "pending")
            run["pendingReviewCount"] = pending
            break
    project_store.save()
    return {"updatedCount": updated, "pendingReviewCount": pending}


@router.patch("/{pid}/runs/{rid}/review-items/{iid}")
async def update_review_item(pid: str, rid: str, iid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for run in proj.get("runs", []):
        if str(run.get("id")) == str(rid):
            for item in run.get("reviewItems", []):
                if str(item.get("id")) == str(iid):
                    if "status" in body:
                        item["status"] = body["status"]
                    project_store.save()
                    return item
    raise HTTPException(status_code=404, detail="ReviewItem not found")


# ---------------------------------------------------------------------------
# Versions
# ---------------------------------------------------------------------------

@router.post("/{pid}/runs/{rid}/publish")
async def publish_version(pid: str, rid: str):
    proj, _ = find_project(pid)
    now = _now()
    for run in proj.get("runs", []):
        if str(run.get("id")) == str(rid):
            version_num = len(proj.get("versions", [])) + 1
            version = {
                "id": next_proj_id(),
                "version": f"v{version_num}.0",
                "runId": rid,
                "publishedAt": now,
                "publishedBy": "current_user",
                "itemCount": sum(
                    1 for it in run.get("reviewItems", []) if it.get("status") == "approved"
                ),
            }
            proj.setdefault("versions", []).append(version)
            proj["updatedAt"] = now
            project_store.save()
            return version
    raise HTTPException(status_code=404, detail="Run not found")


@router.get("/{pid}/versions/{vid}/items")
def get_version_items(pid: str, vid: str):
    proj, _ = find_project(pid)
    for version in proj.get("versions", []):
        if str(version.get("id")) == str(vid):
            run_id = str(version.get("runId"))
            for run in proj.get("runs", []):
                if str(run.get("id")) == run_id:
                    return [
                        it for it in run.get("reviewItems", [])
                        if it.get("status") == "approved"
                    ]
            return []
    raise HTTPException(status_code=404, detail="Version not found")


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

@router.post("/{pid}/actions")
async def create_action(pid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    new_id = next_proj_id()
    action = {**body, "id": new_id, "createdAt": _now(), "status": body.get("status", "draft")}
    proj.setdefault("actions", []).append(action)
    proj["updatedAt"] = _now()
    project_store.save()
    return action


@router.put("/{pid}/actions/{aid}")
async def update_action(pid: str, aid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for action in proj.get("actions", []):
        if str(action.get("id")) == str(aid):
            action.update(body)
            proj["updatedAt"] = _now()
            project_store.save()
            return action
    raise HTTPException(status_code=404, detail="Action not found")


@router.patch("/{pid}/actions/{aid}")
async def patch_action(pid: str, aid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for action in proj.get("actions", []):
        if str(action.get("id")) == str(aid):
            if "status" in body:
                action["status"] = body["status"]
            proj["updatedAt"] = _now()
            project_store.save()
            return action
    raise HTTPException(status_code=404, detail="Action not found")


@router.delete("/{pid}/actions/{aid}")
def delete_action(pid: str, aid: str):
    proj, _ = find_project(pid)
    proj["actions"] = [a for a in proj.get("actions", []) if str(a.get("id")) != str(aid)]
    proj["updatedAt"] = _now()
    project_store.save()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------

@router.post("/{pid}/functions")
async def create_function(pid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    new_id = next_proj_id()
    fn = {**body, "id": new_id, "createdAt": _now(), "status": body.get("status", "draft")}
    proj.setdefault("functions", []).append(fn)
    proj["updatedAt"] = _now()
    project_store.save()
    return fn


@router.put("/{pid}/functions/{fid}")
async def update_function(pid: str, fid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for fn in proj.get("functions", []):
        if str(fn.get("id")) == str(fid):
            fn.update(body)
            proj["updatedAt"] = _now()
            project_store.save()
            return fn
    raise HTTPException(status_code=404, detail="Function not found")


@router.patch("/{pid}/functions/{fid}")
async def patch_function(pid: str, fid: str, request: Request):
    proj, _ = find_project(pid)
    body = await request.json()
    for fn in proj.get("functions", []):
        if str(fn.get("id")) == str(fid):
            if "status" in body:
                fn["status"] = body["status"]
            proj["updatedAt"] = _now()
            project_store.save()
            return fn
    raise HTTPException(status_code=404, detail="Function not found")


@router.delete("/{pid}/functions/{fid}")
def delete_function(pid: str, fid: str):
    proj, _ = find_project(pid)
    proj["functions"] = [f for f in proj.get("functions", []) if str(f.get("id")) != str(fid)]
    proj["updatedAt"] = _now()
    project_store.save()
    return Response(status_code=204)
