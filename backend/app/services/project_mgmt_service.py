import base64
import concurrent.futures
import json
import logging
import os
import posixpath
import re
import threading
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import uuid4
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session, sessionmaker

from app.models.project_mgmt import (
    AiInsightRun,
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
from app.services.project_mgmt_ai_insight import (
    _parse_ai_schema_insight_output,
    _resolve_ai_insight_concurrency,
    _run_ai_schema_insight_llm,
)


logger = logging.getLogger(__name__)
_AI_INSIGHT_ACTIVE_RUN_IDS: set[str] = set()
_AI_INSIGHT_ACTIVE_RUN_IDS_LOCK = threading.Lock()
_EXTRACTION_ACTIVE_RUN_IDS: set[str] = set()
_EXTRACTION_ACTIVE_RUN_IDS_LOCK = threading.Lock()


def _register_ai_insight_active_run(run_id: str) -> None:
    rid = _normalize_text(run_id)
    if not rid:
        return
    with _AI_INSIGHT_ACTIVE_RUN_IDS_LOCK:
        _AI_INSIGHT_ACTIVE_RUN_IDS.add(rid)


def _unregister_ai_insight_active_run(run_id: str) -> None:
    rid = _normalize_text(run_id)
    if not rid:
        return
    with _AI_INSIGHT_ACTIVE_RUN_IDS_LOCK:
        _AI_INSIGHT_ACTIVE_RUN_IDS.discard(rid)


def _is_ai_insight_active_run(run_id: str) -> bool:
    rid = _normalize_text(run_id)
    if not rid:
        return False
    with _AI_INSIGHT_ACTIVE_RUN_IDS_LOCK:
        return rid in _AI_INSIGHT_ACTIVE_RUN_IDS


def _register_extraction_active_run(run_id: str) -> None:
    rid = _normalize_text(run_id)
    if not rid:
        return
    with _EXTRACTION_ACTIVE_RUN_IDS_LOCK:
        _EXTRACTION_ACTIVE_RUN_IDS.add(rid)


def _unregister_extraction_active_run(run_id: str) -> None:
    rid = _normalize_text(run_id)
    if not rid:
        return
    with _EXTRACTION_ACTIVE_RUN_IDS_LOCK:
        _EXTRACTION_ACTIVE_RUN_IDS.discard(rid)


def _is_extraction_active_run(run_id: str) -> bool:
    rid = _normalize_text(run_id)
    if not rid:
        return False
    with _EXTRACTION_ACTIVE_RUN_IDS_LOCK:
        return rid in _EXTRACTION_ACTIVE_RUN_IDS

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
MAX_EXTRACTION_DOCS = 6
MAX_EXTRACTION_DOC_CHARS = 4000
MAX_EXTRACTION_ENTITIES = 360
MAX_EXTRACTION_RELATIONS = 360
EXTRACTION_LLM_MAX_TOKENS_DEFAULT = 32768
EXTRACTION_CONCURRENCY_DEFAULT = 3


def _resolve_extraction_llm_max_tokens() -> int:
    raw = os.getenv("EXTRACTION_LLM_MAX_TOKENS", "").strip()
    if not raw:
        return EXTRACTION_LLM_MAX_TOKENS_DEFAULT
    try:
        parsed = int(raw)
    except ValueError:
        return EXTRACTION_LLM_MAX_TOKENS_DEFAULT
    return max(4096, min(parsed, 65536))


def _resolve_extraction_concurrency() -> int:
    raw = os.getenv("EXTRACTION_CONCURRENCY", "").strip()
    if not raw:
        return EXTRACTION_CONCURRENCY_DEFAULT
    try:
        val = int(raw)
    except ValueError:
        return EXTRACTION_CONCURRENCY_DEFAULT
    return max(1, min(val, 10))

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


class _AiExtractionEntity(BaseModel):
    type: str
    name: str
    evidence: str = ""
    confidence: float = 0.0


class _AiExtractionRelation(BaseModel):
    relation: str
    domain_type: str = ""
    domain_name: str = ""
    range_type: str = ""
    range_name: str = ""
    evidence: str = ""
    confidence: float = 0.0


class _AiExtractionOutput(BaseModel):
    entities: list[_AiExtractionEntity] = Field(default_factory=list)
    relations: list[_AiExtractionRelation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

def _header_key(value: str | None) -> str:
    text = _normalize_text(value)
    return "".join(ch for ch in text.lower() if ch.isalnum())


def _safe_schema_name(value: str | None, *, fallback: str, max_len: int = 64) -> str:
    text = _normalize_text(value) or fallback
    text = " ".join(text.split())
    if not text:
        text = fallback
    if len(text) > max_len:
        text = text[:max_len]
    return text


def _find_header_index(header_keys: list[str], aliases: set[str]) -> int | None:
    for idx, key in enumerate(header_keys):
        if key in aliases:
            return idx
    return None


def _cell_text(row: list[str], index: int | None) -> str:
    if index is None:
        return ""
    if index < 0 or index >= len(row):
        return ""
    return _normalize_text(row[index])


def _build_unique_headers(row: list[str]) -> list[str]:
    headers: list[str] = []
    used: dict[str, int] = {}
    for idx, cell in enumerate(row):
        base = _normalize_text(cell) or f"column_{idx + 1}"
        count = used.get(base, 0) + 1
        used[base] = count
        if count > 1:
            headers.append(f"{base}_{count}")
        else:
            headers.append(base)
    return headers


def _is_empty_row(row: list[str]) -> bool:
    return all(not _normalize_text(cell) for cell in row)


def _is_truthy_text(value: str | None) -> bool:
    token = _normalize_text(value).lower()
    if not token:
        return False
    return token in {
        "1",
        "true",
        "yes",
        "y",
        "required",
        "notnull",
        "是",
        "必填",
        "非空",
    }


def _is_falsey_text(value: str | None) -> bool:
    token = _normalize_text(value).lower()
    if token == "":
        return True
    return token in {"0", "false", "no", "n", "nullable", "optional", "否", "可空"}


def _looks_like_int(value: str) -> bool:
    return bool(re.fullmatch(r"[-+]?\d+", value))


def _looks_like_float(value: str) -> bool:
    return bool(re.fullmatch(r"[-+]?\d+(\.\d+)?", value))


def _looks_like_date(value: str) -> bool:
    return bool(re.fullmatch(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}", value))


def _looks_like_datetime(value: str) -> bool:
    return bool(re.fullmatch(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]\d{1,2}:\d{1,2}(:\d{1,2})?", value))


def _looks_like_json(value: str) -> bool:
    text = value.strip()
    if not text:
        return False
    if not ((text.startswith("{") and text.endswith("}")) or (text.startswith("[") and text.endswith("]"))):
        return False
    try:
        json.loads(text)
        return True
    except json.JSONDecodeError:
        return False


def _infer_data_type_from_samples(values: list[str]) -> str:
    samples = [
        _normalize_text(value)
        for value in values
        if _normalize_text(value).lower() not in {"", "-", "null", "none", "nan"}
    ]
    if not samples:
        return "STRING"
    if all(_is_truthy_text(v) or _is_falsey_text(v) for v in samples):
        return "BOOLEAN"
    if all(_looks_like_int(v) for v in samples):
        return "INTEGER"
    if all(_looks_like_float(v) for v in samples):
        return "FLOAT"
    if all(_looks_like_datetime(v) for v in samples):
        return "DATETIME"
    if all(_looks_like_date(v) for v in samples):
        return "DATE"
    if all(_looks_like_json(v) for v in samples):
        return "JSON"
    if any(len(v) >= 80 for v in samples):
        return "TEXT"
    return "STRING"


def _infer_data_type_from_default(default_value: str) -> str:
    text = _normalize_text(default_value)
    if text in {"", "-", "—"}:
        return "STRING"
    if _is_truthy_text(text) or _is_falsey_text(text):
        return "BOOLEAN"
    if _looks_like_int(text):
        return "INTEGER"
    if _looks_like_float(text):
        return "FLOAT"
    if _looks_like_datetime(text):
        return "DATETIME"
    if _looks_like_date(text):
        return "DATE"
    if _looks_like_json(text):
        return "JSON"
    if len(text) >= 80:
        return "TEXT"
    return "STRING"


def _normalize_generated_properties(raw_properties: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    used_names: set[str] = set()
    for idx, item in enumerate(raw_properties):
        if not isinstance(item, dict):
            continue
        name = _safe_schema_name(item.get("name"), fallback=f"field_{idx + 1}")
        if name in used_names:
            continue
        used_names.add(name)

        data_type = str(item.get("data_type") or "STRING").upper()
        if data_type not in ALLOWED_PROPERTY_DATA_TYPES:
            data_type = "STRING"

        default_value = _normalize_text(item.get("default_value"))
        if default_value in {"-", "—"}:
            default_value = ""

        normalized.append(
            {
                "id": _normalize_text(item.get("id")) or _new_id("prop"),
                "name": name,
                "display_name": _safe_schema_name(item.get("display_name"), fallback=name),
                "data_type": data_type,
                "required": bool(item.get("required")),
                "default_value": default_value,
                "description": _normalize_text(item.get("description")),
                "sort_order": idx,
            }
        )
    return normalized


def _xlsx_col_index(ref: str) -> int:
    match = re.match(r"([A-Z]+)", ref.upper())
    if not match:
        return 0
    letters = match.group(1)
    result = 0
    for ch in letters:
        result = result * 26 + (ord(ch) - 64)
    return max(result - 1, 0)


def _xlsx_cell_value(cell: ElementTree.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        parts = [text.text or "" for text in cell.findall(".//{*}t")]
        return _normalize_text("".join(parts))

    raw_value = cell.findtext("{*}v") or ""
    if cell_type == "s":
        try:
            idx = int(raw_value)
        except (TypeError, ValueError):
            return ""
        if 0 <= idx < len(shared_strings):
            return _normalize_text(shared_strings[idx])
        return ""
    if cell_type == "b":
        return "TRUE" if raw_value in {"1", "true", "TRUE"} else "FALSE"
    return _normalize_text(raw_value)


def _xlsx_shared_strings(archive: ZipFile) -> list[str]:
    try:
        data = archive.read("xl/sharedStrings.xml")
    except KeyError:
        return []

    root = ElementTree.fromstring(data)
    values: list[str] = []
    for item in root.findall(".//{*}si"):
        parts = [part.text or "" for part in item.findall(".//{*}t")]
        values.append("".join(parts))
    return values


def _xlsx_sheet_paths(archive: ZipFile) -> list[tuple[str, str]]:
    workbook_xml = archive.read("xl/workbook.xml")
    rels_xml = archive.read("xl/_rels/workbook.xml.rels")
    workbook_root = ElementTree.fromstring(workbook_xml)
    rels_root = ElementTree.fromstring(rels_xml)

    rid_to_target: dict[str, str] = {}
    for rel in rels_root.findall(".//{*}Relationship"):
        rid = rel.attrib.get("Id")
        target = rel.attrib.get("Target")
        if rid and target:
            rid_to_target[rid] = target

    result: list[tuple[str, str]] = []
    for sheet in workbook_root.findall(".//{*}sheet"):
        name = _normalize_text(sheet.attrib.get("name")) or "Sheet"
        rid = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        if not rid:
            continue
        target = rid_to_target.get(rid)
        if not target:
            continue
        if target.startswith("/"):
            full_path = posixpath.normpath(target.lstrip("/"))
        else:
            full_path = posixpath.normpath(posixpath.join("xl", target))
        result.append((name, full_path))
    return result


def _xlsx_sheet_rows(archive: ZipFile, path: str, shared_strings: list[str]) -> list[list[str]]:
    sheet_xml = archive.read(path)
    root = ElementTree.fromstring(sheet_xml)
    rows: list[list[str]] = []
    for row in root.findall(".//{*}sheetData/{*}row"):
        values_by_idx: dict[int, str] = {}
        max_idx = -1
        fallback_idx = 0
        for cell in row.findall("{*}c"):
            ref = cell.attrib.get("r") or ""
            col_idx = _xlsx_col_index(ref) if ref else fallback_idx
            fallback_idx = col_idx + 1
            value = _xlsx_cell_value(cell, shared_strings)
            values_by_idx[col_idx] = value
            max_idx = max(max_idx, col_idx)
        if max_idx < 0:
            continue
        row_values = ["" for _ in range(max_idx + 1)]
        for idx, value in values_by_idx.items():
            row_values[idx] = value
        if _is_empty_row(row_values):
            continue
        rows.append(row_values)
    return rows


def _parse_xlsx_tables(content: bytes) -> list[dict[str, Any]]:
    try:
        with ZipFile(BytesIO(content)) as archive:
            shared_strings = _xlsx_shared_strings(archive)
            sheets = _xlsx_sheet_paths(archive)
            tables: list[dict[str, Any]] = []
            for sheet_name, sheet_path in sheets:
                try:
                    rows = _xlsx_sheet_rows(archive, sheet_path, shared_strings)
                except KeyError:
                    continue
                tables.append(
                    {
                        "name": sheet_name,
                        "rows": rows,
                    }
                )
            if not tables:
                raise ValueError("xlsx 中未找到可读取的工作表")
            return tables
    except (BadZipFile, KeyError, ElementTree.ParseError) as exc:
        raise ValueError(f"xlsx 解析失败: {exc}") from exc


def _sheet_with_headers(table: dict[str, Any]) -> dict[str, Any] | None:
    rows = table.get("rows") or []
    if not isinstance(rows, list):
        return None
    header_idx = None
    for idx, row in enumerate(rows[:10]):
        if isinstance(row, list) and not _is_empty_row([_normalize_text(str(cell)) for cell in row]):
            header_idx = idx
            break
    if header_idx is None:
        return None

    raw_header = rows[header_idx] if isinstance(rows[header_idx], list) else []
    header = _build_unique_headers([_normalize_text(str(cell)) for cell in raw_header])
    if not header:
        return None

    normalized_rows: list[list[str]] = []
    for raw in rows[header_idx + 1 :]:
        if not isinstance(raw, list):
            continue
        row = [_normalize_text(str(cell)) for cell in raw]
        if len(row) < len(header):
            row.extend([""] * (len(header) - len(row)))
        else:
            row = row[: len(header)]
        if _is_empty_row(row):
            continue
        normalized_rows.append(row)
    return {
        "sheet_name": _normalize_text(table.get("name")) or "Sheet",
        "header": header,
        "header_keys": [_header_key(item) for item in header],
        "rows": normalized_rows,
        "header_row_no": header_idx + 1,
    }


def _parse_entity_schema_sheet(sheet: dict[str, Any]) -> list[dict[str, Any]]:
    header_keys = sheet["header_keys"]
    entity_idx = _find_header_index(header_keys, ENTITY_HEADER_ALIASES)
    prop_idx = _find_header_index(header_keys, PROPERTY_NAME_HEADER_ALIASES)
    if entity_idx is None or prop_idx is None:
        return []

    desc_idx = _find_header_index(header_keys, ENTITY_DESC_HEADER_ALIASES)
    nullable_idx = _find_header_index(header_keys, PROPERTY_NULLABLE_HEADER_ALIASES)
    default_idx = _find_header_index(header_keys, PROPERTY_DEFAULT_HEADER_ALIASES)
    prop_desc_idx = _find_header_index(header_keys, PROPERTY_DESC_HEADER_ALIASES)

    nullable_mode = False
    if nullable_idx is not None:
        nullable_key = header_keys[nullable_idx]
        nullable_mode = "nullable" in nullable_key or "可为空" in nullable_key

    entities: dict[str, dict[str, Any]] = {}
    current_entity = ""
    current_desc = ""
    for row_no_offset, row in enumerate(sheet["rows"]):
        row_no = sheet["header_row_no"] + row_no_offset + 1
        row_entity = _cell_text(row, entity_idx)
        row_desc = _cell_text(row, desc_idx)
        if row_entity:
            current_entity = _safe_schema_name(row_entity, fallback="Entity")
        if row_desc:
            current_desc = row_desc
        if not current_entity:
            continue

        entity = entities.setdefault(
            current_entity,
            {
                "name": current_entity,
                "description": current_desc,
                "properties": [],
                "_prop_names": set(),
            },
        )
        if current_desc and not entity["description"]:
            entity["description"] = current_desc

        prop_name = _cell_text(row, prop_idx)
        if not prop_name:
            continue
        prop_name = _safe_schema_name(prop_name, fallback=f"field_{row_no}")
        if prop_name in entity["_prop_names"]:
            continue
        entity["_prop_names"].add(prop_name)

        required = False
        nullable_value = _cell_text(row, nullable_idx)
        if nullable_idx is not None:
            required = not _is_truthy_text(nullable_value) if nullable_mode else _is_truthy_text(nullable_value)

        default_value = _cell_text(row, default_idx)
        data_type = _infer_data_type_from_default(default_value)
        prop_desc = _cell_text(row, prop_desc_idx)
        entity["properties"].append(
            {
                "name": prop_name,
                "display_name": prop_name,
                "data_type": data_type,
                "required": required,
                "default_value": "" if default_value in {"-", "—"} else default_value,
                "description": prop_desc,
            }
        )

    result: list[dict[str, Any]] = []
    for item in entities.values():
        item.pop("_prop_names", None)
        result.append(item)
    return result


def _parse_relation_schema_sheet(sheet: dict[str, Any]) -> list[dict[str, Any]]:
    header_keys = sheet["header_keys"]
    relation_idx = _find_header_index(header_keys, RELATION_HEADER_ALIASES)
    source_idx = _find_header_index(header_keys, RELATION_SOURCE_HEADER_ALIASES)
    target_idx = _find_header_index(header_keys, RELATION_TARGET_HEADER_ALIASES)
    if relation_idx is None or source_idx is None or target_idx is None:
        return []

    desc_idx = _find_header_index(header_keys, RELATION_DESC_HEADER_ALIASES)
    prop_idx = _find_header_index(header_keys, PROPERTY_NAME_HEADER_ALIASES)
    nullable_idx = _find_header_index(header_keys, PROPERTY_NULLABLE_HEADER_ALIASES)
    default_idx = _find_header_index(header_keys, PROPERTY_DEFAULT_HEADER_ALIASES)
    prop_desc_idx = _find_header_index(header_keys, PROPERTY_DESC_HEADER_ALIASES)

    nullable_mode = False
    if nullable_idx is not None:
        nullable_key = header_keys[nullable_idx]
        nullable_mode = "nullable" in nullable_key or "可为空" in nullable_key

    relations: dict[tuple[str, str, str], dict[str, Any]] = {}
    current_name = ""
    current_desc = ""
    current_source = ""
    current_target = ""
    for row_no_offset, row in enumerate(sheet["rows"]):
        row_no = sheet["header_row_no"] + row_no_offset + 1
        raw_name = _cell_text(row, relation_idx)
        raw_desc = _cell_text(row, desc_idx)
        raw_source = _cell_text(row, source_idx)
        raw_target = _cell_text(row, target_idx)
        if raw_name:
            current_name = _safe_schema_name(raw_name, fallback=f"relation_{row_no}")
        if raw_desc:
            current_desc = raw_desc
        if raw_source:
            current_source = _safe_schema_name(raw_source, fallback="EntityA")
        if raw_target:
            current_target = _safe_schema_name(raw_target, fallback="EntityB")
        if not current_name or not current_source or not current_target:
            continue

        key = (current_name, current_source, current_target)
        relation = relations.setdefault(
            key,
            {
                "name": current_name,
                "description": current_desc,
                "domain": current_source,
                "range": current_target,
                "properties": [],
                "_prop_names": set(),
            },
        )
        if current_desc and not relation["description"]:
            relation["description"] = current_desc

        if prop_idx is None:
            continue
        prop_name = _cell_text(row, prop_idx)
        if not prop_name:
            continue
        prop_name = _safe_schema_name(prop_name, fallback=f"field_{row_no}")
        if prop_name in relation["_prop_names"]:
            continue
        relation["_prop_names"].add(prop_name)

        required = False
        nullable_value = _cell_text(row, nullable_idx)
        if nullable_idx is not None:
            required = not _is_truthy_text(nullable_value) if nullable_mode else _is_truthy_text(nullable_value)

        default_value = _cell_text(row, default_idx)
        data_type = _infer_data_type_from_default(default_value)
        prop_desc = _cell_text(row, prop_desc_idx)
        relation["properties"].append(
            {
                "name": prop_name,
                "display_name": prop_name,
                "data_type": data_type,
                "required": required,
                "default_value": "" if default_value in {"-", "—"} else default_value,
                "description": prop_desc,
            }
        )

    result: list[dict[str, Any]] = []
    for item in relations.values():
        item.pop("_prop_names", None)
        result.append(item)
    return result


def _choose_primary_key(headers: list[str]) -> str:
    for header in headers:
        key = _header_key(header)
        if key in {"id", "编号", "编码"} or key.endswith("id") or key.endswith("编号") or key.endswith("编码"):
            return header
    return headers[0]


def _parse_data_sheet(sheet: dict[str, Any], *, source_name: str) -> dict[str, Any]:
    headers = list(sheet["header"])
    rows = sheet["rows"][:MAX_XLSX_ROWS_PER_SHEET]
    if not headers:
        return {}

    entity_name = _safe_schema_name(sheet["sheet_name"], fallback="Sheet")
    primary_key = _choose_primary_key(headers)
    id_lookup: dict[str, str] = {}
    label_lookup: dict[str, str] = {}
    records: list[dict[str, Any]] = []
    sample_values: dict[str, list[str]] = {header: [] for header in headers}

    for offset, row in enumerate(rows):
        row_no = sheet["header_row_no"] + offset + 1
        values = {headers[idx]: _cell_text(row, idx) for idx in range(len(headers))}
        if all(not value for value in values.values()):
            continue

        for header in headers:
            value = _normalize_text(values.get(header))
            if value:
                sample_values[header].append(value)

        primary_value = _normalize_text(values.get(primary_key))
        if not primary_value:
            for header in headers:
                if _normalize_text(values.get(header)):
                    primary_value = _normalize_text(values.get(header))
                    break
        if not primary_value:
            primary_value = f"row_{row_no}"

        lookup_key = _header_key(primary_value)
        id_lookup[lookup_key] = primary_value
        label_lookup[_header_key(primary_value)] = primary_value
        records.append(
            {
                "row_no": row_no,
                "label": primary_value,
                "values": values,
            }
        )

    properties: list[dict[str, Any]] = []
    for idx, header in enumerate(headers):
        prop_name = _safe_schema_name(header, fallback=f"column_{idx + 1}")
        samples = sample_values.get(header, [])
        properties.append(
            {
                "name": prop_name,
                "display_name": prop_name,
                "data_type": _infer_data_type_from_samples(samples),
                "required": bool(samples) and len(samples) == len(records),
                "default_value": "",
                "description": f"来自工作表 {sheet['sheet_name']} 列 {header}",
            }
        )

    return {
        "entity_name": entity_name,
        "sheet_name": sheet["sheet_name"],
        "primary_key": primary_key,
        "records": records,
        "headers": headers,
        "id_lookup": id_lookup,
        "label_lookup": label_lookup,
        "properties": properties,
        "source_name": source_name,
    }


def _relation_name_from_column(source: str, column: str, target: str) -> str:
    base = _safe_schema_name(column, fallback="")
    if not base:
        base = "关联"
    return _safe_schema_name(f"{source}_{base}_to_{target}", fallback=f"{source}_to_{target}")


def _match_target_sheet(column: str, source_table: dict[str, Any], all_tables: list[dict[str, Any]]) -> dict[str, Any] | None:
    col_key = _header_key(column)
    if not col_key or col_key in {"id", "name", "名称", "备注"}:
        return None

    for table in all_tables:
        if table["entity_name"] == source_table["entity_name"]:
            continue
        entity_key = _header_key(table["entity_name"])
        if not entity_key:
            continue
        if col_key in {
            entity_key,
            f"{entity_key}id",
            f"{entity_key}编号",
            f"{entity_key}编码",
        }:
            return table
        if col_key.startswith(entity_key) and (
            col_key.endswith("id") or col_key.endswith("编号") or col_key.endswith("编码")
        ):
            return table
    return None


def _build_xlsx_analysis(source_name: str, tables: list[dict[str, Any]]) -> dict[str, Any]:
    parsed_sheets = [item for item in (_sheet_with_headers(table) for table in tables) if item]
    entity_templates: list[dict[str, Any]] = []
    relation_templates: list[dict[str, Any]] = []
    entity_instances: list[dict[str, Any]] = []
    relation_instances: list[dict[str, Any]] = []
    data_tables: list[dict[str, Any]] = []

    for sheet in parsed_sheets:
        entity_sheet_rows = _parse_entity_schema_sheet(sheet)
        if entity_sheet_rows:
            entity_templates.extend(entity_sheet_rows)
            continue

        relation_sheet_rows = _parse_relation_schema_sheet(sheet)
        if relation_sheet_rows:
            relation_templates.extend(relation_sheet_rows)
            continue

        data_table = _parse_data_sheet(sheet, source_name=source_name)
        if not data_table:
            continue
        data_tables.append(data_table)
        entity_templates.append(
            {
                "name": data_table["entity_name"],
                "description": f"来自 {source_name} / {data_table['sheet_name']}",
                "properties": data_table["properties"],
            }
        )
        for row in data_table["records"]:
            entity_instances.append(
                {
                    "type": data_table["entity_name"],
                    "name": row["label"],
                    "evidence": f"{source_name} · {data_table['sheet_name']} 第 {row['row_no']} 行",
                }
            )

    relation_template_keys: set[tuple[str, str, str]] = {
        (_safe_schema_name(item.get("name"), fallback="relation"), item.get("domain") or "", item.get("range") or "")
        for item in relation_templates
    }
    relation_instance_keys: set[tuple[str, str, str, str, str]] = set()
    for source_table in data_tables:
        for column in source_table["headers"]:
            if column == source_table["primary_key"]:
                continue
            target_table = _match_target_sheet(column, source_table, data_tables)
            if not target_table:
                continue

            relation_name = _relation_name_from_column(
                source=source_table["entity_name"],
                column=column,
                target=target_table["entity_name"],
            )
            template_key = (relation_name, source_table["entity_name"], target_table["entity_name"])
            if template_key not in relation_template_keys:
                relation_template_keys.add(template_key)
                relation_templates.append(
                    {
                        "name": relation_name,
                        "description": f"由 {source_table['sheet_name']}.{column} 推断",
                        "domain": source_table["entity_name"],
                        "range": target_table["entity_name"],
                        "properties": [],
                    }
                )

            for row in source_table["records"]:
                fk_value = _normalize_text(row["values"].get(column))
                if not fk_value:
                    continue
                target_label = target_table["id_lookup"].get(_header_key(fk_value))
                if not target_label:
                    continue
                key = (
                    source_table["entity_name"],
                    row["label"],
                    relation_name,
                    target_table["entity_name"],
                    target_label,
                )
                if key in relation_instance_keys:
                    continue
                relation_instance_keys.add(key)
                relation_instances.append(
                    {
                        "domain_type": source_table["entity_name"],
                        "domain_name": row["label"],
                        "relation": relation_name,
                        "range_type": target_table["entity_name"],
                        "range_name": target_label,
                        "evidence": (
                            f"{source_table['source_name']} · {source_table['sheet_name']} "
                            f"第 {row['row_no']} 行字段 {column} 指向 {target_table['sheet_name']}"
                        ),
                    }
                )

    if not entity_instances and entity_templates:
        for template in entity_templates:
            entity_name = _safe_schema_name(template.get("name"), fallback="Entity")
            entity_instances.append(
                {
                    "type": entity_name,
                    "name": "样例",
                    "evidence": f"{source_name} 提供实体定义",
                }
            )

    if not relation_instances and relation_templates:
        for template in relation_templates:
            domain_name = _safe_schema_name(template.get("domain"), fallback="EntityA")
            range_name = _safe_schema_name(template.get("range"), fallback="EntityB")
            relation_instances.append(
                {
                    "domain_type": domain_name,
                    "domain_name": "样例",
                    "relation": _safe_schema_name(template.get("name"), fallback="related_to"),
                    "range_type": range_name,
                    "range_name": "样例",
                    "evidence": f"{source_name} 提供关系定义",
                }
            )

    return {
        "entity_templates": entity_templates,
        "relation_templates": relation_templates,
        "entity_instances": entity_instances,
        "relation_instances": relation_instances,
    }


def _merge_entity_template(target_map: dict[str, dict[str, Any]], template: dict[str, Any]) -> None:
    name = _safe_schema_name(template.get("name"), fallback="Entity")
    if not name:
        return
    row = target_map.setdefault(
        name,
        {
            "name": name,
            "description": _normalize_text(template.get("description")),
            "properties": [],
            "_prop_names": set(),
        },
    )
    if not row["description"]:
        row["description"] = _normalize_text(template.get("description"))

    for prop in _normalize_generated_properties(template.get("properties") or []):
        if prop["name"] in row["_prop_names"]:
            continue
        row["_prop_names"].add(prop["name"])
        row["properties"].append(prop)


def _collect_xlsx_insight_inputs(enabled_docs: list[ProjectDocument]) -> dict[str, Any]:
    entity_map: dict[str, dict[str, Any]] = {}
    relation_rows: list[dict[str, Any]] = []
    entity_instances: list[dict[str, Any]] = []
    relation_instances: list[dict[str, Any]] = []

    for doc in enabled_docs:
        if str(doc.file_type or "").lower() != "xlsx":
            continue
        if not doc.storage_path:
            continue
        path = Path(doc.storage_path)
        if not path.exists():
            continue
        try:
            tables = _parse_xlsx_tables(path.read_bytes())
        except ValueError as exc:
            raise ValueError(f"{doc.name} 解析失败：{exc}") from exc

        analysis = _build_xlsx_analysis(doc.name, tables)
        for template in analysis["entity_templates"]:
            _merge_entity_template(entity_map, template)
        relation_rows.extend(analysis["relation_templates"])
        entity_instances.extend(analysis["entity_instances"])
        relation_instances.extend(analysis["relation_instances"])

    entities: list[dict[str, Any]] = []
    for item in entity_map.values():
        item.pop("_prop_names", None)
        entities.append(item)
    return {
        "entity_templates": entities,
        "relation_templates": relation_rows,
        "entity_instances": entity_instances,
        "relation_instances": relation_instances,
    }


def _extract_json_from_text(text: str) -> str:
    if not text:
        return "{}"
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start : end + 1]
    return text


def _resolve_instance_llm_config() -> dict[str, str] | None:
    api_key = _normalize_text(os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY"))
    base_url = _normalize_text(os.getenv("LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL"))
    model = _normalize_text(os.getenv("LLM_MODEL") or os.getenv("OPENAI_MODEL"))
    if not api_key or not base_url or not model:
        return None
    return {"api_key": api_key, "base_url": base_url.rstrip("/"), "model": model}


def _read_docx_text(path: Path) -> str:
    try:
        with ZipFile(path) as archive:
            data = archive.read("word/document.xml")
    except (OSError, BadZipFile, KeyError) as exc:
        raise ValueError(f"{path.name} docx 解析失败：{exc}") from exc

    try:
        root = ElementTree.fromstring(data)
    except ElementTree.ParseError as exc:
        raise ValueError(f"{path.name} docx 解析失败：{exc}") from exc

    parts: list[str] = []
    for node in root.findall(".//{*}t"):
        text = _normalize_text(node.text)
        if text:
            parts.append(text)
    return "\n".join(parts)


def _read_document_text_for_extraction(doc: ProjectDocument) -> str:
    file_type = str(doc.file_type or "").lower()
    if file_type not in {"md", "docx"}:
        return ""
    if not doc.storage_path:
        return ""

    path = Path(doc.storage_path)
    if not path.exists():
        return ""
    if file_type == "md":
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return ""
    if file_type == "docx":
        return _read_docx_text(path)
    return ""


def _build_extraction_document_payload(
    enabled_docs: list[ProjectDocument],
    *,
    xlsx_inputs: dict[str, Any],
) -> dict[str, Any]:
    documents: list[dict[str, Any]] = []
    for doc in enabled_docs:
        text = _normalize_text(_read_document_text_for_extraction(doc))
        if not text:
            continue
        documents.append(
            {
                "id": doc.id,
                "name": doc.name,
                "file_type": str(doc.file_type or "").lower(),
                "content": text[:MAX_EXTRACTION_DOC_CHARS],
            }
        )
        if len(documents) >= MAX_EXTRACTION_DOCS:
            break

    xlsx_entity_seed = []
    for item in (xlsx_inputs.get("entity_instances") or [])[:120]:
        if not isinstance(item, dict):
            continue
        xlsx_entity_seed.append(
            {
                "type": _safe_schema_name(item.get("type"), fallback=""),
                "name": _safe_schema_name(item.get("name"), fallback="", max_len=255),
                "evidence": _normalize_text(item.get("evidence")),
            }
        )

    xlsx_relation_seed = []
    for item in (xlsx_inputs.get("relation_instances") or [])[:120]:
        if not isinstance(item, dict):
            continue
        xlsx_relation_seed.append(
            {
                "relation": _safe_schema_name(item.get("relation"), fallback=""),
                "domain_type": _safe_schema_name(item.get("domain_type"), fallback=""),
                "domain_name": _safe_schema_name(item.get("domain_name"), fallback="", max_len=255),
                "range_type": _safe_schema_name(item.get("range_type"), fallback=""),
                "range_name": _safe_schema_name(item.get("range_name"), fallback="", max_len=255),
                "evidence": _normalize_text(item.get("evidence")),
            }
        )

    return {
        "documents": documents,
        "xlsx_entity_seed": xlsx_entity_seed,
        "xlsx_relation_seed": xlsx_relation_seed,
    }


def _build_extraction_schema_payload(
    db: Session,
    *,
    project_id: str,
    entity_rows: list[EntityType],
    relation_rows: list[RelationType],
    entity_name_by_id: dict[str, str],
) -> dict[str, Any]:
    prop_rows = (
        db.query(SchemaProperty)
        .filter(SchemaProperty.project_id == project_id)
        .order_by(SchemaProperty.owner_kind, SchemaProperty.owner_id, SchemaProperty.sort_order)
        .all()
    )
    props_by_owner: dict[tuple[str, str], list[SchemaProperty]] = {}
    for row in prop_rows:
        props_by_owner.setdefault((row.owner_kind, row.owner_id), []).append(row)

    entity_types: list[dict[str, Any]] = []
    for entity in entity_rows:
        entity_types.append(
            {
                "name": entity.name,
                "description": entity.description or "",
                "properties": [
                    {
                        "name": prop.name,
                        "data_type": prop.data_type,
                        "required": bool(prop.required),
                    }
                    for prop in props_by_owner.get((OWNER_KIND_ENTITY, entity.id), [])
                ],
            }
        )

    relation_types: list[dict[str, Any]] = []
    for relation in relation_rows:
        relation_types.append(
            {
                "name": relation.name,
                "description": relation.description or "",
                "domain": entity_name_by_id.get(relation.domain_entity_type_id, ""),
                "range": entity_name_by_id.get(relation.range_entity_type_id, ""),
                "properties": [
                    {
                        "name": prop.name,
                        "data_type": prop.data_type,
                        "required": bool(prop.required),
                    }
                    for prop in props_by_owner.get((OWNER_KIND_RELATION, relation.id), [])
                ],
            }
        )

    return {
        "entity_types": entity_types,
        "relation_types": relation_types,
    }


def _run_ai_instance_extraction_llm(
    *,
    project: Project,
    enabled_docs: list[ProjectDocument],
    schema_payload: dict[str, Any],
    document_payload: dict[str, Any],
    xlsx_inputs: dict[str, Any],
) -> dict[str, Any]:
    llm_cfg = _resolve_instance_llm_config()
    if llm_cfg is None:
        raise ValueError("模型配置缺失")
    if not document_payload.get("documents") and not document_payload.get("xlsx_entity_seed"):
        return {"entities": [], "relations": [], "warnings": ["缺少可供抽取的文档内容"]}

    developer_prompt = (
        "你是工业知识图谱实例抽取助手。"
        "任务：基于输入文档和给定 schema 提取实体实例与关系实例。"
        "必须严格遵守 schema 中的实体类型与关系类型，禁止创造 schema 外的类型。"
        "输出必须是 JSON 对象，且只包含 entities、relations、warnings 三个字段。"
        "entities[*] 字段：type,name,evidence,confidence。"
        "relations[*] 字段：relation,domain_type,domain_name,range_type,range_name,evidence,confidence。"
        "confidence 必须在 [0,1]。"
        "不要输出 markdown、解释文字或代码块。"
    )
    user_prompt = json.dumps(
        {
            "project": {
                "id": project.id,
                "name": project.name,
                "description": project.description or "",
            },
            "enabled_documents": [
                {
                    "id": doc.id,
                    "name": doc.name,
                    "file_type": str(doc.file_type or "").lower(),
                }
                for doc in enabled_docs
            ],
            "schema": schema_payload,
            "document_context": document_payload,
            "xlsx_inputs_summary": {
                "entity_template_count": len(xlsx_inputs.get("entity_templates") or []),
                "relation_template_count": len(xlsx_inputs.get("relation_templates") or []),
                "entity_instance_count": len(xlsx_inputs.get("entity_instances") or []),
                "relation_instance_count": len(xlsx_inputs.get("relation_instances") or []),
            },
            "output_schema_hint": {
                "entities": [
                    {
                        "type": "Person",
                        "name": "张三",
                        "evidence": "文档中的证据片段",
                        "confidence": 0.92,
                    }
                ],
                "relations": [
                    {
                        "relation": "works_for",
                        "domain_type": "Person",
                        "domain_name": "张三",
                        "range_type": "Org",
                        "range_name": "华星科技",
                        "evidence": "关系证据片段",
                        "confidence": 0.88,
                    }
                ],
                "warnings": [],
            },
        },
        ensure_ascii=False,
    )

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise ValueError("缺少 openai 依赖，无法调用模型抽取") from exc

    client = OpenAI(api_key=llm_cfg["api_key"], base_url=llm_cfg["base_url"])
    max_tokens = _resolve_extraction_llm_max_tokens()

    last_exc: Exception | None = None
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model=llm_cfg["model"],
                messages=[
                    {"role": "system", "content": developer_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
            )
            last_exc = None
            break
        except Exception as exc:
            last_exc = exc
            if attempt == 0:
                logger.warning("模型抽取调用第 1 次失败，重试一次：%s", exc)
    if last_exc is not None:
        raise ValueError(f"模型抽取调用失败：{last_exc}") from last_exc

    text = _normalize_text(response.choices[0].message.content)
    if not text:
        raise ValueError("模型未返回可解析内容")

    json_text = _extract_json_from_text(text)
    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError as exc:
        if not text.rstrip().endswith("}"):
            raise ValueError(
                "模型抽取输出疑似被截断，JSON 未闭合；请减少文档内容或提高 EXTRACTION_LLM_MAX_TOKENS"
            ) from exc
        raise ValueError("模型抽取输出不是合法 JSON") from exc
    if not isinstance(parsed, dict):
        raise ValueError("模型输出格式不正确，根节点必须是对象")
    return parsed


def _confidence_or_none(value: Any) -> float | None:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return None
    if confidence < 0 or confidence > 1:
        return None
    return round(confidence, 4)


def _parse_ai_instance_extraction_output(
    *,
    raw_output: dict[str, Any],
    schema_payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        extraction = _AiExtractionOutput.model_validate(raw_output)
    except ValidationError as exc:
        first_error = exc.errors()[0] if exc.errors() else {"msg": "未知错误"}
        raise ValueError(f"模型抽取输出字段不符合要求：{first_error.get('msg', '未知错误')}") from exc

    allowed_entity_types = {
        _safe_schema_name(item.get("name"), fallback="")
        for item in (schema_payload.get("entity_types") or [])
        if isinstance(item, dict)
    }
    relation_rules: dict[str, tuple[str, str]] = {}
    for item in (schema_payload.get("relation_types") or []):
        if not isinstance(item, dict):
            continue
        name = _safe_schema_name(item.get("name"), fallback="")
        domain = _safe_schema_name(item.get("domain"), fallback="")
        range_ = _safe_schema_name(item.get("range"), fallback="")
        if name and domain and range_:
            relation_rules[name] = (domain, range_)

    warnings = [_normalize_text(w) for w in extraction.warnings if _normalize_text(w)]
    entities_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    relations_by_key: dict[tuple[str, str, str, str, str], dict[str, Any]] = {}

    for entity in extraction.entities[:MAX_EXTRACTION_ENTITIES]:
        type_name = _safe_schema_name(entity.type, fallback="")
        entity_name = _safe_schema_name(entity.name, fallback="", max_len=255)
        if not type_name or not entity_name:
            warnings.append("存在缺少实体类型或名称的实体候选，已忽略")
            continue
        if type_name not in allowed_entity_types:
            warnings.append(f"实体类型 {type_name} 不在 schema 中，已忽略")
            continue
        confidence = _confidence_or_none(entity.confidence)
        if confidence is None:
            warnings.append(f"实体 {type_name}::{entity_name} 置信度非法，已忽略")
            continue
        key = (type_name, entity_name)
        if key in entities_by_key:
            continue
        entities_by_key[key] = {
            "type": type_name,
            "name": entity_name,
            "evidence": _normalize_text(entity.evidence),
            "confidence": confidence,
        }

    for relation in extraction.relations[:MAX_EXTRACTION_RELATIONS]:
        relation_name = _safe_schema_name(relation.relation, fallback="")
        if not relation_name:
            warnings.append("存在缺少关系类型名称的关系候选，已忽略")
            continue
        rule = relation_rules.get(relation_name)
        if not rule:
            warnings.append(f"关系类型 {relation_name} 不在 schema 中，已忽略")
            continue

        domain_type = _safe_schema_name(relation.domain_type, fallback=rule[0])
        range_type = _safe_schema_name(relation.range_type, fallback=rule[1])
        if domain_type != rule[0] or range_type != rule[1]:
            warnings.append(f"关系 {relation_name} 的 domain/range 与 schema 不一致，已忽略")
            continue

        domain_name = _safe_schema_name(relation.domain_name, fallback="", max_len=255)
        range_name = _safe_schema_name(relation.range_name, fallback="", max_len=255)
        if not domain_name or not range_name:
            warnings.append(f"关系 {relation_name} 缺少端点实体名称，已忽略")
            continue

        confidence = _confidence_or_none(relation.confidence)
        if confidence is None:
            warnings.append(f"关系 {relation_name} 置信度非法，已忽略")
            continue

        for endpoint_type, endpoint_name in ((domain_type, domain_name), (range_type, range_name)):
            key = (endpoint_type, endpoint_name)
            if key in entities_by_key:
                continue
            entities_by_key[key] = {
                "type": endpoint_type,
                "name": endpoint_name,
                "evidence": _normalize_text(relation.evidence) or f"由关系 {relation_name} 端点推断",
                "confidence": round(max(min(confidence - 0.05, 1.0), 0.0), 4),
            }

        relation_key = (domain_type, domain_name, relation_name, range_type, range_name)
        if relation_key in relations_by_key:
            continue
        relations_by_key[relation_key] = {
            "relation": relation_name,
            "domain_type": domain_type,
            "domain_name": domain_name,
            "range_type": range_type,
            "range_name": range_name,
            "evidence": _normalize_text(relation.evidence),
            "confidence": confidence,
        }

    return {
        "entity_instances": list(entities_by_key.values()),
        "relation_instances": list(relations_by_key.values()),
        "warnings": warnings,
    }


def _generate_ai_review_items_for_run(
    db: Session,
    *,
    project: Project,
    run_id: str,
    enabled_docs: list[ProjectDocument],
    entity_rows: list[EntityType],
    relation_rows: list[RelationType],
    entity_name_by_id: dict[str, str],
    xlsx_inputs: dict[str, Any],
    now: datetime,
    run: ExtractionRun | None = None,
) -> list[ReviewItem]:
    if not enabled_docs:
        return []
    if _resolve_instance_llm_config() is None:
        if run is not None:
            _set_run_runtime_meta(run, append_log="模型配置缺失，跳过模型抽取。")
        return []

    schema_payload = _build_extraction_schema_payload(
        db,
        project_id=project.id,
        entity_rows=entity_rows,
        relation_rows=relation_rows,
        entity_name_by_id=entity_name_by_id,
    )
    total_docs = len(enabled_docs)
    if run is not None:
        _set_run_runtime_meta(
            run,
            stage="EXTRACTING",
            current_document="",
            append_log=f"开始并发抽取，共 {total_docs} 个文档，并发度 {_resolve_extraction_concurrency()}。",
            processed_documents=0,
            total_documents=total_docs,
        )
        run.progress = 1
        run.updated_at = _now()
        db.commit()

    entity_instances_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    relation_instances_by_key: dict[tuple[str, str, str, str, str], dict[str, Any]] = {}
    merge_lock = threading.Lock()
    processed_count = 0

    def _extract_single_doc(
        idx: int, doc: ProjectDocument
    ) -> tuple[int, str, list[dict[str, Any]], list[dict[str, Any]], str | None]:
        """在线程中执行单个文档的 LLM 抽取，返回 (idx, doc.name, entities, relations, error_msg)"""
        doc_xlsx_inputs = _collect_xlsx_insight_inputs([doc])
        document_payload = _build_extraction_document_payload([doc], xlsx_inputs=doc_xlsx_inputs)
        if not document_payload.get("documents") and not document_payload.get("xlsx_entity_seed"):
            return idx, doc.name, [], [], "SKIP"
        try:
            raw_output = _run_ai_instance_extraction_llm(
                project=project,
                enabled_docs=[doc],
                schema_payload=schema_payload,
                document_payload=document_payload,
                xlsx_inputs=doc_xlsx_inputs,
            )
            parsed_output = _parse_ai_instance_extraction_output(
                raw_output=raw_output,
                schema_payload=schema_payload,
            )
            return idx, doc.name, parsed_output["entity_instances"], parsed_output["relation_instances"], None
        except ValueError as exc:
            return idx, doc.name, [], [], str(exc)

    concurrency = _resolve_extraction_concurrency()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        future_to_doc = {
            executor.submit(_extract_single_doc, idx, doc): (idx, doc)
            for idx, doc in enumerate(enabled_docs)
        }
        for future in concurrent.futures.as_completed(future_to_doc):
            idx, doc_name, entity_list, relation_list, error_msg = future.result()

            with merge_lock:
                processed_count += 1
                done = processed_count

                if error_msg == "SKIP":
                    if run is not None:
                        _set_run_runtime_meta(run, append_log=f"跳过文档 {doc_name}：无可抽取内容。")
                        run.updated_at = _now()
                        db.commit()
                    continue

                if error_msg is not None:
                    if run is not None:
                        _set_run_runtime_meta(run, append_log=f"文档 {doc_name} 抽取失败：{error_msg}")
                        run.updated_at = _now()
                        db.commit()
                    continue

                entity_delta = 0
                relation_delta = 0
                for item in entity_list:
                    entity_type = _safe_schema_name(item.get("type"), fallback="")
                    entity_name = _safe_schema_name(item.get("name"), fallback="", max_len=255)
                    if not entity_type or not entity_name:
                        continue
                    key = (entity_type, entity_name)
                    if key in entity_instances_by_key:
                        continue
                    payload = dict(item)
                    payload["source_document"] = doc_name
                    entity_instances_by_key[key] = payload
                    entity_delta += 1

                for item in relation_list:
                    relation_name = _safe_schema_name(item.get("relation"), fallback="")
                    domain_type = _safe_schema_name(item.get("domain_type"), fallback="")
                    range_type = _safe_schema_name(item.get("range_type"), fallback="")
                    domain_name = _safe_schema_name(item.get("domain_name"), fallback="", max_len=255)
                    range_name = _safe_schema_name(item.get("range_name"), fallback="", max_len=255)
                    if not relation_name or not domain_type or not range_type or not domain_name or not range_name:
                        continue
                    key = (domain_type, domain_name, relation_name, range_type, range_name)
                    if key in relation_instances_by_key:
                        continue
                    payload = dict(item)
                    payload["source_document"] = doc_name
                    relation_instances_by_key[key] = payload
                    relation_delta += 1

                if run is not None:
                    _set_run_runtime_meta(
                        run,
                        append_log=(
                            f"[{done}/{total_docs}] 完成 {doc_name}："
                            f"新增实体 {entity_delta}，新增关系 {relation_delta}。"
                        ),
                        processed_documents=done,
                        total_documents=total_docs,
                    )
                    run.progress = min(95, 5 + int((done / max(total_docs, 1)) * 85))
                    run.updated_at = _now()
                    db.commit()

    rows: list[ReviewItem] = []
    for item in entity_instances_by_key.values():
        entity_type = _safe_schema_name(item.get("type"), fallback="")
        entity_name = _safe_schema_name(item.get("name"), fallback="", max_len=255)
        if not entity_type or not entity_name:
            continue
        source_document = _normalize_text(item.get("source_document"))
        evidence = _normalize_text(item.get("evidence")) or f"模型抽取：{entity_type}::{entity_name}"
        if source_document:
            evidence = f"{source_document}：{evidence}"
        rows.append(
            ReviewItem(
                id=_new_id("review"),
                project_id=project.id,
                run_id=run_id,
                kind="ENTITY",
                title=f"{entity_type}::{entity_name}",
                evidence=evidence,
                confidence=float(item.get("confidence") or 0),
                status="PENDING",
                entity_type_name=entity_type,
                entity_name=entity_name,
                relation_type_name=None,
                relation_domain_name=None,
                relation_range_name=None,
                payload_json=json.dumps(item, ensure_ascii=False),
                created_at=now,
                updated_at=now,
            )
        )

    for item in relation_instances_by_key.values():
        relation_name = _safe_schema_name(item.get("relation"), fallback="")
        domain_type = _safe_schema_name(item.get("domain_type"), fallback="")
        range_type = _safe_schema_name(item.get("range_type"), fallback="")
        domain_name = _safe_schema_name(item.get("domain_name"), fallback="", max_len=255)
        range_name = _safe_schema_name(item.get("range_name"), fallback="", max_len=255)
        if not relation_name or not domain_type or not range_type or not domain_name or not range_name:
            continue
        source_document = _normalize_text(item.get("source_document"))
        evidence = (
            _normalize_text(item.get("evidence"))
            or f"模型抽取：{domain_type}::{domain_name} -[{relation_name}]-> {range_type}::{range_name}"
        )
        if source_document:
            evidence = f"{source_document}：{evidence}"
        rows.append(
            ReviewItem(
                id=_new_id("review"),
                project_id=project.id,
                run_id=run_id,
                kind="RELATION",
                title=f"{domain_type}::{domain_name} -[{relation_name}]-> {range_type}::{range_name}",
                evidence=evidence,
                confidence=float(item.get("confidence") or 0),
                status="PENDING",
                entity_type_name=None,
                entity_name=None,
                relation_type_name=relation_name,
                relation_domain_name=domain_type,
                relation_range_name=range_type,
                payload_json=json.dumps(item, ensure_ascii=False),
                created_at=now,
                updated_at=now,
            )
        )
    return rows[:MAX_XLSX_REVIEW_ITEMS]


def _apply_schema_templates(
    db: Session,
    *,
    project: Project,
    entity_templates: list[dict[str, Any]],
    relation_templates: list[dict[str, Any]],
    now: datetime,
) -> dict[str, Any]:
    entity_rows = db.query(EntityType).filter(EntityType.project_id == project.id).all()
    entity_by_name = {item.name: item for item in entity_rows}
    added_entity_names: list[str] = []
    added_relation_names: list[str] = []

    for template in entity_templates:
        name = _safe_schema_name(template.get("name"), fallback="Entity")
        if not name or name in entity_by_name:
            continue

        entity_id = _new_id("ent")
        entity = EntityType(
            id=entity_id,
            project_id=project.id,
            name=name,
            description=_normalize_text(template.get("description")),
            created_at=now,
            updated_at=now,
        )
        db.add(entity)
        entity_by_name[name] = entity
        added_entity_names.append(name)

        properties = _normalize_generated_properties(template.get("properties") or [])
        for index, prop in enumerate(properties):
            db.add(
                SchemaProperty(
                    id=prop["id"],
                    project_id=project.id,
                    owner_kind=OWNER_KIND_ENTITY,
                    owner_id=entity_id,
                    name=prop["name"],
                    display_name=prop["display_name"],
                    data_type=prop["data_type"],
                    required=bool(prop["required"]),
                    default_value=prop["default_value"],
                    description=prop["description"],
                    sort_order=index,
                    created_at=now,
                    updated_at=now,
                )
            )

    relation_rows = db.query(RelationType).filter(RelationType.project_id == project.id).all()
    existing_relation_names = {item.name for item in relation_rows}
    relation_key_set = {(item.name, item.domain_entity_type_id, item.range_entity_type_id) for item in relation_rows}
    for template in relation_templates:
        domain_name = _safe_schema_name(template.get("domain"), fallback="")
        range_name = _safe_schema_name(template.get("range"), fallback="")
        if not domain_name or not range_name:
            continue
        domain_entity = entity_by_name.get(domain_name)
        range_entity = entity_by_name.get(range_name)
        if not domain_entity or not range_entity:
            continue

        base_name = _safe_schema_name(
            template.get("name"),
            fallback=f"{domain_name}_to_{range_name}",
        )
        relation_name = base_name
        # Keep relation type unique by name across the project.
        # If same type name already exists, skip instead of auto-renaming to *_2.
        if relation_name in existing_relation_names:
            continue

        relation_key = (relation_name, domain_entity.id, range_entity.id)
        if relation_key in relation_key_set:
            continue

        relation_id = _new_id("rel")
        db.add(
            RelationType(
                id=relation_id,
                project_id=project.id,
                name=relation_name,
                domain_entity_type_id=domain_entity.id,
                range_entity_type_id=range_entity.id,
                description=_normalize_text(template.get("description")),
                created_at=now,
                updated_at=now,
            )
        )
        properties = _normalize_generated_properties(template.get("properties") or [])
        for index, prop in enumerate(properties):
            db.add(
                SchemaProperty(
                    id=prop["id"],
                    project_id=project.id,
                    owner_kind=OWNER_KIND_RELATION,
                    owner_id=relation_id,
                    name=prop["name"],
                    display_name=prop["display_name"],
                    data_type=prop["data_type"],
                    required=bool(prop["required"]),
                    default_value=prop["default_value"],
                    description=prop["description"],
                    sort_order=index,
                    created_at=now,
                    updated_at=now,
                )
            )
        existing_relation_names.add(relation_name)
        relation_rows.append(
            RelationType(
                id=relation_id,
                project_id=project.id,
                name=relation_name,
                domain_entity_type_id=domain_entity.id,
                range_entity_type_id=range_entity.id,
                description=_normalize_text(template.get("description")),
                created_at=now,
                updated_at=now,
            )
        )
        relation_key_set.add(relation_key)
        added_relation_names.append(relation_name)

    if added_entity_names or added_relation_names:
        schema_cfg = _ensure_schema_config_row(db, project.id, now)
        schema_cfg.updated_at = now
        _touch_project(project)

    return {
        "added_entity_names": added_entity_names,
        "added_relation_names": added_relation_names,
    }


def _extend_unique_texts(
    target: list[str],
    seen: set[str],
    values: list[str] | tuple[str, ...],
) -> None:
    for item in values:
        text = _normalize_text(str(item))
        if not text or text in seen:
            continue
        seen.add(text)
        target.append(text)


def _generate_xlsx_review_items_for_run(
    *,
    project_id: str,
    run_id: str,
    xlsx_inputs: dict[str, Any],
    now: datetime,
) -> list[ReviewItem]:
    entity_rows: list[ReviewItem] = []
    relation_rows: list[ReviewItem] = []

    seen_entities: set[tuple[str, str]] = set()
    for item in xlsx_inputs.get("entity_instances") or []:
        entity_type = _safe_schema_name(item.get("type"), fallback="")
        entity_name = _safe_schema_name(item.get("name"), fallback="")
        if not entity_type or not entity_name:
            continue
        key = (entity_type, entity_name)
        if key in seen_entities:
            continue
        seen_entities.add(key)

        evidence = _normalize_text(item.get("evidence")) or f"来自 xlsx：{entity_type} / {entity_name}"
        entity_rows.append(
            ReviewItem(
                id=_new_id("review"),
                project_id=project_id,
                run_id=run_id,
                kind="ENTITY",
                title=f"{entity_type}::{entity_name}",
                evidence=evidence,
                confidence=round(0.82 + (hash(f"{run_id}:{entity_type}:{entity_name}") % 14) / 100, 2),
                status="PENDING",
                entity_type_name=entity_type,
                entity_name=entity_name,
                relation_type_name=None,
                relation_domain_name=None,
                relation_range_name=None,
                payload_json=None,
                created_at=now,
                updated_at=now,
            )
        )

    seen_relations: set[tuple[str, str, str, str, str]] = set()
    for item in xlsx_inputs.get("relation_instances") or []:
        relation_name = _safe_schema_name(item.get("relation"), fallback="")
        domain_type = _safe_schema_name(item.get("domain_type"), fallback="")
        range_type = _safe_schema_name(item.get("range_type"), fallback="")
        domain_name = _safe_schema_name(item.get("domain_name"), fallback="样例")
        range_name = _safe_schema_name(item.get("range_name"), fallback="样例")
        if not relation_name or not domain_type or not range_type:
            continue

        key = (domain_type, domain_name, relation_name, range_type, range_name)
        if key in seen_relations:
            continue
        seen_relations.add(key)

        evidence = _normalize_text(item.get("evidence")) or f"来自 xlsx：{domain_type} -[{relation_name}]-> {range_type}"
        relation_rows.append(
            ReviewItem(
                id=_new_id("review"),
                project_id=project_id,
                run_id=run_id,
                kind="RELATION",
                title=f"{domain_type}::{domain_name} -[{relation_name}]-> {range_type}::{range_name}",
                evidence=evidence,
                confidence=round(0.78 + (hash(f"{run_id}:{domain_type}:{relation_name}:{range_type}:{domain_name}:{range_name}") % 17) / 100, 2),
                status="PENDING",
                entity_type_name=None,
                entity_name=None,
                relation_type_name=relation_name,
                relation_domain_name=domain_type,
                relation_range_name=range_type,
                payload_json=None,
                created_at=now,
                updated_at=now,
            )
        )

    rows = entity_rows + relation_rows
    return rows[:MAX_XLSX_REVIEW_ITEMS]


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


def _default_run_runtime_meta() -> dict[str, Any]:
    return {
        "stage": "",
        "current_document": "",
        "logs": [],
        "processed_documents": 0,
        "total_documents": 0,
        "error_message": "",
    }


def _parse_run_runtime_meta(raw: str | None) -> dict[str, Any]:
    meta = _default_run_runtime_meta()
    text = _normalize_text(raw)
    if not text:
        return meta
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return meta
    if not isinstance(parsed, dict):
        return meta

    stage = _normalize_text(parsed.get("stage"))
    current_document = _normalize_text(parsed.get("current_document"))
    logs_raw = parsed.get("logs")
    processed_raw = parsed.get("processed_documents")
    total_raw = parsed.get("total_documents")
    error_text = _normalize_text(parsed.get("error_message"))

    logs: list[str] = []
    if isinstance(logs_raw, list):
        for item in logs_raw[-120:]:
            line = _normalize_text(item)
            if line:
                logs.append(line)

    processed_documents = 0
    total_documents = 0
    try:
        processed_documents = max(int(processed_raw), 0)
    except (TypeError, ValueError):
        processed_documents = 0
    try:
        total_documents = max(int(total_raw), 0)
    except (TypeError, ValueError):
        total_documents = 0

    meta.update(
        {
            "stage": stage,
            "current_document": current_document,
            "logs": logs,
            "processed_documents": processed_documents,
            "total_documents": total_documents,
            "error_message": error_text,
        }
    )
    return meta


def _set_run_runtime_meta(
    run: ExtractionRun,
    *,
    stage: str | None = None,
    current_document: str | None = None,
    append_log: str | None = None,
    processed_documents: int | None = None,
    total_documents: int | None = None,
    error_message: str | None = None,
) -> None:
    meta = _parse_run_runtime_meta(run.error_message)
    if stage is not None:
        meta["stage"] = _normalize_text(stage)
    if current_document is not None:
        meta["current_document"] = _normalize_text(current_document)
    if append_log is not None:
        line = _normalize_text(append_log)
        if line:
            logs = list(meta.get("logs") or [])
            logs.append(line)
            meta["logs"] = logs[-120:]
    if processed_documents is not None:
        meta["processed_documents"] = max(int(processed_documents), 0)
    if total_documents is not None:
        meta["total_documents"] = max(int(total_documents), 0)
    if error_message is not None:
        meta["error_message"] = _normalize_text(error_message)
    run.error_message = json.dumps(meta, ensure_ascii=False)


def _default_ai_insight_runtime_meta() -> dict[str, Any]:
    return {
        "stage": "",
        "current_document": "",
        "logs": [],
    }


def _parse_ai_insight_runtime_meta(raw: str | None) -> dict[str, Any]:
    meta = _default_ai_insight_runtime_meta()
    text = _normalize_text(raw)
    if not text:
        return meta
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return meta
    if not isinstance(parsed, dict):
        return meta

    logs: list[str] = []
    logs_raw = parsed.get("logs")
    if isinstance(logs_raw, list):
        for item in logs_raw[-120:]:
            line = _normalize_text(str(item))
            if line:
                logs.append(line)

    meta.update(
        {
            "stage": _normalize_text(parsed.get("stage")),
            "current_document": _normalize_text(parsed.get("current_document")),
            "logs": logs,
        }
    )
    return meta


def _set_ai_insight_runtime_meta(
    run: AiInsightRun,
    *,
    stage: str | None = None,
    current_document: str | None = None,
    append_log: str | None = None,
) -> None:
    meta = _parse_ai_insight_runtime_meta(run.runtime_meta_json)
    if stage is not None:
        meta["stage"] = _normalize_text(stage)
    if current_document is not None:
        meta["current_document"] = _normalize_text(current_document)
    if append_log is not None:
        line = _normalize_text(append_log)
        if line:
            logs = list(meta.get("logs") or [])
            logs.append(line)
            meta["logs"] = logs[-120:]
    run.runtime_meta_json = json.dumps(meta, ensure_ascii=False)


def _log_ai_insight_progress(run_id: str, message: str) -> None:
    logger.info("AI 洞察任务[%s] %s", run_id, _normalize_text(message))


def _mark_ai_insight_run_interrupted(
    run: AiInsightRun,
    *,
    now: datetime,
    reason_text: str,
    append_log_prefix: str,
) -> None:
    run.status = "FAILED"
    run.progress = 100
    run.completed_at = now
    run.updated_at = now
    run.error_message = reason_text
    _set_ai_insight_runtime_meta(
        run,
        stage="FAILED",
        current_document="",
        append_log=f"{append_log_prefix}{reason_text}",
    )


def recover_interrupted_ai_insight_runs(
    db: Session,
    *,
    reason: str = "服务已重启，任务中断，请重新执行 AI 洞察",
) -> int:
    reason_text = _normalize_text(reason) or "服务已重启，任务中断，请重新执行 AI 洞察"
    running_runs = db.query(AiInsightRun).filter(AiInsightRun.status == "RUNNING").all()
    if not running_runs:
        return 0

    now = _now()
    for run in running_runs:
        _mark_ai_insight_run_interrupted(
            run,
            now=now,
            reason_text=reason_text,
            append_log_prefix="任务中断：",
        )
    db.commit()

    for run in running_runs:
        _log_ai_insight_progress(run.id, f"任务中断并已自动收敛为 FAILED：{reason_text}")
    return len(running_runs)


def _cleanup_interrupted_ai_insight_runs_for_project(
    db: Session,
    *,
    project: Project,
    reason: str,
) -> int:
    reason_text = _normalize_text(reason) or "服务实例中断，请重新执行 AI 洞察"
    running_runs = (
        db.query(AiInsightRun)
        .filter(AiInsightRun.project_id == project.id, AiInsightRun.status == "RUNNING")
        .order_by(desc(AiInsightRun.created_at))
        .all()
    )
    stale_runs = [run for run in running_runs if not _is_ai_insight_active_run(run.id)]
    if not stale_runs:
        return 0

    now = _now()
    for run in stale_runs:
        _mark_ai_insight_run_interrupted(
            run,
            now=now,
            reason_text=reason_text,
            append_log_prefix="刷新检测到任务中断：",
        )
    _touch_project(project)
    db.commit()
    for run in stale_runs:
        _log_ai_insight_progress(run.id, f"刷新清理脏任务并收敛为 FAILED：{reason_text}")
    return len(stale_runs)


def cleanup_interrupted_ai_insight_runs_for_project(
    db: Session,
    user_id: int,
    project_id: str,
    *,
    reason: str = "服务实例中断，请重新执行 AI 洞察",
) -> int:
    project = _ensure_project_owned(db, user_id, project_id)
    return _cleanup_interrupted_ai_insight_runs_for_project(db, project=project, reason=reason)


def _log_extraction_progress(run_id: str, message: str) -> None:
    logger.info("抽取任务[%s] %s", run_id, _normalize_text(message))


def _mark_extraction_run_interrupted(
    run: ExtractionRun,
    *,
    now: datetime,
    reason_text: str,
    append_log_prefix: str,
) -> None:
    run.status = "FAILED"
    run.progress = 100
    run.completed_at = now
    run.updated_at = now
    _set_run_runtime_meta(
        run,
        stage="FAILED",
        current_document="",
        append_log=f"{append_log_prefix}{reason_text}",
        error_message=reason_text,
    )


def _cleanup_interrupted_extraction_runs_for_project(
    db: Session,
    *,
    project: Project,
    reason: str,
) -> int:
    reason_text = _normalize_text(reason) or "服务实例中断，请重新发起全量抽取"
    running_runs = (
        db.query(ExtractionRun)
        .filter(ExtractionRun.project_id == project.id, ExtractionRun.status == "RUNNING")
        .order_by(desc(ExtractionRun.created_at))
        .all()
    )
    stale_runs = [run for run in running_runs if not _is_extraction_active_run(run.id)]
    if not stale_runs:
        return 0

    now = _now()
    for run in stale_runs:
        _mark_extraction_run_interrupted(
            run,
            now=now,
            reason_text=reason_text,
            append_log_prefix="刷新检测到任务中断：",
        )
    _touch_project(project)
    db.commit()
    for run in stale_runs:
        _log_extraction_progress(run.id, f"刷新清理脏任务并收敛为 FAILED：{reason_text}")
    return len(stale_runs)


def _to_ai_insight_run_response(run: AiInsightRun) -> dict[str, Any]:
    runtime_meta = _parse_ai_insight_runtime_meta(run.runtime_meta_json)
    return {
        "id": run.id,
        "status": run.status,
        "progress": run.progress,
        "created_at": run.created_at,
        "completed_at": run.completed_at,
        "scanned_document_count": run.scanned_document_count,
        "added_entity_count": run.added_entity_count,
        "added_relation_count": run.added_relation_count,
        "added_entity_names": _parse_json_list(run.added_entity_names_json, fallback=[]),
        "added_relation_names": _parse_json_list(run.added_relation_names_json, fallback=[]),
        "warnings": _parse_json_list(run.warnings_json, fallback=[]),
        "stage": runtime_meta.get("stage") or None,
        "current_document": runtime_meta.get("current_document") or None,
        "logs": list(runtime_meta.get("logs") or []),
        "error_message": _normalize_text(run.error_message) or None,
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
    # Ensure in-session inserts/updates are visible when Session uses autoflush=False.
    db.flush()
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
    runtime_meta = _parse_run_runtime_meta(run.error_message)
    return {
        "id": run.id,
        "status": run.status,
        "progress": run.progress,
        "created_at": run.created_at,
        "completed_at": run.completed_at,
        "candidate_entity_count": run.candidate_entity_count,
        "candidate_relation_count": run.candidate_relation_count,
        "pending_review_count": run.pending_review_count,
        "stage": runtime_meta.get("stage") or None,
        "current_document": runtime_meta.get("current_document") or None,
        "logs": list(runtime_meta.get("logs") or []),
        "error_message": runtime_meta.get("error_message") or None,
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
    _cleanup_interrupted_ai_insight_runs_for_project(
        db,
        project=project,
        reason="服务实例中断，请重新执行 AI 洞察",
    )
    _cleanup_interrupted_extraction_runs_for_project(
        db,
        project=project,
        reason="服务实例中断，请重新发起全量抽取",
    )

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
    ai_insight_run = (
        db.query(AiInsightRun)
        .filter(AiInsightRun.project_id == project.id)
        .order_by(desc(AiInsightRun.created_at))
        .first()
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
        "ai_insight_run": _to_ai_insight_run_response(ai_insight_run) if ai_insight_run else None,
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
    db.query(AiInsightRun).filter(AiInsightRun.project_id == project.id).delete()
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
        raise ValueError("仅支持 .docx、.md 或 .xlsx 文档")
    if ext == ".xlsx":
        _parse_xlsx_tables(content)

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


def clear_project_schema(db: Session, user_id: int, project_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    db.query(SchemaProperty).filter(SchemaProperty.project_id == project.id).delete()
    db.query(RelationType).filter(RelationType.project_id == project.id).delete()
    db.query(EntityType).filter(EntityType.project_id == project.id).delete()
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

    added_entity_names: list[str] = []
    added_relation_names: list[str] = []
    warnings: list[str] = []
    seen_entity_names: set[str] = set()
    seen_relation_names: set[str] = set()
    seen_warnings: set[str] = set()

    for doc in enabled_docs:
        xlsx_inputs = _collect_xlsx_insight_inputs([doc])
        existing_entity_names = {
            row.name
            for row in db.query(EntityType.name)
            .filter(EntityType.project_id == project.id)
            .all()
        }
        llm_raw_output = _run_ai_schema_insight_llm(
            project=project,
            enabled_docs=[doc],
            xlsx_inputs=xlsx_inputs,
            existing_entity_names=existing_entity_names,
        )
        parsed_output = _parse_ai_schema_insight_output(
            raw_output=llm_raw_output,
            existing_entity_names=existing_entity_names,
            normalize_generated_properties=_normalize_generated_properties,
        )
        entity_templates = parsed_output["entity_templates"]
        relation_templates = parsed_output["relation_templates"]
        _extend_unique_texts(warnings, seen_warnings, parsed_output["warnings"])
        if not entity_templates and not relation_templates:
            _extend_unique_texts(
                warnings,
                seen_warnings,
                [f"文档 {doc.name} 未提取到可入库的实体或关系，已跳过"],
            )
            continue

        applied = _apply_schema_templates(
            db,
            project=project,
            entity_templates=entity_templates,
            relation_templates=relation_templates,
            now=_now(),
        )
        _extend_unique_texts(added_entity_names, seen_entity_names, applied["added_entity_names"])
        _extend_unique_texts(added_relation_names, seen_relation_names, applied["added_relation_names"])
        if applied["added_entity_names"] or applied["added_relation_names"]:
            db.commit()

    if not added_entity_names and not added_relation_names:
        raise ValueError("AI 洞察未提取到可入库的实体或关系，请调整文档内容或 Prompt 后重试")

    return {
        "scanned_document_count": len(enabled_docs),
        "added_entity_count": len(added_entity_names),
        "added_relation_count": len(added_relation_names),
        "added_entity_names": added_entity_names,
        "added_relation_names": added_relation_names,
        "warnings": warnings,
    }


def create_ai_schema_insight_run(db: Session, user_id: int, project_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    running = (
        db.query(AiInsightRun.id)
        .filter(AiInsightRun.project_id == project.id, AiInsightRun.status == "RUNNING")
        .first()
    )
    if running:
        raise ValueError("已有进行中的 AI 洞察任务，请稍后再试")

    enabled_docs = (
        db.query(ProjectDocument)
        .filter(ProjectDocument.project_id == project.id, ProjectDocument.enabled.is_(True))
        .order_by(desc(ProjectDocument.uploaded_at))
        .all()
    )
    if not enabled_docs:
        raise ValueError("请至少启用一个文档后再进行 AI 洞察")

    now = _now()
    run = AiInsightRun(
        id=_new_id("airun"),
        project_id=project.id,
        status="RUNNING",
        progress=0,
        scanned_document_count=len(enabled_docs),
        added_entity_count=0,
        added_relation_count=0,
        added_entity_names_json=json.dumps([], ensure_ascii=False),
        added_relation_names_json=json.dumps([], ensure_ascii=False),
        warnings_json=json.dumps([], ensure_ascii=False),
        runtime_meta_json=json.dumps(_default_ai_insight_runtime_meta(), ensure_ascii=False),
        error_message="",
        created_at=now,
        completed_at=None,
        updated_at=now,
    )
    _set_ai_insight_runtime_meta(
        run,
        stage="QUEUED",
        append_log=f"任务已创建，待扫描文档数：{len(enabled_docs)}。",
    )
    db.add(run)
    _touch_project(project)
    db.commit()
    db.refresh(run)
    _log_ai_insight_progress(run.id, f"任务已创建，待扫描文档数：{len(enabled_docs)}")

    bind = db.get_bind()
    session_factory = sessionmaker(bind=bind, autocommit=False, autoflush=False)
    thread = threading.Thread(
        target=_run_ai_schema_insight_in_background,
        args=(session_factory, user_id, project.id, run.id),
        daemon=True,
        name=f"ai-insight-{run.id}",
    )
    _register_ai_insight_active_run(run.id)
    thread.start()
    return _to_ai_insight_run_response(run)


def _mark_ai_insight_run_failed(
    db: Session,
    *,
    project: Project,
    run: AiInsightRun,
    message: str,
) -> None:
    error_message = _normalize_text(message) or "AI 洞察任务失败"
    run.status = "FAILED"
    run.progress = 100
    run.completed_at = _now()
    run.updated_at = _now()
    run.error_message = error_message
    _set_ai_insight_runtime_meta(
        run,
        stage="FAILED",
        current_document="",
        append_log=f"任务失败：{error_message}",
    )
    _touch_project(project)
    db.commit()
    _log_ai_insight_progress(run.id, f"任务失败：{error_message}")


def _run_ai_schema_insight_in_background(
    session_factory: sessionmaker,
    user_id: int,
    project_id: str,
    run_id: str,
) -> None:
    db = session_factory()
    try:
        _execute_ai_schema_insight_run(db, user_id, project_id, run_id)
    finally:
        _unregister_ai_insight_active_run(run_id)
        db.close()


def _execute_ai_schema_insight_run(db: Session, user_id: int, project_id: str, run_id: str) -> None:
    try:
        project = _ensure_project_owned(db, user_id, project_id)
        run = (
            db.query(AiInsightRun)
            .filter(AiInsightRun.project_id == project.id, AiInsightRun.id == run_id)
            .first()
        )
        if not run or run.status != "RUNNING":
            return

        enabled_docs = (
            db.query(ProjectDocument)
            .filter(ProjectDocument.project_id == project.id, ProjectDocument.enabled.is_(True))
            .order_by(desc(ProjectDocument.uploaded_at))
            .all()
        )
        if not enabled_docs:
            _mark_ai_insight_run_failed(db, project=project, run=run, message="无可用启用文档")
            return

        added_entity_names: list[str] = []
        added_relation_names: list[str] = []
        warnings: list[str] = []
        seen_entity_names: set[str] = set()
        seen_relation_names: set[str] = set()
        seen_warnings: set[str] = set()

        run.scanned_document_count = len(enabled_docs)
        run.progress = 10
        _set_ai_insight_runtime_meta(
            run,
            stage="PREPARING",
            current_document=enabled_docs[0].name if enabled_docs else "",
            append_log=f"开始扫描 {len(enabled_docs)} 个启用文档。",
        )
        run.updated_at = _now()
        db.commit()
        _log_ai_insight_progress(run.id, f"开始扫描文档，数量={len(enabled_docs)}")

        total_docs = len(enabled_docs)
        concurrency = _resolve_ai_insight_concurrency()
        _log_ai_insight_progress(run.id, f"并发数={concurrency}")

        # --- 并发调用 LLM，串行写入 DB ---
        from concurrent.futures import ThreadPoolExecutor, as_completed

        def _call_llm_for_doc(doc_idx_names_tuple):
            idx, doc, existing_entity_names = doc_idx_names_tuple
            xlsx_inputs = _collect_xlsx_insight_inputs([doc])
            try:
                llm_raw_output = _run_ai_schema_insight_llm(
                    project=project,
                    enabled_docs=[doc],
                    xlsx_inputs=xlsx_inputs,
                    existing_entity_names=existing_entity_names,
                )
            except Exception as exc:
                # 单文件失败不中断整体，返回空结果 + warning
                llm_raw_output = {
                    "entities": [],
                    "relations": [],
                    "warnings": [f"文档 {doc.name} 模型调用失败，已跳过：{exc}"],
                }
            return idx, doc, existing_entity_names, llm_raw_output

        # 按批次处理（每批 concurrency 个），批内并发，批间串行写入
        for batch_start in range(0, total_docs, concurrency):
            # Pre-fetch existing entity names in the main thread before spawning worker
            # threads — SQLAlchemy sessions are not thread-safe and must not be accessed
            # from multiple threads concurrently.
            batch_existing_entity_names = {
                row.name
                for row in db.query(EntityType.name)
                .filter(EntityType.project_id == project.id)
                .all()
            }
            batch = [
                (batch_start + i + 1, doc, batch_existing_entity_names)
                for i, doc in enumerate(enabled_docs[batch_start:batch_start + concurrency])
            ]
            batch_size = len(batch)

            run.progress = min(85, 10 + int((batch_start / max(total_docs, 1)) * 70))
            _set_ai_insight_runtime_meta(
                run,
                stage="LLM_EXTRACTING",
                current_document=batch[0][1].name,
                append_log=f"开始处理文档 {batch_start + 1}~{batch_start + batch_size}/{total_docs}",
            )
            run.updated_at = _now()
            db.commit()

            with ThreadPoolExecutor(max_workers=batch_size) as executor:
                futures = {executor.submit(_call_llm_for_doc, item): item for item in batch}
                batch_results = []
                for future in as_completed(futures):
                    try:
                        batch_results.append(future.result())
                    except Exception as exc:
                        orig_item = futures[future]
                        idx, doc, _ = orig_item
                        batch_results.append((
                            idx, doc, set(),
                            {"entities": [], "relations": [], "warnings": [f"文档 {doc.name} 处理异常，已跳过：{exc}"]},
                        ))

            # 按原始顺序排序后串行写入
            batch_results.sort(key=lambda r: r[0])
            for idx, doc, existing_entity_names, llm_raw_output in batch_results:
                run.progress = min(90, 15 + int((idx / max(total_docs, 1)) * 70))
                _set_ai_insight_runtime_meta(
                    run,
                    stage="PARSING_OUTPUT",
                    current_document=doc.name,
                    append_log=f"文档 {idx}/{total_docs} 模型调用完成，开始解析输出。",
                )
                run.updated_at = _now()
                db.commit()
                _log_ai_insight_progress(run.id, f"文档 {idx}/{total_docs} 模型调用完成，开始解析")

                parsed_output = _parse_ai_schema_insight_output(
                    raw_output=llm_raw_output,
                    existing_entity_names=existing_entity_names,
                    normalize_generated_properties=_normalize_generated_properties,
                )
                entity_templates = parsed_output["entity_templates"]
                relation_templates = parsed_output["relation_templates"]
                _extend_unique_texts(warnings, seen_warnings, parsed_output["warnings"])
                if not entity_templates and not relation_templates:
                    _extend_unique_texts(
                        warnings,
                        seen_warnings,
                        [f"文档 {doc.name} 未提取到可入库的实体或关系，已跳过"],
                    )
                    run.added_entity_count = len(added_entity_names)
                    run.added_relation_count = len(added_relation_names)
                    run.added_entity_names_json = json.dumps(added_entity_names, ensure_ascii=False)
                    run.added_relation_names_json = json.dumps(added_relation_names, ensure_ascii=False)
                    run.warnings_json = json.dumps(warnings, ensure_ascii=False)
                    run.updated_at = _now()
                    db.commit()
                    continue

                _set_ai_insight_runtime_meta(
                    run,
                    stage="APPLYING_SCHEMA",
                    current_document=doc.name,
                    append_log=f"文档 {idx}/{total_docs} 解析完成，开始写入实体与关系类型。",
                )
                run.updated_at = _now()
                db.commit()
                _log_ai_insight_progress(run.id, f"文档 {idx}/{total_docs} 开始写入 Schema")

                applied = _apply_schema_templates(
                    db,
                    project=project,
                    entity_templates=entity_templates,
                    relation_templates=relation_templates,
                    now=_now(),
                )
                _extend_unique_texts(added_entity_names, seen_entity_names, applied["added_entity_names"])
                _extend_unique_texts(added_relation_names, seen_relation_names, applied["added_relation_names"])

                run.added_entity_count = len(added_entity_names)
                run.added_relation_count = len(added_relation_names)
                run.added_entity_names_json = json.dumps(added_entity_names, ensure_ascii=False)
                run.added_relation_names_json = json.dumps(added_relation_names, ensure_ascii=False)
                run.warnings_json = json.dumps(warnings, ensure_ascii=False)
                run.updated_at = _now()
                db.commit()
                _log_ai_insight_progress(
                    run.id,
                    (
                        f"文档 {idx}/{total_docs} 入库完成，"
                        f"累计新增实体={run.added_entity_count}，累计新增关系={run.added_relation_count}"
                    ),
                )

        if not added_entity_names and not added_relation_names:
            raise ValueError("AI 洞察未提取到可入库的实体或关系，请调整文档内容或 Prompt 后重试")

        run.status = "COMPLETED"
        run.progress = 100
        run.added_entity_count = len(added_entity_names)
        run.added_relation_count = len(added_relation_names)
        run.added_entity_names_json = json.dumps(added_entity_names, ensure_ascii=False)
        run.added_relation_names_json = json.dumps(added_relation_names, ensure_ascii=False)
        run.warnings_json = json.dumps(warnings, ensure_ascii=False)
        run.error_message = ""
        run.completed_at = _now()
        run.updated_at = _now()
        _set_ai_insight_runtime_meta(
            run,
            stage="COMPLETED",
            current_document="",
            append_log=(
                f"任务完成：新增实体 {run.added_entity_count}，"
                f"新增关系 {run.added_relation_count}。"
            ),
        )
        _touch_project(project)
        db.commit()
        _log_ai_insight_progress(
            run.id,
            f"任务完成，新增实体={run.added_entity_count}，新增关系={run.added_relation_count}",
        )
    except Exception as exc:
        try:
            project = (
                db.query(Project)
                .filter(Project.id == project_id, Project.owner_user_id == user_id)
                .first()
            )
            run = (
                db.query(AiInsightRun)
                .filter(AiInsightRun.project_id == project_id, AiInsightRun.id == run_id)
                .first()
            )
            if project and run and run.status == "RUNNING":
                _mark_ai_insight_run_failed(db, project=project, run=run, message=str(exc))
            else:
                logger.exception("AI 洞察后台任务异常，run_id=%s", run_id)
        except Exception:
            db.rollback()


def get_ai_schema_insight_run(db: Session, user_id: int, project_id: str, run_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    _cleanup_interrupted_ai_insight_runs_for_project(
        db,
        project=project,
        reason="服务实例中断，请重新执行 AI 洞察",
    )
    run = (
        db.query(AiInsightRun)
        .filter(AiInsightRun.project_id == project.id, AiInsightRun.id == run_id)
        .first()
    )
    if not run:
        raise ValueError("AI 洞察任务不存在")
    return _to_ai_insight_run_response(run)


def create_extraction_run(db: Session, user_id: int, project_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    _cleanup_interrupted_extraction_runs_for_project(
        db,
        project=project,
        reason="服务实例中断，请重新发起全量抽取",
    )
    running = (
        db.query(ExtractionRun.id)
        .filter(ExtractionRun.project_id == project.id, ExtractionRun.status == "RUNNING")
        .first()
    )
    if running:
        raise ValueError("已有进行中的全量抽取任务，请稍后再试")

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
        status="RUNNING",
        progress=0,
        source_snapshot_json=json.dumps(source_snapshot, ensure_ascii=False),
        candidate_entity_count=0,
        candidate_relation_count=0,
        pending_review_count=0,
        error_message=json.dumps(_default_run_runtime_meta(), ensure_ascii=False),
        created_at=now,
        completed_at=None,
        updated_at=now,
    )
    _set_run_runtime_meta(
        run,
        stage="QUEUED",
        current_document="",
        append_log=f"抽取任务已创建，待处理文档数：{len(enabled_docs)}。",
        processed_documents=0,
        total_documents=len(enabled_docs),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    bind = db.get_bind()
    session_factory = sessionmaker(bind=bind, autocommit=False, autoflush=False)
    thread = threading.Thread(
        target=_run_extraction_in_background,
        args=(session_factory, user_id, project.id, run.id),
        daemon=True,
        name=f"extraction-{run.id}",
    )
    _register_extraction_active_run(run.id)
    thread.start()
    return _to_run_response(db, run)


def _mark_run_failed(
    db: Session,
    *,
    project: Project,
    run: ExtractionRun,
    message: str,
) -> None:
    error_text = _normalize_text(message) or "全量抽取任务失败"
    run.status = "FAILED"
    run.progress = 100
    run.completed_at = _now()
    run.updated_at = _now()
    _set_run_runtime_meta(
        run,
        stage="FAILED",
        current_document="",
        append_log=f"任务失败：{error_text}",
        error_message=error_text,
    )
    _touch_project(project)
    db.commit()
    _log_extraction_progress(run.id, f"任务失败：{error_text}")


def _run_extraction_in_background(
    session_factory: sessionmaker,
    user_id: int,
    project_id: str,
    run_id: str,
) -> None:
    db = session_factory()
    try:
        _execute_extraction_run(db, user_id, project_id, run_id)
    finally:
        _unregister_extraction_active_run(run_id)
        db.close()


def _execute_extraction_run(db: Session, user_id: int, project_id: str, run_id: str) -> None:
    try:
        project = _ensure_project_owned(db, user_id, project_id)
        run = (
            db.query(ExtractionRun)
            .filter(ExtractionRun.project_id == project.id, ExtractionRun.id == run_id)
            .first()
        )
        if not run or run.status != "RUNNING":
            return

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
            _mark_run_failed(db, project=project, run=run, message="无可用数据来源")
            return

        now = _now()
        xlsx_inputs = _collect_xlsx_insight_inputs(enabled_docs)
        if xlsx_inputs["entity_templates"] or xlsx_inputs["relation_templates"]:
            _apply_schema_templates(
                db,
                project=project,
                entity_templates=xlsx_inputs["entity_templates"],
                relation_templates=xlsx_inputs["relation_templates"],
                now=now,
            )

        entity_rows = (
            db.query(EntityType)
            .filter(EntityType.project_id == project.id)
            .order_by(EntityType.created_at)
            .all()
        )
        if not entity_rows:
            _mark_run_failed(db, project=project, run=run, message="请先配置实体类型，或上传可解析的 xlsx 文件")
            return

        relation_rows = (
            db.query(RelationType)
            .filter(RelationType.project_id == project.id)
            .order_by(RelationType.created_at)
            .all()
        )
        skills = _build_skills_response(db.query(Skill).filter(Skill.project_id == project.id).all())
        if not any(skill.get("enabled") and not skill.get("blocked") for skill in skills):
            _mark_run_failed(db, project=project, run=run, message="请至少启用一个 Skill")
            return

        entity_name_by_id = {entity.id: entity.name for entity in entity_rows}
        review_rows = _generate_ai_review_items_for_run(
            db,
            project=project,
            run_id=run.id,
            enabled_docs=enabled_docs,
            entity_rows=entity_rows,
            relation_rows=relation_rows,
            entity_name_by_id=entity_name_by_id,
            xlsx_inputs=xlsx_inputs,
            now=now,
            run=run,
        )

        if not review_rows:
            _set_run_runtime_meta(run, append_log="模型未产出候选，回退到 xlsx 结构化候选。")
            run.updated_at = _now()
            db.commit()
            review_rows = _generate_xlsx_review_items_for_run(
                project_id=project.id,
                run_id=run.id,
                xlsx_inputs=xlsx_inputs,
                now=now,
            )

        if not review_rows:
            _set_run_runtime_meta(run, append_log="xlsx 候选为空，回退到启发式候选。")
            run.updated_at = _now()
            db.commit()
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
        run.status = "COMPLETED"
        run.progress = 100
        run.completed_at = _now()
        run.updated_at = _now()
        _set_run_runtime_meta(
            run,
            stage="COMPLETED",
            current_document="",
            append_log=(
                f"任务完成：候选实体 {run.candidate_entity_count}，"
                f"候选关系 {run.candidate_relation_count}，待审核 {run.pending_review_count}。"
            ),
            processed_documents=len(enabled_docs),
            total_documents=len(enabled_docs),
        )
        _touch_project(project)
        db.commit()
    except Exception as exc:
        try:
            project = (
                db.query(Project)
                .filter(Project.id == project_id, Project.owner_user_id == user_id)
                .first()
            )
            run = (
                db.query(ExtractionRun)
                .filter(ExtractionRun.project_id == project_id, ExtractionRun.id == run_id)
                .first()
            )
            if project and run and run.status == "RUNNING":
                _mark_run_failed(db, project=project, run=run, message=str(exc))
        except Exception:
            db.rollback()


def get_extraction_run(db: Session, user_id: int, project_id: str, run_id: str):
    project = _ensure_project_owned(db, user_id, project_id)
    _cleanup_interrupted_extraction_runs_for_project(
        db,
        project=project,
        reason="服务实例中断，请重新发起全量抽取",
    )
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
