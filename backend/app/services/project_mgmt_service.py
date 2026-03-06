import base64
import json
import posixpath
import re
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import uuid4
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.models.project_mgmt import (
    EntityType,
    ExtractionRun,
    OntologyVersion,
    ProjectAction,
    RelationType,
    Project,
    ProjectDataSource,
    ProjectDocument,
    ProjectFunction,
    ReviewItem,
    SchemaConfig,
    SchemaProperty,
    Skill,
    VersionItem,
)


ASSET_ROOT = Path(__file__).resolve().parent.parent.parent / "data" / "project_assets"
ALLOWED_DOC_EXTENSIONS = {".docx", ".md", ".xlsx"}
MASKED_PASSWORD = "******"
ALLOWED_PROPERTY_DATA_TYPES = {
    "STRING",
    "INTEGER",
    "FLOAT",
    "BOOLEAN",
    "DATE",
    "DATETIME",
    "JSON",
    "TEXT",
}
OWNER_KIND_ENTITY = "ENTITY"
OWNER_KIND_RELATION = "RELATION"
MAX_XLSX_ROWS_PER_SHEET = 200
MAX_XLSX_REVIEW_ITEMS = 360

ENTITY_HEADER_ALIASES = {
    "entitytypename",
    "entitytype",
    "entityname",
    "entity",
    "实体类型名称",
    "实体类型",
    "实体名称",
}
ENTITY_DESC_HEADER_ALIASES = {"description", "实体描述", "描述"}
PROPERTY_NAME_HEADER_ALIASES = {
    "propertyname",
    "attributename",
    "fieldname",
    "columnname",
    "属性名称",
    "字段名称",
    "属性",
}
PROPERTY_NULLABLE_HEADER_ALIASES = {
    "nullable",
    "isnullable",
    "required",
    "isrequired",
    "是否可为空",
    "可为空",
    "是否必填",
}
PROPERTY_DEFAULT_HEADER_ALIASES = {"default", "defaultvalue", "默认值"}
PROPERTY_DESC_HEADER_ALIASES = {"propertydescription", "attributedescription", "属性描述", "字段描述", "备注"}
RELATION_HEADER_ALIASES = {
    "relationtypename",
    "relationshipname",
    "relationname",
    "关系类型名称",
    "关系类型",
    "关系名称",
}
RELATION_DESC_HEADER_ALIASES = {"relationdescription", "关系描述", "description", "描述"}
RELATION_SOURCE_HEADER_ALIASES = {"source", "from", "domain", "sourceentity", "起点实体", "源实体"}
RELATION_TARGET_HEADER_ALIASES = {"target", "to", "range", "targetentity", "终点实体", "目标实体"}

BUILT_IN_SKILL_DEFAULTS = [
    {
        "id": "skill_data_processing",
        "code": "data_processing",
        "name": "数据处理",
        "description": "负责清洗、切分、归一化文档内容",
        "enabled": True,
        "prompt": "",
        "source": "built_in",
        "tags": ["openclaw-bundled"],
        "blocked": True,
        "missing": "bin:op",
    },
    {
        "id": "skill_graph_synthesis",
        "code": "graph_synthesis",
        "name": "图谱合成",
        "description": "负责实体关系抽取与对齐入图",
        "enabled": True,
        "prompt": "",
        "source": "built_in",
        "tags": ["openclaw-bundled"],
        "blocked": False,
        "missing": "",
    },
]

AI_ENTITY_TEMPLATES = [
    {
        "name": "AlarmCode",
        "description": "设备报警编码实体",
        "keywords": ["报警", "告警", "alarm"],
        "properties": [
            {
                "name": "code",
                "display_name": "报警码",
                "data_type": "STRING",
                "required": True,
            },
            {
                "name": "level",
                "display_name": "等级",
                "data_type": "STRING",
                "required": False,
            },
        ],
    },
    {
        "name": "MaintenanceAction",
        "description": "检修或维护动作实体",
        "keywords": ["检修", "维护", "repair", "maintenance"],
        "properties": [
            {
                "name": "action_desc",
                "display_name": "动作描述",
                "data_type": "TEXT",
                "required": True,
            },
            {
                "name": "duration_min",
                "display_name": "预计时长(分钟)",
                "data_type": "INTEGER",
                "required": False,
            },
        ],
    },
    {
        "name": "Part",
        "description": "设备零部件实体",
        "keywords": ["部件", "零件", "part", "模块"],
        "properties": [
            {
                "name": "part_name",
                "display_name": "部件名称",
                "data_type": "STRING",
                "required": True,
            },
            {
                "name": "part_no",
                "display_name": "部件编号",
                "data_type": "STRING",
                "required": False,
            },
        ],
    },
    {
        "name": "Sensor",
        "description": "传感器实体",
        "keywords": ["传感", "sensor"],
        "properties": [
            {
                "name": "sensor_type",
                "display_name": "传感器类型",
                "data_type": "STRING",
                "required": False,
            },
            {
                "name": "signal",
                "display_name": "信号值",
                "data_type": "FLOAT",
                "required": False,
            },
        ],
    },
    {
        "name": "ProcedureStep",
        "description": "排查流程步骤实体",
        "keywords": ["步骤", "流程", "step", "procedure"],
        "properties": [
            {
                "name": "step_no",
                "display_name": "步骤编号",
                "data_type": "INTEGER",
                "required": True,
            },
            {
                "name": "step_detail",
                "display_name": "步骤说明",
                "data_type": "TEXT",
                "required": True,
            },
        ],
    },
]

AI_RELATION_TEMPLATES = [
    {
        "name": "triggered_by",
        "domain": "FaultPhenomenon",
        "range": "AlarmCode",
        "description": "故障现象由报警码触发",
    },
    {
        "name": "handled_by",
        "domain": "FaultPhenomenon",
        "range": "MaintenanceAction",
        "description": "故障现象对应维护动作",
    },
    {
        "name": "targets_part",
        "domain": "MaintenanceAction",
        "range": "Part",
        "description": "维护动作作用于零部件",
    },
    {
        "name": "monitored_by",
        "domain": "FaultPhenomenon",
        "range": "Sensor",
        "description": "故障现象可由传感器监测",
    },
    {
        "name": "requires_step",
        "domain": "MaintenanceAction",
        "range": "ProcedureStep",
        "description": "维护动作需要执行步骤",
    },
    {
        "name": "checks_part",
        "domain": "Checkpoint",
        "range": "Part",
        "description": "排查点对应检查部件",
    },
]


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def _normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _encrypt_secret(value: str) -> str:
    # NOTE: this is reversible obfuscation for MVP only; replace with KMS/Fernet in production.
    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("ascii")


def _ensure_project_owned(db: Session, user_id: int, project_id: str) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_user_id == user_id)
        .first()
    )
    if not project:
        raise ValueError("项目不存在或已删除")
    return project


def _touch_project(project: Project) -> None:
    project.updated_at = _now()


def _to_document_response(doc: ProjectDocument) -> dict[str, Any]:
    return {
        "id": doc.id,
        "name": doc.name,
        "file_type": doc.file_type,
        "size": doc.size_bytes,
        "status": doc.status,
        "enabled": doc.enabled,
        "uploaded_at": doc.uploaded_at,
    }


