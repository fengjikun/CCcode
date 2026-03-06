import json
import os
from typing import Dict, Any

from sqlalchemy.orm import Session

from app.models.fault_record import FaultRecord
from app.services import fault_knowledge_service as knowledge

# LLM API config (OpenAI-compatible Responses API)
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")
MAX_AGENT_ROUNDS = 8


def diagnose(db: Session, request: Dict[str, Any]) -> FaultRecord:
    record = FaultRecord(
        device_id=request.get("device_id"),
        device_name=request.get("device_name"),
        device_type=request.get("device_type"),
        symptoms=request.get("phenomenon_id") or ",".join(request.get("symptoms") or []) or "",
        description=request.get("description"),
        severity=request.get("severity", "MEDIUM"),
        status="DIAGNOSING",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    try:
        result_json = _run_agent(request)
        record.diagnosis_result = result_json
        record.status = "RESOLVED"
    except Exception as e:
        record.diagnosis_result = json.dumps({
            "error": f"诊断失败：{str(e)}",
            "phenomenon": "未知",
            "confidence": "LOW",
            "checkpoints": [],
            "causes": ["Agent调用失败，请检查API配置"],
            "solutions": [],
        }, ensure_ascii=False)
        record.status = "OPEN"

    db.commit()
    db.refresh(record)
    return record


def _run_agent(request: Dict[str, Any]) -> str:
    if not LLM_API_KEY or not LLM_BASE_URL or not LLM_MODEL:
        return _run_local_diagnosis(request)

    try:
        from openai import OpenAI
    except ImportError:
        return _run_local_diagnosis(request)

    base_url = LLM_BASE_URL.rstrip("/")
    if not base_url.endswith("/v1"):
        base_url += "/v1"

    client = OpenAI(api_key=LLM_API_KEY, base_url=base_url)

    messages = [
        {"role": "system", "content": _build_system_prompt()},
        _build_user_message(request),
    ]
    tools = _build_tool_definitions()
    diagnosis_conclusion = None

    for round_ in range(MAX_AGENT_ROUNDS):
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            tools=tools,
            max_tokens=4096,
        )

        msg = response.choices[0].message
        tool_calls = msg.tool_calls or []

        # No tool calls — model returned final text
        if not tool_calls:
            if diagnosis_conclusion is not None:
                return diagnosis_conclusion
            return _extract_json_from_text(msg.content or "{}")

        # Append assistant message (with tool_calls) to history
        messages.append(msg)

        # Execute each tool and append results
        for tc in tool_calls:
            try:
                input_data = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                input_data = {}

            if tc.function.name == "record_diagnosis":
                diagnosis_conclusion = json.dumps(input_data, ensure_ascii=False)

            result = _execute_tool(tc.function.name, input_data)
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })

        # Early exit once diagnosis is recorded and we're near the round limit
        if diagnosis_conclusion is not None and round_ >= MAX_AGENT_ROUNDS - 2:
            return diagnosis_conclusion

    return diagnosis_conclusion if diagnosis_conclusion else _run_local_diagnosis(request)



