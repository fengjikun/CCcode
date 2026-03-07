"""Agent 路由 — 设备故障监控告警 + 本体知识问答（SSE 流式）"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import agent_service

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    projectId: str | None = None
    deviceContext: dict[str, Any] | None = None
    digitalHumanType: str | None = None


class WorkOrderRequest(BaseModel):
    messages: list[ChatMessage]
    projectId: str | None = None
    deviceContext: dict[str, Any] | None = None


@router.get("/alerts")
def get_alerts():
    return agent_service.list_alerts()


@router.get("/skills")
def get_skills():
    return agent_service.load_builtin_skills()


@router.post("/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """流式 SSE 响应：skill-load / step-start / step-delta / step-end / reply-start / reply-delta / done"""
    msgs = [{"role": m.role, "content": m.content} for m in req.messages]

    def generate():
        yield from agent_service.chat_stream(
            db=db,
            messages=msgs,
            project_id=req.projectId,
            device_context=req.deviceContext,
            digital_human_type=req.digitalHumanType,
        )

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/work-order")
def generate_work_order(req: WorkOrderRequest, db: Session = Depends(get_db)):
    msgs = [{"role": m.role, "content": m.content} for m in req.messages]
    return agent_service.generate_work_order(
        db=db,
        messages=msgs,
        project_id=req.projectId,
        device_context=req.deviceContext,
    )