def _to_data_source_response(item: ProjectDataSource) -> dict[str, Any]:
    tables = []
    if item.tables_json:
        try:
            parsed = json.loads(item.tables_json)
            if isinstance(parsed, list):
                tables = [str(x) for x in parsed if str(x).strip()]
        except json.JSONDecodeError:
            tables = []

    return {
        "id": item.id,
        "name": item.name,
        "type": item.type,
        "host": item.host,
        "port": item.port,
        "database": item.database_name,
        "schema": item.schema_name or "",
        "username": item.username,
        "password_masked": MASKED_PASSWORD if item.password_encrypted else None,
        "ssl_enabled": bool(item.ssl_enabled),
        "enabled": bool(item.enabled),
        "extract_mode": item.extract_mode,
        "tables": tables,
        "custom_sql": item.custom_sql or "",
        "row_limit": item.row_limit,
        "sync_mode": item.sync_mode,
        "incremental_column": item.incremental_column or "",
        "status": item.status,
        "last_test_at": item.last_test_at,
        "last_error": item.last_error or "",
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _parse_json_list(raw: str | None, *, fallback: list[str] | None = None) -> list[str]:
    if raw is None:
        return list(fallback or [])
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return list(fallback or [])
    if not isinstance(parsed, list):
        return list(fallback or [])
    result: list[str] = []
    for item in parsed:
        text = _normalize_text(str(item))
        if text:
            result.append(text)
    return result


def _to_schema_property_response(prop: SchemaProperty) -> dict[str, Any]:
    return {
        "id": prop.id,
        "name": prop.name,
        "display_name": prop.display_name,
        "data_type": prop.data_type,
        "required": bool(prop.required),
        "default_value": prop.default_value or "",
        "description": prop.description or "",
        "sort_order": prop.sort_order,
    }


def _to_skill_response(
    row: Skill | None,
    *,
    fallback: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if row is None:
        default = fallback or {}
        return {
            "id": default.get("id") or _new_id("skill"),
            "code": default.get("code") or "custom",
            "name": default.get("name") or "自定义 Skill",
            "description": default.get("description") or "",
            "enabled": bool(default.get("enabled", True)),
            "prompt": default.get("prompt") or "",
            "source": default.get("source") or "uploaded",
            "tags": list(default.get("tags") or []),
            "blocked": bool(default.get("blocked", False)),
            "missing": default.get("missing") or "",
            "file_name": default.get("file_name") or "",
            "created_at": default.get("created_at"),
        }

    return {
        "id": row.id,
        "code": row.code,
        "name": row.name,
        "description": row.description or "",
        "enabled": bool(row.enabled),
        "prompt": row.prompt or "",
        "source": row.source,
        "tags": _parse_json_list(row.tags_json, fallback=[]),
        "blocked": bool(row.blocked),
        "missing": row.missing or "",
        "file_name": row.file_name or "",
        "created_at": row.created_at,
    }


def _to_review_item_response(item: ReviewItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "kind": item.kind,
        "title": item.title,
        "evidence": item.evidence,
        "confidence": item.confidence,
        "status": item.status,
        "entity_type_name": item.entity_type_name or None,
        "entity_name": item.entity_name or None,
        "relation_type_name": item.relation_type_name or None,
        "relation_domain_name": item.relation_domain_name or None,
        "relation_range_name": item.relation_range_name or None,
    }


def _to_version_response(item: OntologyVersion) -> dict[str, Any]:
    return {
        "id": item.id,
        "version": item.version,
        "label": item.label,
        "notes": item.notes or "",
        "created_at": item.created_at,
        "source_run_id": item.source_run_id,
        "entity_count": item.entity_count,
        "relation_count": item.relation_count,
    }


def _to_action_response(item: ProjectAction) -> dict[str, Any]:
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description or "",
        "status": item.status,
    }


def _to_function_response(item: ProjectFunction) -> dict[str, Any]:
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description or "",
        "script_content": item.script_content,
        "status": item.status,
    }


def _recalc_run_stats(db: Session, run: ExtractionRun) -> None:
    run.candidate_entity_count = (
        db.query(func.count(ReviewItem.id))
        .filter(
            ReviewItem.project_id == run.project_id,
            ReviewItem.run_id == run.id,
            ReviewItem.kind == "ENTITY",
        )
        .scalar()
        or 0
    )
    run.candidate_relation_count = (
        db.query(func.count(ReviewItem.id))
        .filter(
            ReviewItem.project_id == run.project_id,
            ReviewItem.run_id == run.id,
            ReviewItem.kind == "RELATION",
        )
        .scalar()
        or 0
    )
    run.pending_review_count = (
        db.query(func.count(ReviewItem.id))
        .filter(
            ReviewItem.project_id == run.project_id,
            ReviewItem.run_id == run.id,
            ReviewItem.status == "PENDING",
        )
        .scalar()
        or 0
    )


def _to_run_response(db: Session, run: ExtractionRun) -> dict[str, Any]:
    review_items = (
        db.query(ReviewItem)
        .filter(ReviewItem.project_id == run.project_id, ReviewItem.run_id == run.id)
        .order_by(ReviewItem.created_at)
        .all()
    )
    return {
        "id": run.id,
        "status": run.status,
        "progress": run.progress,
        "created_at": run.created_at,
        "completed_at": run.completed_at,
        "candidate_entity_count": run.candidate_entity_count,
        "candidate_relation_count": run.candidate_relation_count,
        "pending_review_count": run.pending_review_count,
        "review_items": [_to_review_item_response(item) for item in review_items],
    }


def _normalize_schema_properties_payload(raw_properties: Any) -> list[dict[str, Any]]:
    if raw_properties is None:
        return []
    if not isinstance(raw_properties, list):
        raise ValueError("属性配置格式不正确")

    normalized: list[dict[str, Any]] = []
    used_names: set[str] = set()
    for index, raw in enumerate(raw_properties):
        if not isinstance(raw, dict):
            continue
        name = _normalize_text(raw.get("name"))
        if not name:
            continue
        if name in used_names:
            raise ValueError("属性名称已存在")
        used_names.add(name)

        display_name = _normalize_text(raw.get("display_name")) or name
        data_type = str(raw.get("data_type") or "STRING").upper()
        if data_type not in ALLOWED_PROPERTY_DATA_TYPES:
            data_type = "STRING"

        sort_order_raw = raw.get("sort_order")
        sort_order = index
        if isinstance(sort_order_raw, int):
            sort_order = sort_order_raw
        else:
            try:
                sort_order = int(sort_order_raw)
            except (TypeError, ValueError):
                sort_order = index

        prop_id = _normalize_text(raw.get("id")) or _new_id("prop")
        normalized.append(
            {
                "id": prop_id,
                "name": name,
                "display_name": display_name,
                "data_type": data_type,
                "required": bool(raw.get("required")),
                "default_value": _normalize_text(raw.get("default_value")),
                "description": _normalize_text(raw.get("description")),
                "sort_order": sort_order,
            }
        )

    normalized.sort(key=lambda item: item["sort_order"])
    return normalized


def _replace_owner_properties(
    db: Session,
    *,
    project_id: str,
    owner_kind: str,
    owner_id: str,
    properties: list[dict[str, Any]],
    now: datetime,
) -> list[SchemaProperty]:
    db.query(SchemaProperty).filter(
        SchemaProperty.project_id == project_id,
        SchemaProperty.owner_kind == owner_kind,
        SchemaProperty.owner_id == owner_id,
    ).delete()

    rows: list[SchemaProperty] = []
    for item in properties:
        row = SchemaProperty(
            id=item["id"],
            project_id=project_id,
            owner_kind=owner_kind,
            owner_id=owner_id,
            name=item["name"],
            display_name=item["display_name"],
            data_type=item["data_type"],
            required=item["required"],
            default_value=item["default_value"],
            description=item["description"],
            sort_order=item["sort_order"],
            created_at=now,
            updated_at=now,
        )
        rows.append(row)
        db.add(row)
    return rows


def _ensure_schema_config_row(db: Session, project_id: str, now: datetime) -> SchemaConfig:
    schema_cfg = db.query(SchemaConfig).filter(SchemaConfig.project_id == project_id).first()
    if schema_cfg:
        return schema_cfg
    schema_cfg = SchemaConfig(
        project_id=project_id,
        entity_scope="",
        relation_scope="",
        updated_at=now,
    )
    db.add(schema_cfg)
    return schema_cfg


def _build_skills_response(skill_rows: list[Skill]) -> list[dict[str, Any]]:
    built_in_by_code = {
        row.code: row for row in skill_rows if row.source == "built_in" and row.code in {"data_processing", "graph_synthesis"}
    }

    responses: list[dict[str, Any]] = []
    for default in BUILT_IN_SKILL_DEFAULTS:
        row = built_in_by_code.get(default["code"])
        responses.append(_to_skill_response(row, fallback=default))

    for row in skill_rows:
        if row.source == "uploaded" or row.code == "custom":
            responses.append(_to_skill_response(row))
    return responses


