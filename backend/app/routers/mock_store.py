"""Generic mock store router for frontend mock modules."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.services.mock_json_store import ui_store

router = APIRouter(prefix="/api/mock-store", tags=["mock-store"])


def _namespaces() -> dict[str, Any]:
    ui_store.reload_if_changed()
    return ui_store.data.setdefault("namespaces", {})


@router.get("/{namespace}")
def get_namespace(namespace: str):
    data = _namespaces()
    if namespace not in data:
        raise HTTPException(status_code=404, detail="Namespace not found")
    return data[namespace]


@router.post("/{namespace}/ensure")
async def ensure_namespace(namespace: str, request: Request):
    body = await request.json()
    data = _namespaces()
    if namespace not in data:
        data[namespace] = body
        ui_store.save()
    return data[namespace]


@router.put("/{namespace}")
async def set_namespace(namespace: str, request: Request):
    body = await request.json()
    data = _namespaces()
    data[namespace] = body
    ui_store.save()
    return data[namespace]


@router.delete("/{namespace}")
def delete_namespace(namespace: str):
    data = _namespaces()
    if namespace in data:
        data.pop(namespace, None)
        ui_store.save()
    return {"ok": True}
