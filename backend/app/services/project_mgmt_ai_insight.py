import json
import logging
import os
from typing import Any, Callable

from pydantic import BaseModel, Field, ValidationError, field_validator

from app.models.project_mgmt import Project, ProjectDocument

logger = logging.getLogger(__name__)

MAX_AI_INSIGHT_ENTITIES = 80
MAX_AI_INSIGHT_RELATIONS = 120
AI_INSIGHT_LLM_MAX_TOKENS_DEFAULT = 32768
AI_INSIGHT_CONCURRENCY_DEFAULT = 1


def _resolve_ai_insight_concurrency() -> int:
    raw = _normalize_text(os.getenv("AI_INSIGHT_CONCURRENCY"))
    if not raw:
        return AI_INSIGHT_CONCURRENCY_DEFAULT
    try:
        val = int(raw)
    except ValueError:
        return AI_INSIGHT_CONCURRENCY_DEFAULT
    return max(1, min(val, 10))


class _AiInsightEvidence(BaseModel):
    sheet: str = ""
    row: int | None = None
    snippet: str = ""

    @field_validator("sheet", "snippet", mode="before")
    @classmethod
    def _coerce_str(cls, v: Any) -> str:
        return "" if v is None else str(v)


class _AiInsightProperty(BaseModel):
    name: str = ""
    display_name: str = ""
    data_type: str = "STRING"
    required: bool = False
    default_value: str = ""
    description: str = ""

    @field_validator("name", "display_name", "data_type", "default_value", "description", mode="before")
    @classmethod
    def _coerce_str(cls, v: Any) -> str:
        return "" if v is None else str(v)

    @field_validator("required", mode="before")
    @classmethod
    def _coerce_bool(cls, v: Any) -> bool:
        if v is None:
            return False
        return bool(v)


class _AiInsightEntity(BaseModel):
    name: str = ""
    display_name: str = ""
    description: str = ""
    properties: list[_AiInsightProperty] = Field(default_factory=list)
    evidence: list[_AiInsightEvidence] = Field(default_factory=list)
    confidence: float = 0.0

    @field_validator("name", "display_name", "description", mode="before")
    @classmethod
    def _coerce_str(cls, v: Any) -> str:
        return "" if v is None else str(v)

    @field_validator("properties", "evidence", mode="before")
    @classmethod
    def _coerce_list(cls, v: Any) -> list:
        return v if isinstance(v, list) else []

    @field_validator("confidence", mode="before")
    @classmethod
    def _coerce_float(cls, v: Any) -> float:
        try:
            return float(v or 0)
        except (TypeError, ValueError):
            return 0.0


class _AiInsightRelation(BaseModel):
    name: str = ""
    display_name: str = ""
    description: str = ""
    domain_entity_name: str = ""
    range_entity_name: str = ""
    properties: list[_AiInsightProperty] = Field(default_factory=list)
    evidence: list[_AiInsightEvidence] = Field(default_factory=list)
    confidence: float = 0.0

    @field_validator("name", "display_name", "description", "domain_entity_name", "range_entity_name", mode="before")
    @classmethod
    def _coerce_str(cls, v: Any) -> str:
        return "" if v is None else str(v)

    @field_validator("properties", "evidence", mode="before")
    @classmethod
    def _coerce_list(cls, v: Any) -> list:
        return v if isinstance(v, list) else []

    @field_validator("confidence", mode="before")
    @classmethod
    def _coerce_float(cls, v: Any) -> float:
        try:
            return float(v or 0)
        except (TypeError, ValueError):
            return 0.0


class _AiInsightExtraction(BaseModel):
    entities: list[_AiInsightEntity] = Field(default_factory=list)
    relations: list[_AiInsightRelation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    @field_validator("entities", "relations", mode="before")
    @classmethod
    def _coerce_list(cls, v: Any) -> list:
        return v if isinstance(v, list) else []

    @field_validator("warnings", mode="before")
    @classmethod
    def _coerce_warnings(cls, v: Any) -> list:
        if not isinstance(v, list):
            return []
        return [str(x) for x in v if x is not None]


def _normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_schema_name(value: str | None, *, fallback: str, max_len: int = 64) -> str:
    text = _normalize_text(value) or fallback
    text = " ".join(text.split())
    if not text:
        text = fallback
    if len(text) > max_len:
        text = text[:max_len]
    return text


def _extract_json_from_text(text: str) -> str:
    if not text:
        return "{}"
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start : end + 1]
    return text