def _build_schema_config_response(db: Session, project: Project) -> dict[str, Any]:
    schema_cfg = db.query(SchemaConfig).filter(SchemaConfig.project_id == project.id).first()
    entity_rows = (
        db.query(EntityType)
        .filter(EntityType.project_id == project.id)
        .order_by(EntityType.created_at)
        .all()
    )
    relation_rows = (
        db.query(RelationType)
        .filter(RelationType.project_id == project.id)
        .order_by(RelationType.created_at)
        .all()
    )
    prop_rows = (
        db.query(SchemaProperty)
        .filter(SchemaProperty.project_id == project.id)
        .order_by(SchemaProperty.owner_kind, SchemaProperty.owner_id, SchemaProperty.sort_order)
        .all()
    )
    skill_rows = (
        db.query(Skill)
        .filter(Skill.project_id == project.id)
        .order_by(Skill.created_at)
        .all()
    )

    props_by_owner: dict[tuple[str, str], list[SchemaProperty]] = {}
    for row in prop_rows:
        key = (row.owner_kind, row.owner_id)
        props_by_owner.setdefault(key, []).append(row)

    entity_name_by_id = {entity.id: entity.name for entity in entity_rows}

    entity_types = [
        {
            "id": entity.id,
            "name": entity.name,
            "description": entity.description or "",
            "properties": [
                _to_schema_property_response(prop)
                for prop in props_by_owner.get((OWNER_KIND_ENTITY, entity.id), [])
            ],
        }
        for entity in entity_rows
    ]
    relation_types = [
        {
            "id": relation.id,
            "name": relation.name,
            "domain": entity_name_by_id.get(relation.domain_entity_type_id, ""),
            "range": entity_name_by_id.get(relation.range_entity_type_id, ""),
            "description": relation.description or "",
            "properties": [
                _to_schema_property_response(prop)
                for prop in props_by_owner.get((OWNER_KIND_RELATION, relation.id), [])
            ],
        }
        for relation in relation_rows
    ]

    return {
        "entity_types": entity_types,
        "relation_types": relation_types,
        "entity_scope": schema_cfg.entity_scope if schema_cfg else "",
        "relation_scope": schema_cfg.relation_scope if schema_cfg else "",
        "skills": _build_skills_response(skill_rows),
        "updated_at": schema_cfg.updated_at if schema_cfg else project.updated_at,
    }


def _pick_ai_entity_templates(doc_names: list[str]) -> list[dict[str, Any]]:
    text = " ".join(doc_names).lower()
    picked: list[dict[str, Any]] = []
    for template in AI_ENTITY_TEMPLATES:
        keywords = template.get("keywords") or []
        if any(str(keyword).lower() in text for keyword in keywords):
            picked.append(template)
    if len(picked) < 2:
        return AI_ENTITY_TEMPLATES[:3]
    return picked


def _generate_review_items_for_run(
    *,
    project_id: str,
    run_id: str,
    entities: list[EntityType],
    relations: list[RelationType],
    entity_name_by_id: dict[str, str],
    enabled_docs: list[ProjectDocument],
    enabled_data_sources: list[ProjectDataSource],
    now: datetime,
) -> list[ReviewItem]:
    source_items: list[tuple[str, str]] = []
    for doc in enabled_docs:
        source_items.append((doc.name, f"{doc.name} 文档中"))
    for source in enabled_data_sources:
        source_items.append((source.name, f"数据源 {source.name} 中"))
    if not source_items:
        source_items.append(("演示来源", "来源样例中"))

    review_rows: list[ReviewItem] = []
    for source_name, evidence_prefix in source_items:
        for entity in entities:
            review_rows.append(
                ReviewItem(
                    id=_new_id("review"),
                    project_id=project_id,
                    run_id=run_id,
                    kind="ENTITY",
                    title=f"{entity.name}::候选_{source_name.replace(' ', '_')[:16]}",
                    evidence=f"{evidence_prefix}发现与 {entity.name} 相关记录，需确认是否复用已有实体。",
                    confidence=round(0.74 + (hash(f'{run_id}:{entity.id}:{source_name}') % 21) / 100, 2),
                    status="PENDING",
                    entity_type_name=entity.name,
                    entity_name=None,
                    relation_type_name=None,
                    relation_domain_name=None,
                    relation_range_name=None,
                    payload_json=None,
                    created_at=now,
                    updated_at=now,
                )
            )

    for source_name, evidence_prefix in source_items:
        for relation in relations:
            domain_name = entity_name_by_id.get(relation.domain_entity_type_id, "")
            range_name = entity_name_by_id.get(relation.range_entity_type_id, "")
            review_rows.append(
                ReviewItem(
                    id=_new_id("review"),
                    project_id=project_id,
                    run_id=run_id,
                    kind="RELATION",
                    title=f"{domain_name} -[{relation.name}]-> {range_name}",
                    evidence=f"{evidence_prefix}发现 {relation.name} 关系的语义证据，待审核。",
                    confidence=round(0.7 + (hash(f'{run_id}:{relation.id}:{source_name}') % 23) / 100, 2),
                    status="PENDING",
                    entity_type_name=None,
                    entity_name=None,
                    relation_type_name=relation.name,
                    relation_domain_name=domain_name,
                    relation_range_name=range_name,
                    payload_json=None,
                    created_at=now,
                    updated_at=now,
                )
            )

    return review_rows[:36]


def _validate_data_source_payload(payload: dict[str, Any], *, for_update: bool) -> dict[str, Any]:
    name = _normalize_text(payload.get("name"))
    host = _normalize_text(payload.get("host"))
    database = _normalize_text(payload.get("database"))
    schema = _normalize_text(payload.get("schema"))
    username = _normalize_text(payload.get("username"))
    password = payload.get("password")
    extract_mode = payload.get("extract_mode") or "TABLE"
    sync_mode = payload.get("sync_mode") or "FULL"
    source_type = payload.get("type")

    if not name:
        raise ValueError("数据源名称不能为空")
    if not host:
        raise ValueError("数据库地址不能为空")
    if not database:
        raise ValueError("数据库名称不能为空")
    if not username:
        raise ValueError("数据库账号不能为空")

    try:
        port = int(payload.get("port"))
    except (TypeError, ValueError):
        raise ValueError("端口格式不正确")
    if port <= 0:
        raise ValueError("端口格式不正确")

    try:
        row_limit = int(payload.get("row_limit"))
    except (TypeError, ValueError):
        raise ValueError("单次拉取上限必须大于 0")
    if row_limit <= 0:
        raise ValueError("单次拉取上限必须大于 0")

    tables_raw = payload.get("tables") or []
    tables = []
    if isinstance(tables_raw, list):
        tables = [str(t).strip() for t in tables_raw if str(t).strip()]
    custom_sql = _normalize_text(payload.get("custom_sql"))
    incremental_column = _normalize_text(payload.get("incremental_column"))

    if extract_mode == "TABLE" and not tables:
        raise ValueError("请选择至少一个表用于抽取")
    if extract_mode == "SQL" and not custom_sql:
        raise ValueError("请输入 SQL 语句")
    if sync_mode == "INCREMENTAL" and not incremental_column:
        raise ValueError("增量同步需要填写增量字段")

    if for_update:
        password_plain = None
        if password is not None and str(password).strip():
            password_plain = str(password)
    else:
        if password is None or not str(password).strip():
            raise ValueError("数据库密码不能为空")
        password_plain = str(password)

    return {
        "name": name,
        "type": source_type,
        "host": host,
        "port": port,
        "database_name": database,
        "schema_name": schema,
        "username": username,
        "password_plain": password_plain,
        "ssl_enabled": bool(payload.get("ssl_enabled")),
        "enabled": bool(payload.get("enabled", True)),
        "extract_mode": extract_mode,
        "tables_json": json.dumps(tables, ensure_ascii=False),
        "custom_sql": custom_sql,
        "row_limit": row_limit,
        "sync_mode": sync_mode,
        "incremental_column": incremental_column,
    }


