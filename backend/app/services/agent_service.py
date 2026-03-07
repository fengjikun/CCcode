"""Agent service — 设备故障监控告警 + 本体知识问答 + Skill 流式推理"""
from __future__ import annotations

import json
import logging
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

logger = logging.getLogger(__name__)

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
        "deviceId": "EQ-SJ-001",
        "deviceName": "总装升降机 #1",
        "productionLine": "总装一线",
        "status": "故障",
        "runningHours": 2840,
        "faultType": "液压系统泄漏",
        "faultCode": "E-HYD-001",
        "severity": "HIGH",
        "description": "升降机液压缸密封圈破损，液压油渗漏，平台无法正常升降，产线已停线",
        "occurredAt": (datetime.now() - timedelta(minutes=23)).isoformat(),
        "acknowledged": False,
    },
    {
        "id": "ALT-002",
        "deviceId": "EQ-SJ-002",
        "deviceName": "总装升降机 #2",
        "productionLine": "总装二线",
        "status": "警告",
        "runningHours": 5120,
        "faultType": "导轨磨损",
        "faultCode": "W-GUI-002",
        "severity": "MEDIUM",
        "description": "升降导轨磨损量超标，运行噪音明显增大，当前间隙 0.8mm，阈值 0.5mm",
        "occurredAt": (datetime.now() - timedelta(hours=1, minutes=5)).isoformat(),
        "acknowledged": False,
    },
    {
        "id": "ALT-003",
        "deviceId": "EQ-SJ-003",
        "deviceName": "总装升降机 #3",
        "productionLine": "总装三线",
        "status": "故障",
        "runningHours": 3670,
        "faultType": "电机过热保护",
        "faultCode": "E-MOT-003",
        "severity": "HIGH",
        "description": "升降驱动电机温度达到 102°C，超温保护触发，电机已自动停机",
        "occurredAt": (datetime.now() - timedelta(minutes=47)).isoformat(),
        "acknowledged": True,
    },
    {
        "id": "ALT-004",
        "deviceId": "EQ-SJ-004",
        "deviceName": "总装升降机 #4",
        "productionLine": "总装一线",
        "status": "警告",
        "runningHours": 7300,
        "faultType": "限位开关异常",
        "faultCode": "W-LMT-004",
        "severity": "MEDIUM",
        "description": "上限位开关接触不良，偶发误触发，平台停位精度下降至 ±5mm",
        "occurredAt": (datetime.now() - timedelta(hours=3)).isoformat(),
        "acknowledged": False,
    },
    {
        "id": "ALT-005",
        "deviceId": "EQ-SJ-005",
        "deviceName": "总装升降机 #5",
        "productionLine": "总装二线",
        "status": "提示",
        "runningHours": 4500,
        "faultType": "定期保养提醒",
        "faultCode": "I-PM-005",
        "severity": "LOW",
        "description": "累计运行超过 4000 小时，建议按保养规程检查液压油、导轨润滑及钢丝绳磨损",
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
        logger.warning("chat_stream: LLM 未配置，使用本地 fallback")
        yield from _fallback_stream(messages, device_context, skill_info)
        return

    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("chat_stream: openai 包未安装，使用本地 fallback")
        yield from _fallback_stream(messages, device_context, skill_info)
        return

    base_url = LLM_BASE_URL.rstrip("/")
    if not base_url.endswith("/v1"):
        base_url += "/v1"

    client = OpenAI(api_key=LLM_API_KEY, base_url=base_url)
    full_messages = [{"role": "system", "content": system_prompt}] + messages

    logger.info(
        "chat_stream: LLM 调用开始 | model=%s | skill=%s | turns=%d | project_id=%s",
        LLM_MODEL, skill_info["code"], len(messages), project_id or "-",
    )

    try:
        stream = client.chat.completions.create(
            model=LLM_MODEL,
            messages=full_messages,
            max_tokens=3000,
            stream=True,
        )
    except Exception as e:
        logger.error("chat_stream: LLM 调用失败 | %s", e)
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

    logger.info("chat_stream: LLM 流式响应完成 | model=%s", LLM_MODEL)
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
            ("根因分析", "可能原因：1. 液压密封圈老化/破损  2. 导轨润滑不足导致磨损  3. 驱动电机散热不良  4. 限位传感器接触不良  5. 长期未按周期保养（参考本体 RootCause.why_chain）"),
            ("影响评估", "当前故障已导致升降机停机，关联产线停线，车身上件作业中断，需参照 EightDReport.d3_contain 执行遏制措施"),
            ("维修方案", "1. LOTO 停机锁定，设置安全隔离区\n2. 检查故障代码，拆检液压缸/导轨/驱动电机等 Component\n3. 更换损坏零部件，记录 comp_code 与 last_replace\n4. 空载试车验证，升降精度达 ±1mm\n5. 填写 8D 报告（report_id），关闭故障工单"),
            ("预防建议", "按 Component.lifespan 制定零部件定期更换计划；每 500 小时检查液压油液位与导轨润滑；设置关键参数越限告警；故障数据录入本体知识库持续积累"),
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
        logger.warning("generate_work_order: LLM 未配置，使用本地 fallback")
        return _fallback_work_order(work_order_id, device_context)

    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("generate_work_order: openai 包未安装，使用本地 fallback")
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

    logger.info(
        "generate_work_order: LLM 调用开始 | model=%s | work_order_id=%s | device=%s",
        LLM_MODEL, work_order_id, device_context.get("deviceName") if device_context else "-",
    )

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
        logger.info("generate_work_order: 工单生成成功 | work_order_id=%s", work_order_id)
        return data
    except Exception as e:
        logger.error("generate_work_order: LLM 响应解析失败 | %s | 降级本地模式", e)
        return _fallback_work_order(work_order_id, device_context)


def _fallback_work_order(work_order_id: str, device_context: dict | None) -> dict:
    dc = device_context or {}
    return {
        "workOrderId": work_order_id,
        "deviceId": dc.get("deviceId", "EQ-SJ-001"),
        "deviceName": dc.get("deviceName", "总装升降机"),
        "productionLine": dc.get("productionLine", "总装产线"),
        "faultType": dc.get("faultType", "未知故障"),
        "faultDescription": dc.get("description", "待补充"),
        "severity": dc.get("severity", "MEDIUM"),
        "rootCause": "待工程师通过 5Why 分析后填写，参考本体 RootCause 实体",
        "containmentAction": "立即停机隔离，防止故障扩散；对同型升降机开展排查",
        "suggestedRepairSteps": [
            "停机挂牌，锁定升降平台并做好防坠落安全措施（LOTO）",
            "查看故障代码，检查液压系统压力、导轨状态及电气控制柜",
            "拆检对应零部件（液压缸/导轨/限位开关/驱动电机），记录零件编码与磨损情况",
            "更换损坏零部件，恢复液压油至标准液位，调整导轨间隙",
            "空载试运行，验证升降精度（±1mm），确认无异响、无渗漏",
            "填写 8D 报告，记录根本原因与纠正预防措施，关闭工单",
        ],
        "estimatedDuration": "2-4 小时",
        "requiredTools": ["液压压力表", "扳手套装", "塞尺（导轨间隙测量）", "液压油", "密封圈备件", "万用表"],
        "safetyNotes": "维修前必须执行 LOTO 安全锁定，确认平台完全下降至安全位置，设置隔离警示区域。",
        "createdAt": datetime.now().isoformat(),
        "note": "本工单由本地模式生成，请配置 LLM_API_KEY 获取 AI 定制工单。",
    }
