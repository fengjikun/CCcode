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


def _dedupe_name(base: str, existing: set[str], *, max_len: int = 64) -> str:
    candidate = _safe_schema_name(base, fallback="item", max_len=max_len)
    if candidate not in existing:
        return candidate
    for idx in range(2, 200):
        suffix = f"_{idx}"
        prefix_len = max(max_len - len(suffix), 1)
        next_candidate = f"{candidate[:prefix_len]}{suffix}"
        if next_candidate not in existing:
            return next_candidate
    return _safe_schema_name(f"{candidate}_{uuid4().hex[:4]}", fallback="item", max_len=max_len)


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
        if relation_name in existing_relation_names:
            matched = False
            for relation in relation_rows:
                if (
                    relation.name == relation_name
                    and relation.domain_entity_type_id == domain_entity.id
                    and relation.range_entity_type_id == range_entity.id
                ):
                    matched = True
                    break
            if matched:
                continue
            relation_name = _dedupe_name(base_name, existing_relation_names)

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

    now = _now()
    xlsx_inputs = _collect_xlsx_insight_inputs(enabled_docs)

    entity_templates = list(xlsx_inputs["entity_templates"])
    relation_templates = list(xlsx_inputs["relation_templates"])
    if not entity_templates:
        picked_entities = _pick_ai_entity_templates([doc.name for doc in enabled_docs])
        entity_templates.extend(picked_entities)
        relation_templates.extend(AI_RELATION_TEMPLATES)

    applied = _apply_schema_templates(
        db,
        project=project,
        entity_templates=entity_templates,
        relation_templates=relation_templates,
        now=now,
    )
    if applied["added_entity_names"] or applied["added_relation_names"]:
        db.commit()

    return {
        "scanned_document_count": len(enabled_docs),
        "added_entity_count": len(applied["added_entity_names"]),
        "added_relation_count": len(applied["added_relation_names"]),
        "added_entity_names": applied["added_entity_names"],
        "added_relation_names": applied["added_relation_names"],
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
        raise ValueError("请先配置实体类型，或上传可解析的 xlsx 文件")

    relation_rows = (
        db.query(RelationType)
        .filter(RelationType.project_id == project.id)
        .order_by(RelationType.created_at)
        .all()
    )
    skills = _build_skills_response(db.query(Skill).filter(Skill.project_id == project.id).all())
    if not any(skill.get("enabled") and not skill.get("blocked") for skill in skills):
        raise ValueError("请至少启用一个 Skill")

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

    review_rows = _generate_xlsx_review_items_for_run(
        project_id=project.id,
        run_id=run.id,
        xlsx_inputs=xlsx_inputs,
        now=now,
    )
    if not review_rows:
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