def list_projects(db: Session, user_id: int):
    projects = (
        db.query(Project)
        .filter(Project.owner_user_id == user_id)
        .order_by(desc(Project.updated_at))
        .all()
    )

    result = []
    for project in projects:
        doc_count = (
            db.query(func.count(ProjectDocument.id))
            .filter(ProjectDocument.project_id == project.id)
            .scalar()
            or 0
        )
        version_count = (
            db.query(func.count(OntologyVersion.id))
            .filter(OntologyVersion.project_id == project.id)
            .scalar()
            or 0
        )
        latest_run = (
            db.query(ExtractionRun.status)
            .filter(ExtractionRun.project_id == project.id)
            .order_by(desc(ExtractionRun.created_at))
            .first()
        )

        result.append(
            {
                "id": project.id,
                "name": project.name,
                "description": project.description or "",
                "created_at": project.created_at,
                "updated_at": project.updated_at,
                "document_count": int(doc_count),
                "version_count": int(version_count),
                "latest_run_status": latest_run[0] if latest_run else None,
            }
        )

    return result


def create_project(db: Session, user_id: int, payload: dict):
    name = _normalize_text(payload.get("name"))
    if not name:
        raise ValueError("项目名称不能为空")

    exists = (
        db.query(Project.id)
        .filter(Project.owner_user_id == user_id, Project.name == name)
        .first()
    )
    if exists:
        raise ValueError("项目名称已存在")

    now = _now()
    project = Project(
        id=_new_id("proj"),
        owner_user_id=user_id,
        name=name,
        description=_normalize_text(payload.get("description")),
        created_at=now,
        updated_at=now,
    )
    schema_cfg = SchemaConfig(
        project_id=project.id,
        entity_scope="",
        relation_scope="",
        updated_at=now,
    )
    db.add(project)
    db.add(schema_cfg)
    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description or "",
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "document_count": 0,
        "version_count": 0,
        "latest_run_status": None,
    }


def get_project_detail(db: Session, user_id: int, project_id: str):
    project = _ensure_project_owned(db, user_id, project_id)

    documents = (
        db.query(ProjectDocument)
        .filter(ProjectDocument.project_id == project.id)
        .order_by(desc(ProjectDocument.uploaded_at))
        .all()
    )
    data_sources = (
        db.query(ProjectDataSource)
        .filter(ProjectDataSource.project_id == project.id)
        .order_by(desc(ProjectDataSource.updated_at))
        .all()
    )
    runs = (
        db.query(ExtractionRun)
        .filter(ExtractionRun.project_id == project.id)
        .order_by(desc(ExtractionRun.created_at))
        .all()
    )
    versions = (
        db.query(OntologyVersion)
        .filter(OntologyVersion.project_id == project.id)
        .order_by(desc(OntologyVersion.created_at))
        .all()
    )
    actions = (
        db.query(ProjectAction)
        .filter(ProjectAction.project_id == project.id)
        .order_by(desc(ProjectAction.created_at))
        .all()
    )
    functions = (
        db.query(ProjectFunction)
        .filter(ProjectFunction.project_id == project.id)
        .order_by(desc(ProjectFunction.created_at))
        .all()
    )

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description or "",
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "current_version_id": project.current_version_id,
        "documents": [_to_document_response(doc) for doc in documents],
        "data_sources": [_to_data_source_response(ds) for ds in data_sources],
        "schema_config": _build_schema_config_response(db, project),
        "runs": [_to_run_response(db, run) for run in runs],
        "versions": [_to_version_response(item) for item in versions],
        "actions": [_to_action_response(item) for item in actions],
        "functions": [_to_function_response(item) for item in functions],
    }


def delete_project(db: Session, user_id: int, project_id: str):
    project = _ensure_project_owned(db, user_id, project_id)

    documents = (
        db.query(ProjectDocument)
        .filter(ProjectDocument.project_id == project.id)
        .all()
    )
    for doc in documents:
        if doc.storage_path:
            try:
                Path(doc.storage_path).unlink(missing_ok=True)
            except OSError:
                pass

    uploaded_skills = (
        db.query(Skill)
        .filter(
            Skill.project_id == project.id,
            or_(Skill.source == "uploaded", Skill.code == "custom"),
        )
        .all()
    )
    for skill in uploaded_skills:
        if skill.package_path:
            try:
                Path(skill.package_path).unlink(missing_ok=True)
            except OSError:
                pass

    db.query(ProjectDocument).filter(ProjectDocument.project_id == project.id).delete()
    db.query(ProjectDataSource).filter(ProjectDataSource.project_id == project.id).delete()
    db.query(SchemaProperty).filter(SchemaProperty.project_id == project.id).delete()
    db.query(RelationType).filter(RelationType.project_id == project.id).delete()
    db.query(EntityType).filter(EntityType.project_id == project.id).delete()
    db.query(ReviewItem).filter(ReviewItem.project_id == project.id).delete()
    db.query(ExtractionRun).filter(ExtractionRun.project_id == project.id).delete()
    db.query(VersionItem).filter(VersionItem.project_id == project.id).delete()
    db.query(OntologyVersion).filter(OntologyVersion.project_id == project.id).delete()
    db.query(ProjectAction).filter(ProjectAction.project_id == project.id).delete()
    db.query(ProjectFunction).filter(ProjectFunction.project_id == project.id).delete()
    db.query(Skill).filter(Skill.project_id == project.id).delete()
    db.query(SchemaConfig).filter(SchemaConfig.project_id == project.id).delete()
    db.query(Project).filter(Project.id == project.id).delete()
    db.commit()

    try:
        project_root = ASSET_ROOT / project.id
        if project_root.exists():
            for path in sorted(project_root.rglob("*"), reverse=True):
                if path.is_file():
                    path.unlink(missing_ok=True)
                elif path.is_dir():
                    path.rmdir()
            project_root.rmdir()
    except OSError:
        pass