def _execute_tool(tool_name: str, input_data: Dict[str, Any]) -> str:
    try:
        if tool_name == "search_phenomena":
            query = input_data.get("query", "")
            symptoms = input_data.get("symptoms", [])
            device_type = input_data.get("device_type", "")
            if query:
                return json.dumps(knowledge.search_phenomena(query), ensure_ascii=False)
            return json.dumps(knowledge.search_by_symptoms(symptoms, device_type), ensure_ascii=False)
        elif tool_name == "get_sub_phenomena":
            return json.dumps(knowledge.get_sub_phenomena(input_data["phenomenon_id"]), ensure_ascii=False)
        elif tool_name == "get_checkpoints":
            return json.dumps(knowledge.get_checkpoints(input_data["node_id"]), ensure_ascii=False)
        elif tool_name == "get_causes_and_solutions":
            return json.dumps(knowledge.get_causes_and_solutions(input_data["sub_phenomenon_id"]), ensure_ascii=False)
        elif tool_name == "get_parameter_config":
            return json.dumps(knowledge.get_parameter_config(input_data["checkpoint_id"]), ensure_ascii=False)
        elif tool_name == "record_diagnosis":
            return '{"status":"recorded"}'
        else:
            return json.dumps({"error": f"未知工具: {tool_name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


def _build_user_message(req: Dict[str, Any]) -> Dict[str, Any]:
    symptoms_str = "、".join(req.get("symptoms") or []) or "未描述"
    phen_id = req.get("phenomenon_id") or ""

    user_text = (
        f"请对以下设备故障进行诊断，给出完整的排查方案：\n\n"
        f"- 设备名称：{req.get('device_name') or '未知'}\n"
        f"- 设备类型：{req.get('device_type') or '未知'}\n"
        f"- 故障严重程度：{req.get('severity') or '未知'}\n"
        f"- 故障现象ID：{phen_id if phen_id else '（未指定，请通过症状搜索）'}\n"
        f"- 报告症状：{symptoms_str}\n"
        f"- 补充说明：{req.get('description') or '未知'}\n\n"
        f"请按诊断流程：先搜索匹配现象，再获取子现象和排查点，然后获取原因与解决方案，最后用 record_diagnosis 记录结论。"
    )
    return {"role": "user", "content": user_text}


def _build_system_prompt() -> str:
    return """你是工业设备故障诊断专家，基于大族智控设备故障诊断本体知识图谱进行专业分析。

本体结构：
- Phenomenon（现象级问题）→ contains → SubPhenomenon（子现象）
- Phenomenon/SubPhenomenon → needs_check → Checkpoint（排查点，按priority排序）
- Checkpoint → discovers → SubPhenomenon（发现某子现象）
- SubPhenomenon → caused_by → Cause（原因）
- Cause/SubPhenomenon → solved_by → Solution（解决方案）
- Parameter → supports → Checkpoint（参数采集配置）

诊断流程：
1. 调用 search_phenomena 搜索与用户描述匹配的现象
2. 调用 get_sub_phenomena 获取该现象的子现象
3. 调用 get_checkpoints 获取排查点（priority小的优先执行）
4. 根据排查点逐步分析，调用 get_causes_and_solutions 获取原因和解决方案
5. 可选：调用 get_parameter_config 了解可自动采集的参数
6. 最终调用 record_diagnosis 记录完整诊断结论

重要：必须调用 record_diagnosis 工具记录诊断结论，参数格式：
{
  "phenomenon": "现象名称",
  "phenomenon_id": "现象ID",
  "confidence": "HIGH/MEDIUM/LOW",
  "summary": "故障概述（1-2句话）",
  "matched_sub_phenomena": ["匹配的子现象"],
  "checkpoints": [
    {"step": 1, "checkpoint": "排查点名称", "checkpoint_id": "ID", "method": "操作方法", "expected": "预期结果", "priority": 1}
  ],
  "causes": ["原因1", "原因2"],
  "solutions": [
    {"title": "解决方案名称", "steps": "步骤（分号分隔）", "estimated_time": "预计时间", "risk_level": "风险等级"}
  ],
  "estimated_time": "总预计处理时间",
  "urgency": "HIGH/MEDIUM/LOW"
}"""


def _build_tool_definitions() -> list:
    return [
        {
            "type": "function",
            "function": {
                "name": "search_phenomena",
                "description": "搜索与用户描述的故障症状匹配的现象级问题（Phenomenon）",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "故障描述关键词，如'W轴限位报警'"},
                        "symptoms": {"type": "array", "items": {"type": "string"}, "description": "症状关键词列表"},
                        "device_type": {"type": "string", "description": "设备类型，如'激光切割机'"},
                    },
                    "required": [],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_sub_phenomena",
                "description": "获取某现象级问题（Phenomenon）的所有子现象（SubPhenomenon）",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phenomenon_id": {"type": "string", "description": "现象级问题的ID，如 phen_w_limit"},
                    },
                    "required": ["phenomenon_id"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_checkpoints",
                "description": "获取某现象或子现象的所有排查点（Checkpoint），按优先级排序",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "node_id": {"type": "string", "description": "现象或子现象的ID"},
                    },
                    "required": ["node_id"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_causes_and_solutions",
                "description": "获取某子现象（SubPhenomenon）的可能原因（Cause）和解决方案（Solution）",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sub_phenomenon_id": {"type": "string", "description": "子现象的ID，如 sp_io_no_purple"},
                    },
                    "required": ["sub_phenomenon_id"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_parameter_config",
                "description": "获取某排查点（Checkpoint）关联的设备参数采集配置（Parameter）",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "checkpoint_id": {"type": "string", "description": "排查点的ID"},
                    },
                    "required": ["checkpoint_id"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "record_diagnosis",
                "description": "记录最终诊断结论，包含排查步骤和解决方案",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phenomenon": {"type": "string", "description": "现象名称"},
                        "phenomenon_id": {"type": "string", "description": "现象ID"},
                        "confidence": {"type": "string", "description": "置信度：HIGH/MEDIUM/LOW"},
                        "summary": {"type": "string", "description": "故障概述"},
                        "matched_sub_phenomena": {"type": "array", "items": {"type": "string"}, "description": "匹配的子现象列表"},
                        "checkpoints": {"type": "array", "items": {"type": "object"}, "description": "排查步骤列表"},
                        "causes": {"type": "array", "items": {"type": "string"}, "description": "根本原因列表"},
                        "solutions": {"type": "array", "items": {"type": "object"}, "description": "解决方案列表"},
                        "estimated_time": {"type": "string", "description": "预计处理时间"},
                        "urgency": {"type": "string", "description": "紧急程度：HIGH/MEDIUM/LOW"},
                    },
                    "required": ["phenomenon", "confidence", "checkpoints", "solutions"],
                },
            },
        },
    ]


