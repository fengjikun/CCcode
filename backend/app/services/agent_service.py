"""Agent service — 设备故障监控告警 + 本体知识问答 + Skill 流式推理"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Generator

import yaml
from sqlalchemy.orm import Session

from app.models.project_mgmt import (
    EntityType,
    Project,
    RelationType,
    SchemaProperty,
)

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")

_SKILLS_DIR_ENV = os.getenv("AGENT_SKILLS_DIR", "skills")
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
SKILLS_DIR = (
    Path(_SKILLS_DIR_ENV)
    if Path(_SKILLS_DIR_ENV).is_absolute()
    else _BACKEND_ROOT / _SKILLS_DIR_ENV
)

# ---------------------------------------------------------------------------
# Mock 告警数据
# ---------------------------------------------------------------------------

_MOCK_ALERTS = [
    {
        "id": "ALT-001",
        "deviceId": "DEV-LZC-001",
        "deviceName": "激光切割机 #1",
        "productionLine": "A线",
        "status": "故障",
        "runningHours": 1248,
        "faultType": "限位报警",
        "faultCode": "E-W001",
        "severity": "HIGH",
        "description": "W轴超出限位范围，机床紧急停止，无法继续加工作业",
        "occurredAt": (datetime.now() - timedelta(minutes=23)).isoformat(),
        "acknowledged": False,
    },
    {
        "id": "ALT-002",
        "deviceId": "DEV-LZC-002",
        "deviceName": "激光切割机 #2",
        "productionLine": "A线",
        "status": "警告",
        "runningHours": 3560,
        "faultType": "气压不足",
        "faultCode": "W-P002",
        "severity": "MEDIUM",
        "description": "切割辅助气体压力低于阈值 0.4MPa，当前压力 0.3MPa",
        "occurredAt": (datetime.now() - timedelta(hours=1, minutes=5)).isoformat(),
        "acknowledged": False,
    },
    {
        "id": "ALT-003",
        "deviceId": "DEV-WD-003",
        "deviceName": "焊接机器人 #3",
        "productionLine": "B线",
        "status": "故障",
        "runningHours": 892,
        "faultType": "伺服驱动故障",
        "faultCode": "E-S003",
        "severity": "HIGH",
        "description": "J3关节伺服驱动器过热保护触发，电机温度达到 95°C",
        "occurredAt": (datetime.now() - timedelta(minutes=47)).isoformat(),
        "acknowledged": True,
    },
    {
        "id": "ALT-004",
        "deviceId": "DEV-CNC-004",
        "deviceName": "数控加工中心 #4",
        "productionLine": "C线",
        "status": "警告",
        "runningHours": 6100,
        "faultType": "主轴振动异常",
        "faultCode": "W-V004",
        "severity": "MEDIUM",
        "description": "主轴振动值超出正常范围，当前振动加速度 3.2g，阈值 2.0g",
        "occurredAt": (datetime.now() - timedelta(hours=3)).isoformat(),
        "acknowledged": False,
    },
    {
        "id": "ALT-005",
        "deviceId": "DEV-LZC-005",
        "deviceName": "激光切割机 #5",
        "productionLine": "B线",
        "status": "提示",
        "runningHours": 4200,
        "faultType": "保养提醒",
        "faultCode": "I-M005",
        "severity": "LOW",
        "description": "累计运行时长超过 4000 小时，建议执行定期保养检查",
        "occurredAt": (datetime.now() - timedelta(days=1)).isoformat(),
        "acknowledged": True,
    },
]


def list_alerts() -> list[dict]:
    return _MOCK_ALERTS


# ---------------------------------------------------------------------------
# 内置 Skill 加载
# ---------------------------------------------------------------------------

def _parse_skill_md(skill_md_path: Path) -> dict[str, Any]:
    text = skill_md_path.read_text(encoding="utf-8")
    meta: dict[str, Any] = {}
    body = text
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if fm_match:
        try:
            meta = yaml.safe_load(fm_match.group(1)) or {}
        except Exception:
            meta = {}
        body = text[fm_match.end():]

    prompt = ""
    prompt_match = re.search(r"##\s*系统提示词\s*\n(.*?)(?=\n##|\Z)", body, re.DOTALL)
    if prompt_match:
        prompt = prompt_match.group(1).strip()

    return {
        "code": meta.get("code", skill_md_path.parent.name),
        "name": meta.get("name", skill_md_path.parent.name),
        "description": meta.get("description", ""),
        "version": meta.get("version", "1.0.0"),
        "tags": meta.get("tags", []),
        "prompt": prompt,
        "source": "built_in",
    }


def load_builtin_skills() -> list[dict[str, Any]]:
    skills: list[dict[str, Any]] = []
    if not SKILLS_DIR.is_dir():
        return skills
    for skill_dir in sorted(SKILLS_DIR.iterdir()):
        md_file = skill_dir / "SKILL.md"
        if skill_dir.is_dir() and md_file.exists():
            try:
                skills.append(_parse_skill_md(md_file))
            except Exception:
                pass
    return skills


def get_skill_for_context(digital_human_type: str | None = None) -> dict[str, Any] | None:
    skills = load_builtin_skills()
    if not skills:
        return None
    type_to_code = {
        "fault-repair": "fault_repair",
        "engineering-design": "engineering_design",
        "process-optimization": "process_optimization",
        "bom-analysis": "bom_analysis",
        "operation-decision": "operation_decision",
        "store-matching": "store_matching",
        "data-ops": "data_ops",
        "tax-planning": "tax_planning",
    }
    preferred_code = type_to_code.get(digital_human_type or "", "fault_repair")
    for skill in skills:
        if skill["code"] == preferred_code:
            return skill
    return skills[0]


# ---------------------------------------------------------------------------
# 本体上下文加载
# ---------------------------------------------------------------------------

def load_ontology_context(db: Session, project_id: str) -> str:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return ""
    entity_types = db.query(EntityType).filter(EntityType.project_id == project_id).all()
    relation_types = db.query(RelationType).filter(RelationType.project_id == project_id).all()
    properties = db.query(SchemaProperty).filter(SchemaProperty.project_id == project_id).all()

    prop_map: dict[str, list] = {}
    for p in properties:
        prop_map.setdefault(p.owner_id, []).append(p)

    lines: list[str] = [f"【领域知识本体 — 项目：{project.name}】\n"]
    if entity_types:
        lines.append("实体类型：")
        for et in entity_types:
            props = prop_map.get(et.id, [])
            prop_str = "、".join(p.display_name or p.name for p in props) if props else "无"
            desc = f"（{et.description}）" if et.description else ""
            lines.append(f"  · {et.name}{desc}  属性：[{prop_str}]")
    if relation_types:
        lines.append("\n关系类型：")
        et_name_map = {et.id: et.name for et in entity_types}
        for rt in relation_types:
            domain = et_name_map.get(rt.domain_entity_type_id, rt.domain_entity_type_id)
            range_ = et_name_map.get(rt.range_entity_type_id, rt.range_entity_type_id)
            desc = f"（{rt.description}）" if rt.description else ""
            lines.append(f"  · {domain} —[{rt.name}]→ {range_}{desc}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 构建系统提示词
# ---------------------------------------------------------------------------

def _build_system_prompt(
    skill: dict[str, Any] | None,
    ontology_ctx: str,
    device_ctx: dict | None,
) -> str:
    parts: list[str] = []
    if skill and skill.get("prompt"):
        parts.append(skill["prompt"])
    else:
        parts.append(
            "你是一名专业的工业设备故障诊断 AI 助手。\n"
            "请按以下格式逐步输出分析结果：\n\n"
            "STEP 告警解析\n<内容>\n\nSTEP 根因分析\n<内容>\n\nSTEP 影响评估\n<内容>\n\nSTEP 维修方案\n<内容>\n\nSTEP 预防建议\n<内容>\n\nREPLY\n<综合结论>"
        )
    if ontology_ctx:
        parts.append("\n" + ontology_ctx)
    if device_ctx:
        parts.append(
            f"\n【当前分析设备】\n"
            f"  设备ID：{device_ctx.get('deviceId', '未知')}\n"
            f"  设备名称：{device_ctx.get('deviceName', '未知')}\n"
            f"  状态：{device_ctx.get('status', '未知')}\n"
            f"  累计运行时长：{device_ctx.get('runningHours', '未知')} 小时\n"
            f"  产线：{device_ctx.get('productionLine', '未知')}\n"
            f"  故障类型：{device_ctx.get('faultType', '未知')}\n"
            f"  故障代码：{device_ctx.get('faultCode', '未知')}\n"
            f"  故障描述：{device_ctx.get('description', '未知')}\n"
            f"  严重程度：{device_ctx.get('severity', '未知')}\n"
            f"  发生时间：{device_ctx.get('occurredAt', '未知')}"
        )
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# SSE 事件格式化
# ---------------------------------------------------------------------------

def _sse(event: str, data: Any) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


# ---------------------------------------------------------------------------
# 流式聊天 — 解析 STEP / REPLY 标记并实时推送
# ---------------------------------------------------------------------------

def chat_stream(
    db: Session,
    messages: list[dict],
    project_id: str | None,
    device_context: dict | None,
    digital_human_type: str | None = None,
) -> Generator[str, None, None]:
    """SSE 生成器：依次 yield skill-load / step-start / step-delta / step-end / reply-delta / done 事件。"""

    skill = get_skill_for_context(digital_human_type)
    ontology_ctx = load_ontology_context(db, project_id) if project_id else ""
    system_prompt = _build_system_prompt(skill, ontology_ctx, device_context)

    skill_info = {
        "name": skill["name"],
        "code": skill["code"],
        "version": skill.get("version", "1.0.0"),
    } if skill else {"name": "故障维修诊断", "code": "fault_repair", "version": "1.0.0"}

    # 1. 先推送 skill-load 事件
    yield _sse("skill-load", skill_info)

    # 无 LLM 配置时走 fallback
    if not LLM_API_KEY or not LLM_BASE_URL or not LLM_MODEL:
        yield from _fallback_stream(messages, device_context, skill_info)
        return

    try:
        from openai import OpenAI
    except ImportError:
        yield from _fallback_stream(messages, device_context, skill_info)
        return

    base_url = LLM_BASE_URL.rstrip("/")
    if not base_url.endswith("/v1"):
        base_url += "/v1"

    client = OpenAI(api_key=LLM_API_KEY, base_url=base_url)
    full_messages = [{"role": "system", "content": system_prompt}] + messages

    try:
        stream = client.chat.completions.create(
            model=LLM_MODEL,
            messages=full_messages,
            max_tokens=3000,
            stream=True,
        )
    except Exception as e:
        yield _sse("error", {"message": str(e)})
        yield _sse("done", {})
        return

    # 解析流：识别 STEP <title> / REPLY 标记，实时推送内容
    # 状态机：idle → in_step(title) → in_reply
    state = "idle"          # idle | in_step | in_reply
    current_step_title = ""
    buffer = ""             # 未处理的文本缓冲

    def _flush_buffer_as_delta(buf: str) -> Generator[str, None, None]:
        if buf:
            if state == "in_step":
                yield _sse("step-delta", {"title": current_step_title, "text": buf})
            elif state == "in_reply":
                yield _sse("reply-delta", {"text": buf})

    for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if not delta:
            continue

        buffer += delta

        # 逐行处理 buffer，遇到完整的 STEP/REPLY 标记才切换状态
        while True:
            newline_pos = buffer.find("\n")
            if newline_pos == -1:
                # 没有完整行，检查是否有 STEP/REPLY 前缀正在缓冲
                # 只要没有完整标记行，就流式输出到当前状态
                # 但要保留可能构成标记的前缀
                maybe_marker = _starts_with_marker_prefix(buffer)
                if maybe_marker:
                    # 等待更多内容来判断是否是真正的标记
                    break
                else:
                    # 安全地输出 buffer 内容
                    yield from _flush_buffer_as_delta(buffer)
                    buffer = ""
                    break

            line = buffer[:newline_pos]
            buffer = buffer[newline_pos + 1:]

            step_match = re.match(r"^STEP\s+(.+)$", line.strip())
            reply_match = re.match(r"^REPLY\s*$", line.strip())

            if step_match:
                # 关闭上一个 step
                if state == "in_step":
                    yield _sse("step-end", {"title": current_step_title})
                new_title = step_match.group(1).strip()
                current_step_title = new_title
                state = "in_step"
                yield _sse("step-start", {"title": current_step_title})
            elif reply_match:
                if state == "in_step":
                    yield _sse("step-end", {"title": current_step_title})
                state = "in_reply"
                yield _sse("reply-start", {})
            else:
                # 普通内容行
                content = line + "\n"
                yield from _flush_buffer_as_delta(content)

    # 输出剩余 buffer
    yield from _flush_buffer_as_delta(buffer)

    # 关闭最后状态
    if state == "in_step":
        yield _sse("step-end", {"title": current_step_title})

    yield _sse("done", {})


def _starts_with_marker_prefix(text: str) -> bool:
    """检查文本是否可能是 STEP/REPLY 标记的前缀（还未完整）。"""
    markers = ["STEP ", "REPLY"]
    for m in markers:
        if m.startswith(text) or text.startswith(m[:len(text)]):
            return len(text) < len(m) + 10  # 给标题留些空间
    return False


def _fallback_stream(
    messages: list[dict],
    device_context: dict | None,
    skill_info: dict,
) -> Generator[str, None, None]:
    """无 LLM 时的本地 fallback 流式输出。"""
    if device_context:
        device_name = device_context.get("deviceName", "设备")
        fault_type = device_context.get("faultType", "未知故障")
        desc = device_context.get("description", "")

        steps = [
            ("告警解析", f"设备 {device_name} 发生 {fault_type}（{desc}）"),
            ("根因分析", "可能原因：1. 机械部件磨损  2. 传感器故障  3. 参数配置异常"),
            ("影响评估", "当前故障已导致设备停机，影响当前产线生产，紧急程度：高"),
            ("维修方案", "1. 断电锁定  2. 检查故障代码  3. 参考手册排查  4. 联系厂商支持"),
            ("预防建议", "建议每 500 小时进行一次预防性维护检查，设置参数越限告警"),
        ]
        for title, content in steps:
            yield _sse("step-start", {"title": title})
            yield _sse("step-delta", {"title": title, "text": content})
            yield _sse("step-end", {"title": title})

        reply = (
            f"**[本地模式]** 设备 **{device_name}** 发生 **{fault_type}**。\n\n"
            f"故障描述：{desc}\n\n"
            f"**建议立即**：停机检查 → 参考手册 → 联系工程师。\n\n"
            f"_配置 LLM_API_KEY 后可获得 AI 深度分析。_"
        )
        yield _sse("reply-start", {})
        yield _sse("reply-delta", {"text": reply})
    else:
        yield _sse("reply-start", {})
        yield _sse("reply-delta", {"text": "请配置 LLM_API_KEY 后获得 AI 专业解答。"})

    yield _sse("done", {})


# ---------------------------------------------------------------------------
# 生成维修工单（非流式）
# ---------------------------------------------------------------------------

def generate_work_order(
    db: Session,
    messages: list[dict],
    project_id: str | None,
    device_context: dict | None,
) -> dict:
    ontology_ctx = load_ontology_context(db, project_id) if project_id else ""
    work_order_id = f"WO-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

    if not LLM_API_KEY or not LLM_BASE_URL or not LLM_MODEL:
        return _fallback_work_order(work_order_id, device_context)

    try:
        from openai import OpenAI
    except ImportError:
        return _fallback_work_order(work_order_id, device_context)

    base_url = LLM_BASE_URL.rstrip("/")
    if not base_url.endswith("/v1"):
        base_url += "/v1"
    client = OpenAI(api_key=LLM_API_KEY, base_url=base_url)

    system_prompt = (
        "你是工业设备维修工单生成助手，请根据对话历史生成一份结构化的维修工单。\n"
        "必须严格以 JSON 格式返回，不要添加任何 markdown 标记或代码块。\n"
        "字段：workOrderId, deviceId, deviceName, productionLine, faultType, faultDescription,\n"
        "      severity, suggestedRepairSteps (字符串数组), estimatedDuration, requiredTools (字符串数组),\n"
        "      safetyNotes, createdAt"
    )
    if ontology_ctx:
        system_prompt += "\n\n" + ontology_ctx
    if device_context:
        system_prompt += (
            f"\n\n当前设备：{device_context.get('deviceName')}，"
            f"故障：{device_context.get('faultType')}，"
            f"描述：{device_context.get('description')}"
        )

    full_messages = [{"role": "system", "content": system_prompt}] + messages + [
        {"role": "user", "content": f"请生成工单ID为 {work_order_id} 的维修工单（纯JSON格式）。"}
    ]

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL, messages=full_messages, max_tokens=1500,
        )
        raw = response.choices[0].message.content or "{}"
        clean = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
        clean = re.sub(r"\s*```$", "", clean)
        start, end = clean.find("{"), clean.rfind("}") + 1
        if start >= 0 and end > start:
            clean = clean[start:end]
        data = json.loads(clean)
        data.setdefault("workOrderId", work_order_id)
        data.setdefault("createdAt", datetime.now().isoformat())
        return data
    except Exception:
        return _fallback_work_order(work_order_id, device_context)


def _fallback_work_order(work_order_id: str, device_context: dict | None) -> dict:
    dc = device_context or {}
    return {
        "workOrderId": work_order_id,
        "deviceId": dc.get("deviceId", "未知"),
        "deviceName": dc.get("deviceName", "未知设备"),
        "productionLine": dc.get("productionLine", "未知产线"),
        "faultType": dc.get("faultType", "未知故障"),
        "faultDescription": dc.get("description", "待补充"),
        "severity": dc.get("severity", "MEDIUM"),
        "suggestedRepairSteps": [
            "停机并锁定设备，悬挂警示标牌",
            "检查故障代码及相关传感器状态",
            "参考设备手册排查根本原因",
            "执行维修操作",
            "恢复供电，验证设备功能正常",
            "记录维修过程并更新维护日志",
        ],
        "estimatedDuration": "2-4 小时",
        "requiredTools": ["万用表", "扳手套装", "润滑油", "备用零件"],
        "safetyNotes": "维修前必须断开电源，确认设备完全停止，遵守 LOTO 安全规程。",
        "createdAt": datetime.now().isoformat(),
        "note": "本工单由本地模式生成，请配置 LLM_API_KEY 获取 AI 定制工单。",
    }