def _resolve_ai_insight_llm_config() -> dict[str, str]:
    api_key = _normalize_text(os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY"))
    base_url = _normalize_text(os.getenv("LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL"))
    model = _normalize_text(os.getenv("LLM_MODEL") or os.getenv("OPENAI_MODEL"))
    if not api_key or not base_url or not model:
        raise ValueError("AI 洞察依赖模型配置，请配置 LLM_API_KEY/LLM_BASE_URL/LLM_MODEL（或 OPENAI_*）")
    return {"api_key": api_key, "base_url": base_url.rstrip("/"), "model": model}


def _resolve_ai_insight_llm_max_tokens() -> int:
    raw_value = _normalize_text(os.getenv("AI_INSIGHT_LLM_MAX_TOKENS"))
    if not raw_value:
        return AI_INSIGHT_LLM_MAX_TOKENS_DEFAULT
    try:
        parsed = int(raw_value)
    except ValueError:
        return AI_INSIGHT_LLM_MAX_TOKENS_DEFAULT
    return max(1024, min(parsed, 65536))


def _build_ai_insight_prompt_payload(xlsx_inputs: dict[str, Any]) -> dict[str, Any]:
    entity_templates = []
    for item in (xlsx_inputs.get("entity_templates") or [])[:MAX_AI_INSIGHT_ENTITIES]:
        if not isinstance(item, dict):
            continue
        properties = []
        for prop in (item.get("properties") or [])[:15]:
            if not isinstance(prop, dict):
                continue
            properties.append(
                {
                    "name": _normalize_text(prop.get("name")),
                    "display_name": _normalize_text(prop.get("display_name")),
                    "data_type": _normalize_text(prop.get("data_type")) or "STRING",
                    "required": bool(prop.get("required")),
                    "default_value": _normalize_text(prop.get("default_value")),
                    "description": _normalize_text(prop.get("description")),
                }
            )
        entity_templates.append(
            {
                "name": _normalize_text(item.get("name")),
                "description": _normalize_text(item.get("description")),
                "properties": properties,
            }
        )

    relation_templates = []
    for item in (xlsx_inputs.get("relation_templates") or [])[:MAX_AI_INSIGHT_RELATIONS]:
        if not isinstance(item, dict):
            continue
        properties = []
        for prop in (item.get("properties") or [])[:12]:
            if not isinstance(prop, dict):
                continue
            properties.append(
                {
                    "name": _normalize_text(prop.get("name")),
                    "display_name": _normalize_text(prop.get("display_name")),
                    "data_type": _normalize_text(prop.get("data_type")) or "STRING",
                    "required": bool(prop.get("required")),
                    "default_value": _normalize_text(prop.get("default_value")),
                    "description": _normalize_text(prop.get("description")),
                }
            )
        relation_templates.append(
            {
                "name": _normalize_text(item.get("name")),
                "description": _normalize_text(item.get("description")),
                "domain": _normalize_text(item.get("domain")),
                "range": _normalize_text(item.get("range")),
                "properties": properties,
            }
        )

    return {
        "entity_templates": entity_templates,
        "relation_templates": relation_templates,
        "instance_stats": {
            "entity_instance_count": len(xlsx_inputs.get("entity_instances") or []),
            "relation_instance_count": len(xlsx_inputs.get("relation_instances") or []),
        },
    }


def _build_ai_insight_prompts(
    *,
    project: Project,
    enabled_docs: list[ProjectDocument],
    xlsx_inputs: dict[str, Any],
    existing_entity_names: set[str],
) -> tuple[str, str]:
    developer_prompt = (
        "你是工业设备领域的知识图谱 Schema 抽取助手。"
        "请基于输入的 xlsx 解析结果，提取实体类型与关系类型。"
        "只允许输出 schema-level 类型定义，禁止输出任何实例级数据。"
        "禁止输出具体实例名称、具体工单编号、具体设备编号、具体行记录。"
        "必须严格返回一个 JSON 对象，不允许输出 markdown、代码块或解释文字。"
        "输出字段必须包含 entities、relations、warnings，所有字段值不得为 null，字符串字段为空时用空字符串。"
        "entities[*] 必须包含 name、display_name、description、properties、evidence、confidence。"
        "relations[*] 必须包含 name、display_name、description、domain_entity_name、range_entity_name、properties、evidence、confidence。"
        "properties[*].data_type 仅允许 STRING/INTEGER/FLOAT/BOOLEAN/DATE/DATETIME/JSON/TEXT。"
        "confidence 取值范围 [0, 1]，必须是数字。"
        "输出规模限制：entities 最多 16 个，relations 最多 24 个，每个实体/关系最多 6 个 properties，evidence 恰好 1 条。"
        "description 与 evidence.snippet 不超过 50 字，避免长段落。"
        "若信息不足或不确定，请不要猜测，把原因写进 warnings。"
    )

    doc_names = [doc.name for doc in enabled_docs]
    prompt_payload = _build_ai_insight_prompt_payload(xlsx_inputs)

    user_prompt = json.dumps(
        {
            "project": {
                "id": project.id,
                "name": project.name,
                "description": project.description or "",
            },
            "documents": doc_names,
            "existing_entity_names": sorted(existing_entity_names),
            "xlsx_summary": prompt_payload,
            "output_schema_hint": {
                "entities": [
                    {
                        "name": "EntityName",
                        "display_name": "实体显示名",
                        "description": "实体描述",
                        "properties": [
                            {
                                "name": "property_name",
                                "display_name": "属性显示名",
                                "data_type": "STRING",
                                "required": False,
                                "default_value": "",
                                "description": "属性描述",
                            }
                        ],
                        "evidence": [{"sheet": "Sheet1", "row": 2, "snippet": "证据片段"}],
                        "confidence": 0.9,
                    }
                ],
                "relations": [
                    {
                        "name": "relation_name",
                        "display_name": "关系显示名",
                        "description": "关系描述",
                        "domain_entity_name": "EntityA",
                        "range_entity_name": "EntityB",
                        "properties": [],
                        "evidence": [{"sheet": "Sheet2", "row": 5, "snippet": "证据片段"}],
                        "confidence": 0.88,
                    }
                ],
                "warnings": [],
            },
        },
        ensure_ascii=False,
    )
    return developer_prompt, user_prompt


def _run_ai_schema_insight_llm(
    *,
    project: Project,
    enabled_docs: list[ProjectDocument],
    xlsx_inputs: dict[str, Any],
    existing_entity_names: set[str],
) -> dict[str, Any]:
    llm_cfg = _resolve_ai_insight_llm_config()
    developer_prompt, user_prompt = _build_ai_insight_prompts(
        project=project,
        enabled_docs=enabled_docs,
        xlsx_inputs=xlsx_inputs,
        existing_entity_names=existing_entity_names,
    )

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise ValueError("缺少 openai 依赖，无法调用模型") from exc

    client = OpenAI(api_key=llm_cfg["api_key"], base_url=llm_cfg["base_url"])

    logger.info(
        "ai_insight: LLM 调用开始 | model=%s | project=%s | docs=%d",
        llm_cfg["model"], project.name, len(enabled_docs),
    )

    try:
        response = client.chat.completions.create(
            model=llm_cfg["model"],
            messages=[
                {"role": "system", "content": developer_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=_resolve_ai_insight_llm_max_tokens(),
        )
    except Exception as exc:
        logger.error("ai_insight: LLM 调用失败 | model=%s | %s", llm_cfg["model"], exc)
        raise ValueError(f"AI 洞察模型调用失败：{exc}") from exc

    text = _normalize_text(response.choices[0].message.content)
    if not text:
        raise ValueError("AI 洞察模型未返回可解析文本内容")

    json_text = _extract_json_from_text(text)
    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError as exc:
        if not text.rstrip().endswith("}"):
            raise ValueError("AI 洞察输出疑似被截断，JSON 未闭合；请减少输出规模或继续提高 max_tokens") from exc
        raise ValueError("AI 洞察输出不是合法 JSON，请检查 prompt 与模型响应") from exc
    if not isinstance(parsed, dict):
        raise ValueError("AI 洞察输出格式不正确，根节点必须是 JSON 对象")
    logger.info(
        "ai_insight: LLM 响应解析成功 | entities=%d | relations=%d",
        len(parsed.get("entities") or []),
        len(parsed.get("relations") or []),
    )
    return parsed


def _parse_ai_schema_insight_output(
    *,
    raw_output: dict[str, Any],
    existing_entity_names: set[str],
    normalize_generated_properties: Callable[[list[dict[str, Any]]], list[dict[str, Any]]],
) -> dict[str, Any]:
    try:
        extraction = _AiInsightExtraction.model_validate(raw_output)
    except ValidationError as exc:
        # 降级：不整体失败，记录 warning 并返回空结果
        error_msgs = "; ".join(
            e.get("msg", "未知错误") for e in (exc.errors() or [{"msg": "未知字段错误"}])
        )
        return {
            "entity_templates": [],
            "relation_templates": [],
            "warnings": [f"AI 输出字段校验失败，已跳过本文档：{error_msgs}"],
        }

    warnings = [_normalize_text(item) for item in extraction.warnings if _normalize_text(item)]

    entity_templates: list[dict[str, Any]] = []
    seen_entity_names: set[str] = set()
    for entity in extraction.entities[:MAX_AI_INSIGHT_ENTITIES]:
        entity_name = _safe_schema_name(entity.name, fallback="")
        if not entity_name:
            warnings.append("存在缺失 name 的实体输出，已忽略")
            continue
        if entity_name in seen_entity_names:
            warnings.append(f"实体 {entity_name} 在模型输出中重复，已去重")
            continue
        if not entity.evidence:
            warnings.append(f"实体 {entity_name} 缺少 evidence，已忽略")
            continue
        confidence = float(entity.confidence or 0)
        if confidence < 0 or confidence > 1:
            warnings.append(f"实体 {entity_name} 置信度越界，已忽略")
            continue

        normalized_props = normalize_generated_properties(
            [prop.model_dump(mode="python") for prop in entity.properties]
        )
        entity_templates.append(
            {
                "name": entity_name,
                "description": _normalize_text(entity.description) or _normalize_text(entity.display_name),
                "properties": normalized_props,
            }
        )
        seen_entity_names.add(entity_name)

    available_entity_names = set(existing_entity_names) | {item["name"] for item in entity_templates}
    relation_templates: list[dict[str, Any]] = []
    seen_relation_keys: set[tuple[str, str, str]] = set()
    for relation in extraction.relations[:MAX_AI_INSIGHT_RELATIONS]:
        relation_name = _safe_schema_name(relation.name, fallback="")
        domain_name = _safe_schema_name(relation.domain_entity_name, fallback="")
        range_name = _safe_schema_name(relation.range_entity_name, fallback="")
        if not relation_name or not domain_name or not range_name:
            warnings.append("存在 name/domain/range 不完整的关系输出，已忽略")
            continue
        if not relation.evidence:
            warnings.append(f"关系 {relation_name} 缺少 evidence，已忽略")
            continue
        confidence = float(relation.confidence or 0)
        if confidence < 0 or confidence > 1:
            warnings.append(f"关系 {relation_name} 置信度越界，已忽略")
            continue
        if domain_name not in available_entity_names or range_name not in available_entity_names:
            warnings.append(
                f"关系 {relation_name}（{domain_name} -> {range_name}）引用了不存在的实体，已忽略"
            )
            continue

        relation_key = (relation_name, domain_name, range_name)
        if relation_key in seen_relation_keys:
            warnings.append(f"关系 {relation_name}({domain_name}->{range_name}) 在模型输出中重复，已去重")
            continue

        normalized_props = normalize_generated_properties(
            [prop.model_dump(mode="python") for prop in relation.properties]
        )
        relation_templates.append(
            {
                "name": relation_name,
                "description": _normalize_text(relation.description) or _normalize_text(relation.display_name),
                "domain": domain_name,
                "range": range_name,
                "properties": normalized_props,
            }
        )
        seen_relation_keys.add(relation_key)

    return {
        "entity_templates": entity_templates,
        "relation_templates": relation_templates,
        "warnings": warnings,
    }