# ===== Local fallback diagnosis =====

def _run_local_diagnosis(request: Dict[str, Any]) -> str:
    phen_id = request.get("phenomenon_id")
    if phen_id:
        detail = knowledge.get_phenomenon_detail(phen_id)
        if "error" not in detail:
            return _build_local_result(phen_id, detail, request)

    candidates = knowledge.search_by_symptoms(
        request.get("symptoms"), request.get("device_type"))
    if not candidates:
        candidates = knowledge.all_phenomena()
    if not candidates:
        return json.dumps({"error": "知识图谱中没有找到匹配的故障现象"}, ensure_ascii=False)

    top_phen = candidates[0]
    top_phen_id = top_phen.get("id")
    detail = knowledge.get_phenomenon_detail(top_phen_id)
    return _build_local_result(top_phen_id, detail, request)


def _build_local_result(phen_id: str, detail: Dict[str, Any], request: Dict[str, Any]) -> str:
    phen = detail.get("phenomenon")
    checkpoints = detail.get("checkpoints", [])
    sub_phens = detail.get("subPhenomena", [])

    cp_steps = []
    for step_num, cp in enumerate(checkpoints, 1):
        props = cp.get("properties", {})
        cp_steps.append({
            "step": step_num,
            "checkpoint": cp.get("label"),
            "checkpoint_id": cp.get("id"),
            "method": (props or {}).get("method", "请参考设备手册"),
            "expected": (props or {}).get("expectedValue", "正常状态"),
            "priority": cp.get("priority", 99),
        })

    all_causes = []
    all_solutions = []
    for sp in sub_phens:
        sp_id = sp.get("id")
        cs = knowledge.get_causes_and_solutions(sp_id)
        for c in cs.get("causes", []):
            label = str(c.get("label", ""))
            if label and label not in all_causes:
                all_causes.append(label)
        for sol in cs.get("solutions", []):
            sol_id = sol.get("id")
            if not any(s.get("id") == sol_id for s in all_solutions):
                props = sol.get("properties", {})
                all_solutions.append({
                    "id": sol_id,
                    "title": sol.get("label"),
                    "steps": (props or {}).get("steps", ""),
                    "estimated_time": (props or {}).get("estimatedTime", "未知"),
                    "risk_level": (props or {}).get("riskLevel", "LOW"),
                })

    estimated_time = all_solutions[0].get("estimated_time", "未知") if all_solutions else "未知"

    result = {
        "phenomenon": phen.get("label") if phen else phen_id,
        "phenomenon_id": phen_id,
        "confidence": "HIGH",
        "summary": f"基于知识图谱分析：{phen.get('label') if phen else phen_id}",
        "matched_sub_phenomena": [s.get("label") for s in sub_phens],
        "checkpoints": cp_steps,
        "causes": all_causes,
        "solutions": all_solutions,
        "estimated_time": estimated_time,
        "urgency": request.get("severity") or "MEDIUM",
        "note": "当前为本地知识图谱诊断模式，如需AI深度分析请配置 LLM_API_KEY",
    }
    return json.dumps(result, ensure_ascii=False)


def _extract_json_from_text(text: str) -> str:
    if not text:
        return "{}"
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start:end + 1]
    return text