def list_documents(db: Session, user_id: int, project_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    docs = (
        db.query(ProjectDocument)
        .filter(ProjectDocument.project_id == project.id)
        .order_by(desc(ProjectDocument.uploaded_at))
        .all()
    )
    return [_to_document_response(doc) for doc in docs]


def upload_document(db: Session, user_id: int, project_id: str, filename: str, content: bytes):
    project = _ensure_project_owned(db, user_id, project_id)
    name = _normalize_text(filename)
    if not name:
        raise ValueError("文件名不能为空")

    ext = Path(name).suffix.lower()
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise ValueError("仅支持 .docx 或 .md 文档")

    now = _now()
    document_id = _new_id("doc")
    dest_dir = ASSET_ROOT / project.id / "documents"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"{document_id}{ext}"
    dest_path.write_bytes(content)

    doc = ProjectDocument(
        id=document_id,
        project_id=project.id,
        name=name,
        file_type=ext.lstrip("."),
        size_bytes=len(content),
        status="READY",
        enabled=True,
        storage_path=str(dest_path),
        uploaded_at=now,
        created_at=now,
        updated_at=now,
    )
    _touch_project(project)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _to_document_response(doc)


def patch_document_enabled(db: Session, user_id: int, project_id: str, document_id: str, enabled: bool):
    project = _ensure_project_owned(db, user_id, project_id)
    doc = (
        db.query(ProjectDocument)
        .filter(ProjectDocument.project_id == project.id, ProjectDocument.id == document_id)
        .first()
    )
    if not doc:
        raise ValueError("文档不存在")

    doc.enabled = bool(enabled)
    doc.updated_at = _now()
    _touch_project(project)
    db.commit()
    db.refresh(doc)
    return _to_document_response(doc)


def delete_document(db: Session, user_id: int, project_id: str, document_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    doc = (
        db.query(ProjectDocument)
        .filter(ProjectDocument.project_id == project.id, ProjectDocument.id == document_id)
        .first()
    )
    if not doc:
        raise ValueError("文档不存在")

    if doc.storage_path:
        try:
            Path(doc.storage_path).unlink(missing_ok=True)
        except OSError:
            pass

    db.delete(doc)
    _touch_project(project)
    db.commit()


def list_data_sources(db: Session, user_id: int, project_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    rows = (
        db.query(ProjectDataSource)
        .filter(ProjectDataSource.project_id == project.id)
        .order_by(desc(ProjectDataSource.updated_at))
        .all()
    )
    return [_to_data_source_response(item) for item in rows]


def create_data_source(db: Session, user_id: int, project_id: str, payload: dict):
    project = _ensure_project_owned(db, user_id, project_id)
    normalized = _validate_data_source_payload(payload, for_update=False)

    duplicated = (
        db.query(ProjectDataSource.id)
        .filter(
            ProjectDataSource.project_id == project.id,
            ProjectDataSource.name == normalized["name"],
        )
        .first()
    )
    if duplicated:
        raise ValueError("数据源名称已存在")

    now = _now()
    data_source = ProjectDataSource(
        id=_new_id("ds"),
        project_id=project.id,
        name=normalized["name"],
        type=normalized["type"],
        host=normalized["host"],
        port=normalized["port"],
        database_name=normalized["database_name"],
        schema_name=normalized["schema_name"],
        username=normalized["username"],
        password_encrypted=_encrypt_secret(normalized["password_plain"] or ""),
        ssl_enabled=normalized["ssl_enabled"],
        enabled=normalized["enabled"],
        extract_mode=normalized["extract_mode"],
        tables_json=normalized["tables_json"],
        custom_sql=normalized["custom_sql"],
        row_limit=normalized["row_limit"],
        sync_mode=normalized["sync_mode"],
        incremental_column=normalized["incremental_column"],
        status="UNKNOWN",
        last_test_at=None,
        last_error="",
        created_at=now,
        updated_at=now,
    )
    _touch_project(project)
    db.add(data_source)
    db.commit()
    db.refresh(data_source)
    return _to_data_source_response(data_source)


def update_data_source(db: Session, user_id: int, project_id: str, data_source_id: str, payload: dict):
    project = _ensure_project_owned(db, user_id, project_id)
    normalized = _validate_data_source_payload(payload, for_update=True)

    data_source = (
        db.query(ProjectDataSource)
        .filter(
            ProjectDataSource.project_id == project.id,
            ProjectDataSource.id == data_source_id,
        )
        .first()
    )
    if not data_source:
        raise ValueError("数据源不存在")

    duplicated = (
        db.query(ProjectDataSource.id)
        .filter(
            ProjectDataSource.project_id == project.id,
            ProjectDataSource.id != data_source_id,
            ProjectDataSource.name == normalized["name"],
        )
        .first()
    )
    if duplicated:
        raise ValueError("数据源名称已存在")

    data_source.name = normalized["name"]
    data_source.type = normalized["type"]
    data_source.host = normalized["host"]
    data_source.port = normalized["port"]
    data_source.database_name = normalized["database_name"]
    data_source.schema_name = normalized["schema_name"]
    data_source.username = normalized["username"]
    if normalized["password_plain"] is not None:
        data_source.password_encrypted = _encrypt_secret(normalized["password_plain"])
    data_source.ssl_enabled = normalized["ssl_enabled"]
    data_source.enabled = normalized["enabled"]
    data_source.extract_mode = normalized["extract_mode"]
    data_source.tables_json = normalized["tables_json"]
    data_source.custom_sql = normalized["custom_sql"]
    data_source.row_limit = normalized["row_limit"]
    data_source.sync_mode = normalized["sync_mode"]
    data_source.incremental_column = normalized["incremental_column"]
    data_source.status = "UNKNOWN"
    data_source.last_error = ""
    data_source.last_test_at = None
    data_source.updated_at = _now()
    _touch_project(project)
    db.commit()
    db.refresh(data_source)
    return _to_data_source_response(data_source)


def patch_data_source_enabled(
    db: Session, user_id: int, project_id: str, data_source_id: str, enabled: bool
):
    project = _ensure_project_owned(db, user_id, project_id)
    data_source = (
        db.query(ProjectDataSource)
        .filter(
            ProjectDataSource.project_id == project.id,
            ProjectDataSource.id == data_source_id,
        )
        .first()
    )
    if not data_source:
        raise ValueError("数据源不存在")

    data_source.enabled = bool(enabled)
    data_source.updated_at = _now()
    _touch_project(project)
    db.commit()
    db.refresh(data_source)
    return _to_data_source_response(data_source)


def delete_data_source(db: Session, user_id: int, project_id: str, data_source_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    data_source = (
        db.query(ProjectDataSource)
        .filter(
            ProjectDataSource.project_id == project.id,
            ProjectDataSource.id == data_source_id,
        )
        .first()
    )
    if not data_source:
        raise ValueError("数据源不存在")

    db.delete(data_source)
    _touch_project(project)
    db.commit()


def test_data_source_connection(db: Session, user_id: int, project_id: str, data_source_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    data_source = (
        db.query(ProjectDataSource)
        .filter(
            ProjectDataSource.project_id == project.id,
            ProjectDataSource.id == data_source_id,
        )
        .first()
    )
    if not data_source:
        raise ValueError("数据源不存在")

    tested_at = _now()
    lower_host = (data_source.host or "").lower()
    force_failed = (
        "timeout" in lower_host or "fail" in lower_host or "invalid" in lower_host
    )
    status = "FAILED" if force_failed else "SUCCESS"
    data_source.status = status
    data_source.last_test_at = tested_at
    data_source.last_error = "连接失败: mock network timeout" if force_failed else ""
    data_source.updated_at = tested_at
    _touch_project(project)
    db.commit()

    return {
        "status": status,
        "tested_at": tested_at,
        "message": "连接成功，目标数据库可访问" if status == "SUCCESS" else data_source.last_error,
    }


def create_entity_type(db: Session, user_id: int, project_id: str, payload: dict):
    project = _ensure_project_owned(db, user_id, project_id)
    name = _normalize_text(payload.get("name"))
    if not name:
        raise ValueError("实体类型名称不能为空")

    duplicated = (
        db.query(EntityType.id)
        .filter(EntityType.project_id == project.id, EntityType.name == name)
        .first()
    )
    if duplicated:
        raise ValueError("实体类型已存在")

    properties = _normalize_schema_properties_payload(payload.get("properties"))
    now = _now()

    entity = EntityType(
        id=_new_id("ent"),
        project_id=project.id,
        name=name,
        description=_normalize_text(payload.get("description")),
        created_at=now,
        updated_at=now,
    )
    schema_cfg = _ensure_schema_config_row(db, project.id, now)
    db.add(entity)
    prop_rows = _replace_owner_properties(
        db,
        project_id=project.id,
        owner_kind=OWNER_KIND_ENTITY,
        owner_id=entity.id,
        properties=properties,
        now=now,
    )

    schema_cfg.updated_at = now
    _touch_project(project)
    db.commit()

    return {
        "id": entity.id,
        "name": entity.name,
        "description": entity.description or "",
        "properties": [_to_schema_property_response(row) for row in prop_rows],
    }


def update_entity_type(db: Session, user_id: int, project_id: str, entity_type_id: str, payload: dict):
    project = _ensure_project_owned(db, user_id, project_id)
    entity = (
        db.query(EntityType)
        .filter(EntityType.project_id == project.id, EntityType.id == entity_type_id)
        .first()
    )
    if not entity:
        raise ValueError("实体类型不存在")

    name = _normalize_text(payload.get("name"))
    if not name:
        raise ValueError("实体类型名称不能为空")

    duplicated = (
        db.query(EntityType.id)
        .filter(
            EntityType.project_id == project.id,
            EntityType.id != entity.id,
            EntityType.name == name,
        )
        .first()
    )
    if duplicated:
        raise ValueError("实体类型已存在")

    properties = _normalize_schema_properties_payload(payload.get("properties"))
    now = _now()

    entity.name = name
    entity.description = _normalize_text(payload.get("description"))
    entity.updated_at = now

    prop_rows = _replace_owner_properties(
        db,
        project_id=project.id,
        owner_kind=OWNER_KIND_ENTITY,
        owner_id=entity.id,
        properties=properties,
        now=now,
    )

    schema_cfg = _ensure_schema_config_row(db, project.id, now)
    schema_cfg.updated_at = now
    _touch_project(project)
    db.commit()

    return {
        "id": entity.id,
        "name": entity.name,
        "description": entity.description or "",
        "properties": [_to_schema_property_response(row) for row in prop_rows],
    }


def delete_entity_type(db: Session, user_id: int, project_id: str, entity_type_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    entity = (
        db.query(EntityType)
        .filter(EntityType.project_id == project.id, EntityType.id == entity_type_id)
        .first()
    )
    if not entity:
        raise ValueError("实体类型不存在")

    relation_ids = [
        row.id
        for row in db.query(RelationType.id)
        .filter(
            RelationType.project_id == project.id,
            or_(
                RelationType.domain_entity_type_id == entity.id,
                RelationType.range_entity_type_id == entity.id,
            ),
        )
        .all()
    ]
    if relation_ids:
        db.query(SchemaProperty).filter(
            SchemaProperty.project_id == project.id,
            SchemaProperty.owner_kind == OWNER_KIND_RELATION,
            SchemaProperty.owner_id.in_(relation_ids),
        ).delete(synchronize_session=False)
        db.query(RelationType).filter(RelationType.id.in_(relation_ids)).delete(synchronize_session=False)

    db.query(SchemaProperty).filter(
        SchemaProperty.project_id == project.id,
        SchemaProperty.owner_kind == OWNER_KIND_ENTITY,
        SchemaProperty.owner_id == entity.id,
    ).delete()
    db.delete(entity)

    now = _now()
    schema_cfg = _ensure_schema_config_row(db, project.id, now)
    schema_cfg.updated_at = now
    _touch_project(project)
    db.commit()


def create_relation_type(db: Session, user_id: int, project_id: str, payload: dict):
    project = _ensure_project_owned(db, user_id, project_id)
    name = _normalize_text(payload.get("name"))
    if not name:
        raise ValueError("关系类型名称不能为空")

    domain_name = _normalize_text(payload.get("domain"))
    range_name = _normalize_text(payload.get("range"))

    entities = (
        db.query(EntityType)
        .filter(EntityType.project_id == project.id)
        .order_by(EntityType.created_at)
        .all()
    )
    entity_by_name = {item.name: item for item in entities}
    domain_entity = entity_by_name.get(domain_name)
    range_entity = entity_by_name.get(range_name)
    if not domain_entity or not range_entity:
        raise ValueError("关系的 domain/range 必须来自实体类型")

    duplicated = (
        db.query(RelationType.id)
        .filter(RelationType.project_id == project.id, RelationType.name == name)
        .first()
    )
    if duplicated:
        raise ValueError("关系类型已存在")

    properties = _normalize_schema_properties_payload(payload.get("properties"))
    now = _now()
    relation = RelationType(
        id=_new_id("rel"),
        project_id=project.id,
        name=name,
        domain_entity_type_id=domain_entity.id,
        range_entity_type_id=range_entity.id,
        description=_normalize_text(payload.get("description")),
        created_at=now,
        updated_at=now,
    )
    schema_cfg = _ensure_schema_config_row(db, project.id, now)
    db.add(relation)
    prop_rows = _replace_owner_properties(
        db,
        project_id=project.id,
        owner_kind=OWNER_KIND_RELATION,
        owner_id=relation.id,
        properties=properties,
        now=now,
    )

    schema_cfg.updated_at = now
    _touch_project(project)
    db.commit()

    return {
        "id": relation.id,
        "name": relation.name,
        "domain": domain_entity.name,
        "range": range_entity.name,
        "description": relation.description or "",
        "properties": [_to_schema_property_response(row) for row in prop_rows],
    }


def update_relation_type(
    db: Session, user_id: int, project_id: str, relation_type_id: str, payload: dict
):
    project = _ensure_project_owned(db, user_id, project_id)
    relation = (
        db.query(RelationType)
        .filter(RelationType.project_id == project.id, RelationType.id == relation_type_id)
        .first()
    )
    if not relation:
        raise ValueError("关系类型不存在")

    name = _normalize_text(payload.get("name"))
    if not name:
        raise ValueError("关系类型名称不能为空")

    entities = (
        db.query(EntityType)
        .filter(EntityType.project_id == project.id)
        .order_by(EntityType.created_at)
        .all()
    )
    entity_by_name = {item.name: item for item in entities}
    domain_entity = entity_by_name.get(_normalize_text(payload.get("domain")))
    range_entity = entity_by_name.get(_normalize_text(payload.get("range")))
    if not domain_entity or not range_entity:
        raise ValueError("关系的 domain/range 必须来自实体类型")

    duplicated = (
        db.query(RelationType.id)
        .filter(
            RelationType.project_id == project.id,
            RelationType.id != relation.id,
            RelationType.name == name,
        )
        .first()
    )
    if duplicated:
        raise ValueError("关系类型已存在")

    properties = _normalize_schema_properties_payload(payload.get("properties"))
    now = _now()

    relation.name = name
    relation.domain_entity_type_id = domain_entity.id
    relation.range_entity_type_id = range_entity.id
    relation.description = _normalize_text(payload.get("description"))
    relation.updated_at = now
    prop_rows = _replace_owner_properties(
        db,
        project_id=project.id,
        owner_kind=OWNER_KIND_RELATION,
        owner_id=relation.id,
        properties=properties,
        now=now,
    )

    schema_cfg = _ensure_schema_config_row(db, project.id, now)
    schema_cfg.updated_at = now
    _touch_project(project)
    db.commit()

    return {
        "id": relation.id,
        "name": relation.name,
        "domain": domain_entity.name,
        "range": range_entity.name,
        "description": relation.description or "",
        "properties": [_to_schema_property_response(row) for row in prop_rows],
    }


def delete_relation_type(db: Session, user_id: int, project_id: str, relation_type_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    relation = (
        db.query(RelationType)
        .filter(RelationType.project_id == project.id, RelationType.id == relation_type_id)
        .first()
    )
    if not relation:
        raise ValueError("关系类型不存在")

    db.query(SchemaProperty).filter(
        SchemaProperty.project_id == project.id,
        SchemaProperty.owner_kind == OWNER_KIND_RELATION,
        SchemaProperty.owner_id == relation.id,
    ).delete()
    db.delete(relation)

    now = _now()
    schema_cfg = _ensure_schema_config_row(db, project.id, now)
    schema_cfg.updated_at = now
    _touch_project(project)
    db.commit()


def update_schema_prompts(db: Session, user_id: int, project_id: str, payload: dict):
    project = _ensure_project_owned(db, user_id, project_id)
    skills_raw = payload.get("skills") or []
    if not isinstance(skills_raw, list):
        raise ValueError("skills 参数格式不正确")

    now = _now()
    schema_cfg = _ensure_schema_config_row(db, project.id, now)
    schema_cfg.entity_scope = str(payload.get("entity_scope") or "")
    schema_cfg.relation_scope = str(payload.get("relation_scope") or "")
    schema_cfg.updated_at = now

    existing_rows = db.query(Skill).filter(Skill.project_id == project.id).all()
    existing_builtin_by_code = {
        row.code: row for row in existing_rows if row.source == "built_in"
    }
    existing_custom_by_id = {
        row.id: row
        for row in existing_rows
        if row.source == "uploaded" or row.code == "custom"
    }

    builtin_payload_by_code: dict[str, dict[str, Any]] = {}
    custom_payloads: list[dict[str, Any]] = []
    for item in skills_raw:
        if not isinstance(item, dict):
            continue
        code = str(item.get("code") or "")
        source = str(item.get("source") or "")
        if code in {"data_processing", "graph_synthesis"}:
            builtin_payload_by_code[code] = item
        elif code == "custom" or source == "uploaded":
            custom_payloads.append(item)

    for default in BUILT_IN_SKILL_DEFAULTS:
        code = default["code"]
        payload_item = builtin_payload_by_code.get(code, {})
        row = existing_builtin_by_code.get(code)
        if row is None:
            row = Skill(
                id=_new_id("skill"),
                project_id=project.id,
                code=code,
                source="built_in",
                created_at=now,
                updated_at=now,
            )
            db.add(row)

        row.name = default["name"]
        row.description = default["description"]
        row.enabled = bool(payload_item.get("enabled", default["enabled"]))
        prompt_raw = payload_item.get("prompt")
        row.prompt = prompt_raw if isinstance(prompt_raw, str) else default["prompt"]
        row.tags_json = json.dumps(default["tags"], ensure_ascii=False)
        row.blocked = bool(payload_item.get("blocked", default["blocked"]))
        missing_raw = payload_item.get("missing")
        row.missing = (
            _normalize_text(missing_raw) if missing_raw is not None else default["missing"]
        )
        row.file_name = ""
        row.source = "built_in"
        row.code = code
        row.updated_at = now

    kept_custom_ids: set[str] = set()
    for index, item in enumerate(custom_payloads, start=1):
        payload_id = _normalize_text(item.get("id"))
        row = existing_custom_by_id.get(payload_id) if payload_id else None
        if row is None:
            row = Skill(
                id=payload_id or _new_id("skill"),
                project_id=project.id,
                created_at=now,
                updated_at=now,
            )
            db.add(row)

        name = _normalize_text(item.get("name")) or f"自定义Skill_{index}"
        description = _normalize_text(item.get("description"))
        prompt_raw = item.get("prompt")
        prompt = prompt_raw if isinstance(prompt_raw, str) else ""
        tags = []
        tags_raw = item.get("tags")
        if isinstance(tags_raw, list):
            tags = [_normalize_text(str(tag)) for tag in tags_raw if _normalize_text(str(tag))]
        if not tags:
            tags = ["user-uploaded"]

        row.code = "custom"
        row.source = "uploaded"
        row.name = name
        row.description = description
        row.enabled = bool(item.get("enabled", True))
        row.prompt = prompt
        row.tags_json = json.dumps(tags, ensure_ascii=False)
        row.blocked = bool(item.get("blocked", False))
        row.missing = _normalize_text(item.get("missing"))
        row.file_name = _normalize_text(item.get("file_name")) or row.file_name or ""
        row.updated_at = now
        kept_custom_ids.add(row.id)

    for row_id, row in existing_custom_by_id.items():
        if row_id in kept_custom_ids:
            continue
        if row.package_path:
            try:
                Path(row.package_path).unlink(missing_ok=True)
            except OSError:
                pass
        db.delete(row)

    _touch_project(project)
    db.commit()
    return _build_schema_config_response(db, project)


def upload_custom_skill(db: Session, user_id: int, project_id: str, filename: str, content: bytes):
    project = _ensure_project_owned(db, user_id, project_id)
    name = _normalize_text(filename)
    if not name:
        raise ValueError("文件名不能为空")
    if Path(name).suffix.lower() != ".zip":
        raise ValueError("仅支持上传 zip 格式的 Skill 包")

    now = _now()
    skill_id = _new_id("skill")
    dest_dir = ASSET_ROOT / project.id / "skills"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"{skill_id}.zip"
    dest_path.write_bytes(content)

    custom_count = (
        db.query(func.count(Skill.id))
        .filter(
            Skill.project_id == project.id,
            or_(Skill.source == "uploaded", Skill.code == "custom"),
        )
        .scalar()
        or 0
    )
    base_name = _normalize_text(Path(name).stem)

    skill = Skill(
        id=skill_id,
        project_id=project.id,
        code="custom",
        name=base_name or f"自定义Skill_{int(custom_count) + 1}",
        description="用户上传的 Skill 包（zip），目录结构参考 skills/ontology-generator。",
        enabled=True,
        prompt="",
        source="uploaded",
        tags_json=json.dumps(["user-uploaded", "zip-skill"], ensure_ascii=False),
        blocked=False,
        missing="",
        file_name=name,
        package_path=str(dest_path),
        created_at=now,
        updated_at=now,
    )
    schema_cfg = _ensure_schema_config_row(db, project.id, now)
    schema_cfg.updated_at = now
    _touch_project(project)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return _to_skill_response(skill)


def delete_custom_skill(db: Session, user_id: int, project_id: str, skill_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    skill = (
        db.query(Skill)
        .filter(Skill.project_id == project.id, Skill.id == skill_id)
        .first()
    )
    if not skill:
        raise ValueError("Skill 不存在")
    if skill.source != "uploaded":
        raise ValueError("内置 Skill 不允许删除")

    if skill.package_path:
        try:
            Path(skill.package_path).unlink(missing_ok=True)
        except OSError:
            pass

    now = _now()
    schema_cfg = _ensure_schema_config_row(db, project.id, now)
    schema_cfg.updated_at = now
    _touch_project(project)
    db.delete(skill)
    db.commit()


def run_ai_schema_insight(db: Session, user_id: int, project_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    enabled_docs = (
        db.query(ProjectDocument)
        .filter(ProjectDocument.project_id == project.id, ProjectDocument.enabled.is_(True))
        .order_by(desc(ProjectDocument.uploaded_at))
        .all()
    )
    if not enabled_docs:
        raise ValueError("请至少启用一个文档后再进行 AI 洞察")

    entity_rows = db.query(EntityType).filter(EntityType.project_id == project.id).all()
    relation_rows = db.query(RelationType).filter(RelationType.project_id == project.id).all()
    entity_name_to_id = {item.name: item.id for item in entity_rows}
    existing_relation_names = {item.name for item in relation_rows}

    picked_entities = _pick_ai_entity_templates([doc.name for doc in enabled_docs])
    added_entity_names: list[str] = []
    added_relation_names: list[str] = []
    now = _now()

    for template in picked_entities:
        entity_name = str(template.get("name") or "")
        if not entity_name or entity_name in entity_name_to_id:
            continue

        entity_id = _new_id("ent")
        entity = EntityType(
            id=entity_id,
            project_id=project.id,
            name=entity_name,
            description=str(template.get("description") or ""),
            created_at=now,
            updated_at=now,
        )
        db.add(entity)
        entity_name_to_id[entity_name] = entity_id
        added_entity_names.append(entity_name)

        for index, prop in enumerate(template.get("properties") or []):
            prop_name = _normalize_text(prop.get("name"))
            if not prop_name:
                continue
            data_type = str(prop.get("data_type") or "STRING").upper()
            if data_type not in ALLOWED_PROPERTY_DATA_TYPES:
                data_type = "STRING"
            db.add(
                SchemaProperty(
                    id=_new_id("prop"),
                    project_id=project.id,
                    owner_kind=OWNER_KIND_ENTITY,
                    owner_id=entity_id,
                    name=prop_name,
                    display_name=_normalize_text(prop.get("display_name")) or prop_name,
                    data_type=data_type,
                    required=bool(prop.get("required")),
                    default_value=_normalize_text(prop.get("default_value")),
                    description=_normalize_text(prop.get("description")),
                    sort_order=index,
                    created_at=now,
                    updated_at=now,
                )
            )

    for template in AI_RELATION_TEMPLATES:
        relation_name = str(template.get("name") or "")
        if not relation_name or relation_name in existing_relation_names:
            continue
        domain_id = entity_name_to_id.get(str(template.get("domain") or ""))
        range_id = entity_name_to_id.get(str(template.get("range") or ""))
        if not domain_id or not range_id:
            continue

        db.add(
            RelationType(
                id=_new_id("rel"),
                project_id=project.id,
                name=relation_name,
                domain_entity_type_id=domain_id,
                range_entity_type_id=range_id,
                description=str(template.get("description") or ""),
                created_at=now,
                updated_at=now,
            )
        )
        existing_relation_names.add(relation_name)
        added_relation_names.append(relation_name)

    if added_entity_names or added_relation_names:
        schema_cfg = _ensure_schema_config_row(db, project.id, now)
        schema_cfg.updated_at = now
        _touch_project(project)
        db.commit()

    return {
        "scanned_document_count": len(enabled_docs),
        "added_entity_count": len(added_entity_names),
        "added_relation_count": len(added_relation_names),
        "added_entity_names": added_entity_names,
        "added_relation_names": added_relation_names,
    }


def create_extraction_run(db: Session, user_id: int, project_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    enabled_docs = (
        db.query(ProjectDocument)
        .filter(ProjectDocument.project_id == project.id, ProjectDocument.enabled.is_(True))
        .order_by(desc(ProjectDocument.uploaded_at))
        .all()
    )
    enabled_data_sources = (
        db.query(ProjectDataSource)
        .filter(ProjectDataSource.project_id == project.id, ProjectDataSource.enabled.is_(True))
        .order_by(desc(ProjectDataSource.updated_at))
        .all()
    )
    if not enabled_docs and not enabled_data_sources:
        raise ValueError("请至少启用一个数据来源（文档或数据源）后再执行抽取")

    entity_rows = (
        db.query(EntityType)
        .filter(EntityType.project_id == project.id)
        .order_by(EntityType.created_at)
        .all()
    )
    if not entity_rows:
        raise ValueError("请先配置实体类型")

    relation_rows = (
        db.query(RelationType)
        .filter(RelationType.project_id == project.id)
        .order_by(RelationType.created_at)
        .all()
    )
    skills = _build_skills_response(db.query(Skill).filter(Skill.project_id == project.id).all())
    if not any(skill.get("enabled") and not skill.get("blocked") for skill in skills):
        raise ValueError("请至少启用一个 Skill")

    now = _now()
    run_id = _new_id("run")
    source_snapshot = {
        "documents": [
            {
                "id": doc.id,
                "name": doc.name,
                "uploadedAt": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            }
            for doc in enabled_docs
        ],
        "dataSources": [
            {
                "id": ds.id,
                "name": ds.name,
                "extractMode": ds.extract_mode,
                "syncMode": ds.sync_mode,
                "updatedAt": ds.updated_at.isoformat() if ds.updated_at else None,
            }
            for ds in enabled_data_sources
        ],
    }
    run = ExtractionRun(
        id=run_id,
        project_id=project.id,
        status="COMPLETED",
        progress=100,
        source_snapshot_json=json.dumps(source_snapshot, ensure_ascii=False),
        candidate_entity_count=0,
        candidate_relation_count=0,
        pending_review_count=0,
        error_message="",
        created_at=now,
        completed_at=now,
        updated_at=now,
    )
    db.add(run)

    entity_name_by_id = {entity.id: entity.name for entity in entity_rows}
    review_rows = _generate_review_items_for_run(
        project_id=project.id,
        run_id=run.id,
        entities=entity_rows,
        relations=relation_rows,
        entity_name_by_id=entity_name_by_id,
        enabled_docs=enabled_docs,
        enabled_data_sources=enabled_data_sources,
        now=now,
    )
    for row in review_rows:
        db.add(row)
    _recalc_run_stats(db, run)
    _touch_project(project)
    db.commit()
    db.refresh(run)
    return _to_run_response(db, run)


def get_extraction_run(db: Session, user_id: int, project_id: str, run_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    run = (
        db.query(ExtractionRun)
        .filter(ExtractionRun.project_id == project.id, ExtractionRun.id == run_id)
        .first()
    )
    if not run:
        raise ValueError("抽取任务不存在")
    return _to_run_response(db, run)


def patch_review_item_status(
    db: Session, user_id: int, project_id: str, run_id: str, item_id: str, status: str
):
    project = _ensure_project_owned(db, user_id, project_id)
    run = (
        db.query(ExtractionRun)
        .filter(ExtractionRun.project_id == project.id, ExtractionRun.id == run_id)
        .first()
    )
    if not run:
        raise ValueError("抽取任务不存在")

    review_item = (
        db.query(ReviewItem)
        .filter(
            ReviewItem.project_id == project.id,
            ReviewItem.run_id == run.id,
            ReviewItem.id == item_id,
        )
        .first()
    )
    if not review_item:
        raise ValueError("审核项不存在")

    review_item.status = status
    review_item.updated_at = _now()
    _recalc_run_stats(db, run)
    run.updated_at = _now()
    _touch_project(project)
    db.commit()
    db.refresh(review_item)
    return _to_review_item_response(review_item)


def publish_run_version(db: Session, user_id: int, project_id: str, run_id: str, payload: dict):
    project = _ensure_project_owned(db, user_id, project_id)
    run = (
        db.query(ExtractionRun)
        .filter(ExtractionRun.project_id == project.id, ExtractionRun.id == run_id)
        .first()
    )
    if not run:
        raise ValueError("抽取任务不存在")
    if run.status != "COMPLETED":
        raise ValueError("请等待抽取任务完成后再发布")

    max_version_no = (
        db.query(func.max(OntologyVersion.version_no))
        .filter(OntologyVersion.project_id == project.id)
        .scalar()
        or 0
    )
    version_no = int(max_version_no) + 1
    version_label = _normalize_text(payload.get("label")) or f"本体版本 v{version_no}"
    now = _now()

    approved_items = (
        db.query(ReviewItem)
        .filter(
            ReviewItem.project_id == project.id,
            ReviewItem.run_id == run.id,
            ReviewItem.status == "APPROVED",
        )
        .all()
    )
    approved_entity_count = len([item for item in approved_items if item.kind == "ENTITY"])
    approved_relation_count = len([item for item in approved_items if item.kind == "RELATION"])

    version = OntologyVersion(
        id=_new_id("ver"),
        project_id=project.id,
        version_no=version_no,
        version=f"v{version_no}",
        label=version_label,
        notes=_normalize_text(payload.get("notes")),
        source_run_id=run.id,
        entity_count=approved_entity_count,
        relation_count=approved_relation_count,
        created_at=now,
    )
    db.add(version)

    for item in approved_items:
        db.add(
            VersionItem(
                id=_new_id("vitem"),
                project_id=project.id,
                version_id=version.id,
                run_item_id=item.id,
                kind=item.kind,
                title=item.title,
                evidence=item.evidence,
                confidence=item.confidence,
                payload_json=item.payload_json or "",
                created_at=now,
            )
        )

    project.current_version_id = version.id
    _touch_project(project)
    db.commit()
    db.refresh(version)
    return _to_version_response(version)


def create_action(db: Session, user_id: int, project_id: str, payload: dict):
    project = _ensure_project_owned(db, user_id, project_id)
    name = _normalize_text(payload.get("name"))
    if not name:
        raise ValueError("动作名称不能为空")

    status = str(payload.get("status") or "DRAFT")
    if status not in {"DRAFT", "ACTIVE"}:
        status = "DRAFT"
    now = _now()
    action = ProjectAction(
        id=_new_id("act"),
        project_id=project.id,
        name=name,
        description=_normalize_text(payload.get("description")),
        status=status,
        created_at=now,
        updated_at=now,
    )
    db.add(action)
    _touch_project(project)
    db.commit()
    db.refresh(action)
    return _to_action_response(action)


def patch_action_status(db: Session, user_id: int, project_id: str, action_id: str, status: str):
    project = _ensure_project_owned(db, user_id, project_id)
    action = (
        db.query(ProjectAction)
        .filter(ProjectAction.project_id == project.id, ProjectAction.id == action_id)
        .first()
    )
    if not action:
        raise ValueError("动作不存在")

    action.status = status
    action.updated_at = _now()
    _touch_project(project)
    db.commit()
    db.refresh(action)
    return _to_action_response(action)


def delete_action(db: Session, user_id: int, project_id: str, action_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    action = (
        db.query(ProjectAction)
        .filter(ProjectAction.project_id == project.id, ProjectAction.id == action_id)
        .first()
    )
    if not action:
        raise ValueError("动作不存在")
    db.delete(action)
    _touch_project(project)
    db.commit()


def create_function(db: Session, user_id: int, project_id: str, payload: dict):
    project = _ensure_project_owned(db, user_id, project_id)
    name = _normalize_text(payload.get("name"))
    if not name:
        raise ValueError("函数名称不能为空")

    status = str(payload.get("status") or "DRAFT")
    if status not in {"DRAFT", "ACTIVE"}:
        status = "DRAFT"

    now = _now()
    row = ProjectFunction(
        id=_new_id("fn"),
        project_id=project.id,
        name=name,
        description=_normalize_text(payload.get("description")),
        script_content=str(payload.get("script_content") or ""),
        status=status,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    _touch_project(project)
    db.commit()
    db.refresh(row)
    return _to_function_response(row)


def patch_function_status(db: Session, user_id: int, project_id: str, function_id: str, status: str):
    project = _ensure_project_owned(db, user_id, project_id)
    row = (
        db.query(ProjectFunction)
        .filter(ProjectFunction.project_id == project.id, ProjectFunction.id == function_id)
        .first()
    )
    if not row:
        raise ValueError("函数不存在")
    row.status = status
    row.updated_at = _now()
    _touch_project(project)
    db.commit()
    db.refresh(row)
    return _to_function_response(row)


def delete_function(db: Session, user_id: int, project_id: str, function_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    row = (
        db.query(ProjectFunction)
        .filter(ProjectFunction.project_id == project.id, ProjectFunction.id == function_id)
        .first()
    )
    if not row:
        raise ValueError("函数不存在")
    db.delete(row)
    _touch_project(project)
    db.commit()
