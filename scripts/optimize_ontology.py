#!/usr/bin/env python3
"""
本体项目数据优化脚本
项目: proj_01ccfa6841df（故障诊断本体）
执行内容:
  1. 清理冗余关系类型（32条 → 10条核心关系）
  2. 补全现有实体属性
  3. 新增 Component（零部件）、Workshop（车间/产线）实体类型
  4. 删除测试用动作和函数，创建专业业务数据
"""
import json
import sys
import requests

BASE_URL = "http://localhost:9000"
PROJECT_ID = "proj_01ccfa6841df"

# ─────────────────────── 工具函数 ───────────────────────

def login():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin", "password": "admin123456"
    })
    resp.raise_for_status()
    token = resp.json()["accessToken"]
    print(f"✅ 登录成功")
    return {"Authorization": f"Bearer {token}"}


def get(h, path):
    r = requests.get(f"{BASE_URL}{path}", headers=h)
    if not r.ok:
        print(f"  ⚠️  GET {path} → {r.status_code}: {r.text[:200]}")
        return None
    return r.json()


def post(h, path, body):
    r = requests.post(f"{BASE_URL}{path}", headers=h, json=body)
    if not r.ok:
        print(f"  ❌ POST {path} → {r.status_code}: {r.text[:300]}")
        return None
    return r.json()


def put(h, path, body):
    r = requests.put(f"{BASE_URL}{path}", headers=h, json=body)
    if not r.ok:
        print(f"  ❌ PUT {path} → {r.status_code}: {r.text[:300]}")
        return None
    return r.json()


def delete(h, path):
    r = requests.delete(f"{BASE_URL}{path}", headers=h)
    if r.status_code not in (200, 204):
        print(f"  ⚠️  DELETE {path} → {r.status_code}: {r.text[:200]}")
        return False
    return True


def section(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print(f"{'─'*55}")


# ─────────────────────── 数据定义 ───────────────────────

BASE = f"/api/projects/{PROJECT_ID}"

# 10 条核心关系（去冗后保留）
# 格式: (name, domain, range, description)
CORE_RELATIONS = [
    ("failure_occurs_on",       "Failure",      "Equipment",    "故障发生在特定设备上"),
    ("failure_caused_by",       "Failure",      "RootCause",    "故障由根本原因引起"),
    ("equipment_has_failure",   "Equipment",    "Failure",      "设备发生了具体的故障现象"),
    ("equipment_has_component", "Equipment",    "Component",    "设备包含特定零部件"),
    ("component_fails",         "Component",    "Failure",      "零部件失效导致故障"),
    ("report_records_failure",  "EightDReport", "Failure",      "8D 报告记录具体故障事件"),
    ("report_analyzes_cause",   "EightDReport", "RootCause",    "8D 报告分析根本原因"),
    ("report_includes_action",  "EightDReport", "Action",       "8D 报告包含纠正/预防措施"),
    ("report_authored_by",      "EightDReport", "Person",       "8D 报告由责任人填写提交"),
    ("action_resolves_failure",  "Action",      "Failure",      "措施用于消除或缓解故障"),
    ("action_performed_by",     "Action",       "Person",       "措施由责任人负责执行"),
    ("cause_resolved_by",       "RootCause",    "Action",       "根本原因通过改进措施消除"),
    ("equipment_in_workshop",   "Equipment",    "Workshop",     "设备所属的车间/产线"),
]

# 每个实体类型的完整属性定义（包含现有+补充）
ENTITY_UPDATES = {
    "Equipment": {
        "description": "涉及故障的工业设备对象",
        "properties": [
            {"name": "equip_code",   "displayName": "设备编码",   "dataType": "STRING",   "required": True,  "description": "设备唯一编号，如 EL1570"},
            {"name": "equip_name",   "displayName": "设备名称",   "dataType": "STRING",   "required": True,  "description": "设备通用名称，如升降机"},
            {"name": "equip_type",   "displayName": "设备类型",   "dataType": "STRING",   "required": False, "description": "设备分类，如：升降机、输送机、变频器"},
            {"name": "location",     "displayName": "安装位置",   "dataType": "STRING",   "required": False, "description": "设备所在车间/产线位置"},
            {"name": "manufacturer", "displayName": "制造商",     "dataType": "STRING",   "required": False, "description": "设备生产厂商"},
            {"name": "install_date", "displayName": "投用日期",   "dataType": "DATE",     "required": False, "description": "设备投入使用日期"},
            {"name": "status",       "displayName": "运行状态",   "dataType": "STRING",   "required": False, "description": "当前状态：正常/故障/停用"},
        ]
    },
    "Failure": {
        "description": "设备发生的具体故障现象",
        "properties": [
            {"name": "fail_desc",    "displayName": "故障描述",   "dataType": "TEXT",     "required": True,  "description": "故障的详细现象描述"},
            {"name": "fail_date",    "displayName": "故障时间",   "dataType": "DATETIME", "required": False, "description": "故障发生的时刻"},
            {"name": "fail_type",    "displayName": "故障类型",   "dataType": "STRING",   "required": False, "description": "故障分类：机械/电气/控制/液压"},
            {"name": "severity",     "displayName": "严重程度",   "dataType": "STRING",   "required": False, "description": "影响等级：高/中/低"},
            {"name": "stop_line",    "displayName": "是否停线",   "dataType": "BOOLEAN",  "required": False, "description": "故障是否导致生产停线"},
            {"name": "downtime_min", "displayName": "停机时长(分钟)", "dataType": "INTEGER", "required": False, "description": "设备停机持续分钟数"},
        ]
    },
    "RootCause": {
        "description": "故障的根本原因分析",
        "properties": [
            {"name": "cause_desc",   "displayName": "原因描述",   "dataType": "TEXT",     "required": True,  "description": "根本原因详细说明"},
            {"name": "cause_cat",    "displayName": "原因分类",   "dataType": "STRING",   "required": False, "description": "原因类别：设计/工艺/操作/维保/物料"},
            {"name": "why_chain",    "displayName": "5Why分析",   "dataType": "TEXT",     "required": False, "description": "五问分析链条记录"},
        ]
    },
    "Action": {
        "description": "纠正与预防改进措施",
        "properties": [
            {"name": "action_content", "displayName": "措施内容", "dataType": "TEXT",     "required": True,  "description": "具体执行方案描述"},
            {"name": "action_type",    "displayName": "措施类型", "dataType": "STRING",   "required": False, "description": "类型：临时措施/长期措施/预防措施"},
            {"name": "status",         "displayName": "完成状态", "dataType": "STRING",   "required": False, "description": "状态：待执行/执行中/已完成/已验证"},
            {"name": "due_date",       "displayName": "计划完成日期", "dataType": "DATE", "required": False, "description": "措施预计完成时间"},
            {"name": "verify_result",  "displayName": "验证结果", "dataType": "TEXT",     "required": False, "description": "措施有效性验证记录"},
        ]
    },
    "Person": {
        "description": "参与分析与处理的人员",
        "properties": [
            {"name": "name",         "displayName": "姓名",       "dataType": "STRING",   "required": True,  "description": "人员姓名"},
            {"name": "role",         "displayName": "角色",       "dataType": "STRING",   "required": False, "description": "人员角色：维修工/工程师/主管/设备管理员"},
            {"name": "dept",         "displayName": "所属部门",   "dataType": "STRING",   "required": False, "description": "人员所在部门或班组"},
            {"name": "contact",      "displayName": "联系方式",   "dataType": "STRING",   "required": False, "description": "手机号或工号"},
        ]
    },
    "EightDReport": {
        "description": "8D 质量问题分析与改进报告",
        "properties": [
            {"name": "report_id",    "displayName": "报告编号",   "dataType": "STRING",   "required": True,  "description": "报告唯一标识，如 8D-2025-001"},
            {"name": "create_date",  "displayName": "创建日期",   "dataType": "DATE",     "required": False, "description": "报告生成时间"},
            {"name": "problem_desc", "displayName": "问题描述",   "dataType": "TEXT",     "required": False, "description": "D2 问题量化描述"},
            {"name": "d3_contain",   "displayName": "遏制措施",   "dataType": "TEXT",     "required": False, "description": "D3 临时遏制措施"},
            {"name": "d8_close_date","displayName": "关闭日期",   "dataType": "DATE",     "required": False, "description": "D8 报告正式关闭时间"},
            {"name": "status",       "displayName": "报告状态",   "dataType": "STRING",   "required": False, "description": "状态：草稿/审核中/已关闭"},
        ]
    },
}

# 新增实体类型
NEW_ENTITIES = [
    {
        "name": "Component",
        "description": "设备的可更换零部件或子系统",
        "properties": [
            {"name": "comp_code",    "displayName": "零件编码",   "dataType": "STRING",   "required": True,  "description": "零部件物料编码"},
            {"name": "comp_name",    "displayName": "零件名称",   "dataType": "STRING",   "required": True,  "description": "零部件名称，如联轴器、变频器"},
            {"name": "comp_type",    "displayName": "零件类别",   "dataType": "STRING",   "required": False, "description": "类别：机械件/电气件/液压件/控制件"},
            {"name": "lifespan",     "displayName": "设计寿命",   "dataType": "STRING",   "required": False, "description": "设计使用寿命，如：50000小时"},
            {"name": "vendor",       "displayName": "供应商",     "dataType": "STRING",   "required": False, "description": "零部件供应商名称"},
            {"name": "last_replace", "displayName": "最近更换日期", "dataType": "DATE",   "required": False, "description": "最近一次更换记录日期"},
        ]
    },
    {
        "name": "Workshop",
        "description": "设备所属的车间或生产产线",
        "properties": [
            {"name": "workshop_code","displayName": "车间编码",   "dataType": "STRING",   "required": True,  "description": "车间唯一标识，如 P1Y1"},
            {"name": "workshop_name","displayName": "车间名称",   "dataType": "STRING",   "required": True,  "description": "车间全称，如涂装车间"},
            {"name": "line_name",    "displayName": "产线名称",   "dataType": "STRING",   "required": False, "description": "所属产线，如内饰一线"},
            {"name": "shift",        "displayName": "班次",       "dataType": "STRING",   "required": False, "description": "生产班次安排：三班两运转等"},
            {"name": "manager",      "displayName": "负责人",     "dataType": "STRING",   "required": False, "description": "车间主任或产线负责人"},
        ]
    },
]

# 业务动作（替换测试数据）
# 每条动作包含完整的5个Tab数据：基本信息、参数、规则、校验规则、触发&异常
BUSINESS_ACTIONS = [
    {
        "name": "emergency_response",
        "displayName": "故障应急处理",
        "description": "设备发生故障后的第一响应标准动作：隔离设备、通知相关人员、填写故障初始记录，防止故障扩大。",
        "status": "ACTIVE",
        "triggerType": "EVENT",
        "triggerConfigJson": json.dumps({
            "event": "failure.created",
            "filter": {"severity": ["高", "中"]},
            "debounce_seconds": 30
        }, ensure_ascii=False),
        "exceptionPolicy": "RETRY",
        "exceptionConfigJson": json.dumps({
            "maxRetries": 3,
            "retryDelay": 10000,
            "notifyOnFail": True
        }, ensure_ascii=False),
        "validationRulesJson": json.dumps([
            {"name": "设备编码非空", "condition": "params.equipCode != null && params.equipCode != ''", "message": "必须指定故障设备编码"},
            {"name": "故障描述非空", "condition": "params.failDesc != null && params.failDesc.length >= 5", "message": "故障描述不得少于5个字"},
        ], ensure_ascii=False),
        "parametersJson": json.dumps([
            {"name": "equipCode",    "displayName": "设备编码",   "dataType": "STRING",  "required": True,  "defaultValue": ""},
            {"name": "failDesc",     "displayName": "故障描述",   "dataType": "STRING",  "required": True,  "defaultValue": ""},
            {"name": "severity",     "displayName": "严重程度",   "dataType": "STRING",  "required": True,  "defaultValue": "中"},
            {"name": "stopLine",     "displayName": "是否停线",   "dataType": "BOOLEAN", "required": False, "defaultValue": "false"},
            {"name": "reporterName", "displayName": "报告人姓名", "dataType": "STRING",  "required": False, "defaultValue": ""},
        ], ensure_ascii=False),
        "rulesJson": json.dumps([
            {"ruleType": "CREATE_OBJECT", "target": "Failure",   "conditionJson": '{"auto": true}',          "propertyMappingsJson": '{"fail_desc": "failDesc", "severity": "severity", "stop_line": "stopLine", "fail_date": "now()"}', "sortOrder": 1},
            {"ruleType": "UPDATE_OBJECT", "target": "Equipment", "conditionJson": '{"field": "equipCode"}',  "propertyMappingsJson": '{"status": "故障"}',  "sortOrder": 2},
            {"ruleType": "CUSTOM",        "target": "notify",    "conditionJson": '{"channel": "wechat"}',   "propertyMappingsJson": '{"to": "equipManager", "msg": "设备故障告警"}', "sortOrder": 3},
        ], ensure_ascii=False),
    },
    {
        "name": "component_replacement",
        "displayName": "零部件更换执行",
        "description": "根据故障诊断结论，对损坏零部件进行拆卸、更换、安装、调试的完整操作流程，含安全确认和功能验证。",
        "status": "ACTIVE",
        "triggerType": "MANUAL",
        "triggerConfigJson": json.dumps({
            "requireApproval": True,
            "approver": "equipment_engineer"
        }, ensure_ascii=False),
        "exceptionPolicy": "ABORT",
        "exceptionConfigJson": json.dumps({
            "rollbackOnFail": True,
            "notifyOnFail": True,
            "alertLevel": "HIGH"
        }, ensure_ascii=False),
        "validationRulesJson": json.dumps([
            {"name": "零件编码非空",   "condition": "params.compCode != null && params.compCode != ''",  "message": "必须填写更换零件的物料编码"},
            {"name": "设备已停机确认", "condition": "params.equipStopped == true",                        "message": "必须确认设备已安全停机后方可执行更换"},
            {"name": "备件库存充足",   "condition": "params.stockQty > 0",                               "message": "备件库存不足，请先申请采购"},
        ], ensure_ascii=False),
        "parametersJson": json.dumps([
            {"name": "equipCode",    "displayName": "设备编码",     "dataType": "STRING",  "required": True,  "defaultValue": ""},
            {"name": "compCode",     "displayName": "零件物料编码", "dataType": "STRING",  "required": True,  "defaultValue": ""},
            {"name": "compName",     "displayName": "零件名称",     "dataType": "STRING",  "required": True,  "defaultValue": ""},
            {"name": "equipStopped", "displayName": "设备已停机",   "dataType": "BOOLEAN", "required": True,  "defaultValue": "false"},
            {"name": "stockQty",     "displayName": "备件库存数量", "dataType": "INTEGER", "required": True,  "defaultValue": "0"},
            {"name": "technicianId", "displayName": "执行技工工号", "dataType": "STRING",  "required": False, "defaultValue": ""},
            {"name": "remark",       "displayName": "备注",         "dataType": "STRING",  "required": False, "defaultValue": ""},
        ], ensure_ascii=False),
        "rulesJson": json.dumps([
            {"ruleType": "UPDATE_OBJECT", "target": "Component", "conditionJson": '{"field": "compCode"}', "propertyMappingsJson": '{"last_replace": "today()", "status": "已更换"}', "sortOrder": 1},
            {"ruleType": "UPDATE_OBJECT", "target": "Equipment", "conditionJson": '{"field": "equipCode"}', "propertyMappingsJson": '{"status": "正常"}', "sortOrder": 2},
            {"ruleType": "CREATE_LINK",   "target": "component_fails", "conditionJson": '{}', "propertyMappingsJson": '{}', "sortOrder": 3},
        ], ensure_ascii=False),
    },
    {
        "name": "eightd_report_review",
        "displayName": "8D报告提交审核",
        "description": "8D 报告完成 D1-D8 填写后，触发多级审核流程：班组长 → 设备工程师 → 部门主管，逐级确认后关闭报告。",
        "status": "ACTIVE",
        "triggerType": "EVENT",
        "triggerConfigJson": json.dumps({
            "event": "eightd_report.submitted",
            "filter": {"status": "草稿"},
            "autoAssign": True
        }, ensure_ascii=False),
        "exceptionPolicy": "ROLLBACK",
        "exceptionConfigJson": json.dumps({
            "rollbackSteps": ["reset_status"],
            "maxRetries": 2,
            "retryDelay": 5000
        }, ensure_ascii=False),
        "validationRulesJson": json.dumps([
            {"name": "报告编号非空",     "condition": "params.reportId != null && params.reportId != ''", "message": "报告编号不能为空"},
            {"name": "完整性达标",       "condition": "params.completeness >= 80",                        "message": "报告完整度需达到80%方可提交"},
            {"name": "审核人已指定",     "condition": "params.reviewerId != null",                        "message": "必须指定审核责任人"},
        ], ensure_ascii=False),
        "parametersJson": json.dumps([
            {"name": "reportId",      "displayName": "报告编号",   "dataType": "STRING",  "required": True,  "defaultValue": ""},
            {"name": "completeness",  "displayName": "完整度(%)",  "dataType": "INTEGER", "required": True,  "defaultValue": "0"},
            {"name": "reviewerId",    "displayName": "审核人工号", "dataType": "STRING",  "required": True,  "defaultValue": ""},
            {"name": "reviewLevel",   "displayName": "审核层级",   "dataType": "STRING",  "required": False, "defaultValue": "班组长"},
            {"name": "autoClose",     "displayName": "通过后自动关闭", "dataType": "BOOLEAN", "required": False, "defaultValue": "false"},
        ], ensure_ascii=False),
        "rulesJson": json.dumps([
            {"ruleType": "UPDATE_OBJECT", "target": "EightDReport", "conditionJson": '{"field": "reportId"}', "propertyMappingsJson": '{"status": "审核中"}', "sortOrder": 1},
            {"ruleType": "CUSTOM",        "target": "notify_reviewer", "conditionJson": '{"channel": "email"}', "propertyMappingsJson": '{"to": "reviewerId", "template": "8d_review_request"}', "sortOrder": 2},
        ], ensure_ascii=False),
    },
    {
        "name": "preventive_maintenance",
        "displayName": "预防维保执行",
        "description": "基于历史故障规律制定周期性维保计划，按计划对高风险设备进行点检、润滑、紧固、参数校验等预防性作业。",
        "status": "ACTIVE",
        "triggerType": "SCHEDULE",
        "triggerConfigJson": json.dumps({
            "cron": "0 8 * * 1",
            "timezone": "Asia/Shanghai",
            "description": "每周一早8点自动触发维保计划生成"
        }, ensure_ascii=False),
        "exceptionPolicy": "SKIP",
        "exceptionConfigJson": json.dumps({
            "skipCondition": "equipment.status == '维修中'",
            "logSkip": True
        }, ensure_ascii=False),
        "validationRulesJson": json.dumps([
            {"name": "维保周期合法", "condition": "params.intervalDays >= 1 && params.intervalDays <= 365", "message": "维保周期必须在1~365天之间"},
            {"name": "执行人已指定", "condition": "params.technicianId != null && params.technicianId != ''", "message": "必须指定维保执行人"},
        ], ensure_ascii=False),
        "parametersJson": json.dumps([
            {"name": "equipCode",     "displayName": "设备编码",     "dataType": "STRING",  "required": True,  "defaultValue": ""},
            {"name": "intervalDays",  "displayName": "维保周期(天)", "dataType": "INTEGER", "required": True,  "defaultValue": "30"},
            {"name": "technicianId",  "displayName": "执行技工工号", "dataType": "STRING",  "required": True,  "defaultValue": ""},
            {"name": "taskType",      "displayName": "作业类型",     "dataType": "STRING",  "required": False, "defaultValue": "点检"},
            {"name": "checklistJson", "displayName": "点检项清单(JSON)", "dataType": "JSON", "required": False, "defaultValue": "[]"},
        ], ensure_ascii=False),
        "rulesJson": json.dumps([
            {"ruleType": "CREATE_OBJECT", "target": "MaintenanceRecord", "conditionJson": '{"auto": true}', "propertyMappingsJson": '{"equip_code": "equipCode", "task_type": "taskType", "plan_date": "today()"}', "sortOrder": 1},
            {"ruleType": "UPDATE_OBJECT", "target": "Equipment", "conditionJson": '{"field": "equipCode"}', "propertyMappingsJson": '{"last_maintain_date": "today()"}', "sortOrder": 2},
        ], ensure_ascii=False),
    },
    {
        "name": "failure_knowledge_archive",
        "displayName": "故障知识归档",
        "description": "将已关闭的 8D 报告关键信息提取入库：设备编码、故障模式、根因类别、有效措施，形成可复用的故障知识条目。",
        "status": "ACTIVE",
        "triggerType": "EVENT",
        "triggerConfigJson": json.dumps({
            "event": "eightd_report.closed",
            "filter": {"status": "已关闭"},
            "delay_seconds": 60
        }, ensure_ascii=False),
        "exceptionPolicy": "RETRY",
        "exceptionConfigJson": json.dumps({
            "maxRetries": 5,
            "retryDelay": 30000,
            "notifyOnFail": False
        }, ensure_ascii=False),
        "validationRulesJson": json.dumps([
            {"name": "报告已关闭",   "condition": "params.reportStatus == '已关闭'",    "message": "只有已关闭的8D报告才能归档"},
            {"name": "根因非空",     "condition": "params.causeDesc != null && params.causeDesc.length > 0", "message": "根本原因描述不能为空"},
            {"name": "措施有效验证", "condition": "params.verifyResult != null",         "message": "必须填写措施有效性验证结果"},
        ], ensure_ascii=False),
        "parametersJson": json.dumps([
            {"name": "reportId",      "displayName": "报告编号",     "dataType": "STRING", "required": True,  "defaultValue": ""},
            {"name": "reportStatus",  "displayName": "报告状态",     "dataType": "STRING", "required": True,  "defaultValue": "已关闭"},
            {"name": "causeDesc",     "displayName": "根本原因描述", "dataType": "STRING", "required": True,  "defaultValue": ""},
            {"name": "actionSummary", "displayName": "有效措施摘要", "dataType": "STRING", "required": True,  "defaultValue": ""},
            {"name": "verifyResult",  "displayName": "验证结果",     "dataType": "STRING", "required": True,  "defaultValue": ""},
            {"name": "tags",          "displayName": "知识标签(逗号分隔)", "dataType": "STRING", "required": False, "defaultValue": ""},
        ], ensure_ascii=False),
        "rulesJson": json.dumps([
            {"ruleType": "CREATE_OBJECT", "target": "KnowledgeEntry", "conditionJson": '{"auto": true}', "propertyMappingsJson": '{"source_report": "reportId", "cause": "causeDesc", "action": "actionSummary", "verify": "verifyResult", "tags": "tags"}', "sortOrder": 1},
        ], ensure_ascii=False),
    },
]

# 业务函数（替换测试数据）
BUSINESS_FUNCTIONS = [
    {
        "name": "故障严重度评分",
        "description": "根据故障类型、停机时长、是否停线等参数，计算故障综合严重度评分（0-100），用于故障优先级排序。",
        "scriptContent": """def run(input_data: dict) -> dict:
    \"\"\"
    计算故障严重度评分
    input_data:
      - fail_type: 故障类型 (机械/电气/控制/液压)
      - stop_line: 是否停线 (bool)
      - downtime_min: 停机时长(分钟)
      - severity: 严重程度 (高/中/低)
    returns:
      - score: 0-100 综合评分
      - level: 紧急/重要/一般
    \"\"\"
    base_scores = {"高": 60, "中": 35, "低": 15}
    type_weights = {"电气": 1.2, "控制": 1.15, "机械": 1.0, "液压": 1.1}

    base = base_scores.get(input_data.get("severity", "低"), 15)
    weight = type_weights.get(input_data.get("fail_type", "机械"), 1.0)
    downtime_bonus = min(input_data.get("downtime_min", 0) / 10, 20)
    stop_bonus = 20 if input_data.get("stop_line", False) else 0

    score = min(100, int(base * weight + downtime_bonus + stop_bonus))

    if score >= 75:
        level = "紧急"
    elif score >= 45:
        level = "重要"
    else:
        level = "一般"

    return {"score": score, "level": level}
""",
        "status": "ACTIVE"
    },
    {
        "name": "8D报告完整性检查",
        "description": "对 8D 报告各字段进行完整性和合规性检查，返回缺失项列表和完成度百分比，辅助审核人员快速定位问题。",
        "scriptContent": """def run(input_data: dict) -> dict:
    \"\"\"
    8D 报告完整性检查
    input_data: 8D 报告字段 dict
    returns:
      - completeness: 完成度百分比
      - missing_fields: 缺失字段列表
      - passed: 是否达到提交标准(>= 80%)
    \"\"\"
    required_fields = {
        "report_id":    "报告编号",
        "problem_desc": "D2 问题描述",
        "d3_contain":   "D3 遏制措施",
        "cause_desc":   "D4 根本原因",
        "action_content": "D5/D6 改进措施",
        "create_date":  "创建日期",
    }
    optional_fields = {
        "d8_close_date": "D8 关闭日期",
        "verify_result": "验证结果",
    }

    missing = []
    for key, label in required_fields.items():
        val = input_data.get(key)
        if not val or (isinstance(val, str) and not val.strip()):
            missing.append(label)

    filled = len(required_fields) - len(missing)
    completeness = int(filled / len(required_fields) * 100)

    return {
        "completeness": completeness,
        "missing_fields": missing,
        "passed": completeness >= 80
    }
""",
        "status": "ACTIVE"
    },
    {
        "name": "相似故障检索",
        "description": "根据当前故障的设备类型和故障描述关键词，在知识库中匹配历史相似故障案例，返回最相关的 TOP-5 案例摘要。",
        "scriptContent": """def run(input_data: dict) -> dict:
    \"\"\"
    相似故障检索（规则匹配版本）
    input_data:
      - equip_type: 设备类型
      - fail_desc: 故障描述
      - knowledge_base: 历史案例列表 (可选)
    returns:
      - matches: 匹配案例列表 (最多5条)
      - match_count: 匹配数量
    \"\"\"
    equip_type = input_data.get("equip_type", "")
    fail_desc = input_data.get("fail_desc", "").lower()
    knowledge = input_data.get("knowledge_base", [])

    keywords = [w for w in fail_desc.split() if len(w) >= 2]
    results = []

    for case in knowledge:
        score = 0
        if equip_type and case.get("equip_type") == equip_type:
            score += 40
        case_desc = case.get("fail_desc", "").lower()
        for kw in keywords:
            if kw in case_desc:
                score += 10
        if score > 0:
            results.append({**case, "_score": score})

    results.sort(key=lambda x: x["_score"], reverse=True)
    top5 = [{k: v for k, v in c.items() if k != "_score"} for c in results[:5]]

    return {"matches": top5, "match_count": len(top5)}
""",
        "status": "ACTIVE"
    },
    {
        "name": "维保周期计算",
        "description": "根据设备类型、运行时长和历史故障频率，动态计算各零部件的推荐维保周期（天），输出维保计划建议表。",
        "scriptContent": """def run(input_data: dict) -> dict:
    \"\"\"
    维保周期计算
    input_data:
      - equip_type: 设备类型
      - run_hours: 累计运行小时数
      - fault_count_12m: 过去12个月故障次数
      - components: 零部件列表 [{comp_name, design_lifespan_hours}]
    returns:
      - maintenance_plan: 各零件推荐维保周期(天)
      - risk_level: 设备整体风险等级
    \"\"\"
    run_hours = input_data.get("run_hours", 0)
    fault_count = input_data.get("fault_count_12m", 0)
    components = input_data.get("components", [])

    # 风险等级
    if fault_count >= 5 or run_hours >= 40000:
        risk = "高"
        cycle_factor = 0.6
    elif fault_count >= 2 or run_hours >= 20000:
        risk = "中"
        cycle_factor = 0.8
    else:
        risk = "低"
        cycle_factor = 1.0

    plan = []
    for comp in components:
        lifespan_h = comp.get("design_lifespan_hours", 8760)
        base_days = int(lifespan_h / 24 * cycle_factor)
        base_days = max(7, min(base_days, 365))
        plan.append({
            "comp_name": comp.get("comp_name", "未知零件"),
            "recommended_days": base_days,
        })

    return {"maintenance_plan": plan, "risk_level": risk}
""",
        "status": "ACTIVE"
    },
]


# ──────────────────── 执行步骤 ────────────────────

def step1_clean_relations(h):
    """删除冗余关系类型，只保留核心关系名称集合"""
    section("STEP 1 · 清理冗余关系类型")

    # 从数据库侧获取当前所有关系（通过 project detail 接口无法全量获取，从 schema 删除接口遍历）
    # 先拿实体类型列表
    import sqlite3
    db = sqlite3.connect("/Users/braum/work/github/CCcode/backend/data/devicedb.sqlite")
    db.row_factory = sqlite3.Row
    rels = [dict(r) for r in db.execute(
        "SELECT id, name FROM pm_relation_types WHERE project_id=?", [PROJECT_ID]
    ).fetchall()]
    db.close()

    # 要保留的名称
    keep_names = {r[0] for r in CORE_RELATIONS}

    deleted = 0
    kept = 0
    for rel in rels:
        if rel["name"] in keep_names:
            kept += 1
            print(f"  ✓ 保留: {rel['name']}")
        else:
            ok = delete(h, f"{BASE}/schema/relation-types/{rel['id']}")
            if ok:
                deleted += 1
                print(f"  🗑  删除: {rel['name']}")

    print(f"\n  结果：删除 {deleted} 条，保留 {kept} 条")


def step2_create_core_relations(h):
    """创建10条标准核心关系"""
    section("STEP 2 · 创建核心关系类型")

    import sqlite3
    db = sqlite3.connect("/Users/braum/work/github/CCcode/backend/data/devicedb.sqlite")
    db.row_factory = sqlite3.Row
    existing = {r["name"] for r in db.execute(
        "SELECT name FROM pm_relation_types WHERE project_id=?", [PROJECT_ID]
    ).fetchall()}
    db.close()

    created = 0
    for name, domain, rang, desc in CORE_RELATIONS:
        if name in existing:
            print(f"  ↩ 已存在，跳过: {name}")
            continue
        result = post(h, f"{BASE}/schema/relation-types", {
            "name": name, "domain": domain, "range": rang, "description": desc
        })
        if result:
            created += 1
            print(f"  ✅ 创建: {name} ({domain} → {rang})")

    print(f"\n  结果：新建 {created} 条关系类型")


def step3_update_entity_properties(h):
    """更新现有实体类型属性（补全字段）"""
    section("STEP 3 · 补全实体属性")

    import sqlite3
    db = sqlite3.connect("/Users/braum/work/github/CCcode/backend/data/devicedb.sqlite")
    db.row_factory = sqlite3.Row
    entities = {r["name"]: r["id"] for r in db.execute(
        "SELECT id, name FROM pm_entity_types WHERE project_id=?", [PROJECT_ID]
    ).fetchall()}
    db.close()

    for ent_name, cfg in ENTITY_UPDATES.items():
        eid = entities.get(ent_name)
        if not eid:
            print(f"  ⚠️  实体不存在，跳过: {ent_name}")
            continue
        result = put(h, f"{BASE}/schema/entity-types/{eid}", {
            "name": ent_name,
            "description": cfg["description"],
            "properties": cfg["properties"]
        })
        if result:
            prop_count = len(result.get("properties", []))
            print(f"  ✅ {ent_name}: {prop_count} 个属性")


def step4_create_new_entities(h):
    """新增 Component 和 Workshop 实体类型"""
    section("STEP 4 · 新增实体类型（Component / Workshop）")

    import sqlite3
    db = sqlite3.connect("/Users/braum/work/github/CCcode/backend/data/devicedb.sqlite")
    db.row_factory = sqlite3.Row
    existing = {r["name"] for r in db.execute(
        "SELECT name FROM pm_entity_types WHERE project_id=?", [PROJECT_ID]
    ).fetchall()}
    db.close()

    for ent in NEW_ENTITIES:
        if ent["name"] in existing:
            print(f"  ↩ 已存在，跳过: {ent['name']}")
            continue
        result = post(h, f"{BASE}/schema/entity-types", ent)
        if result:
            print(f"  ✅ 创建: {ent['name']} ({len(ent['properties'])} 个属性)")


def step5_replace_actions(h):
    """替换测试动作 → 专业业务动作（含完整5Tab数据）"""
    section("STEP 5 · 替换业务动作")

    import sqlite3
    db = sqlite3.connect("/Users/braum/work/github/CCcode/backend/data/devicedb.sqlite")
    db.row_factory = sqlite3.Row
    old_actions = [dict(r) for r in db.execute(
        "SELECT id, name FROM pm_project_actions WHERE project_id=?", [PROJECT_ID]
    ).fetchall()]
    db.close()

    # 删除旧动作
    for act in old_actions:
        ok = delete(h, f"{BASE}/actions/{act['id']}")
        if ok:
            print(f"  🗑  删除旧动作: {act['name']}")

    # 创建新动作（含全量字段）
    created = 0
    for act in BUSINESS_ACTIONS:
        # POST 创建（只传基础字段）
        result = post(h, f"{BASE}/actions", {
            "name": act["name"],
            "displayName": act["displayName"],
            "description": act["description"],
            "status": act["status"],
        })
        if not result:
            continue

        action_id = result["id"]

        # PUT 补全详细数据（参数、规则、触发、异常、校验）
        detail_fields = {
            "triggerType":         act.get("triggerType", "MANUAL"),
            "triggerConfigJson":   act.get("triggerConfigJson", ""),
            "exceptionPolicy":     act.get("exceptionPolicy", "IGNORE"),
            "exceptionConfigJson": act.get("exceptionConfigJson", ""),
            "validationRulesJson": act.get("validationRulesJson", ""),
            "parametersJson":      act.get("parametersJson", ""),
            "rulesJson":           act.get("rulesJson", ""),
        }
        updated = put(h, f"{BASE}/actions/{action_id}", detail_fields)
        if updated:
            created += 1
            params_count = len(json.loads(act.get("parametersJson", "[]")))
            rules_count  = len(json.loads(act.get("rulesJson", "[]")))
            vld_count    = len(json.loads(act.get("validationRulesJson", "[]")))
            print(f"  ✅ 创建动作: {act['displayName']}")
            print(f"     触发方式: {act.get('triggerType','MANUAL')} | 参数: {params_count} | 规则: {rules_count} | 校验: {vld_count}")

    print(f"\n  结果：删除 {len(old_actions)} 条，新建 {created} 条")


def step6_replace_functions(h):
    """替换测试函数 → 专业业务函数"""
    section("STEP 6 · 替换业务函数")

    import sqlite3
    db = sqlite3.connect("/Users/braum/work/github/CCcode/backend/data/devicedb.sqlite")
    db.row_factory = sqlite3.Row
    old_fns = [dict(r) for r in db.execute(
        "SELECT id, name FROM pm_project_functions WHERE project_id=?", [PROJECT_ID]
    ).fetchall()]
    db.close()

    # 删除旧函数
    for fn in old_fns:
        ok = delete(h, f"{BASE}/functions/{fn['id']}")
        if ok:
            print(f"  🗑  删除旧函数: {fn['name']}")

    # 创建新函数
    created = 0
    for fn in BUSINESS_FUNCTIONS:
        result = post(h, f"{BASE}/functions", fn)
        if result:
            created += 1
            print(f"  ✅ 创建函数: {fn['name']}")

    print(f"\n  结果：删除 {len(old_fns)} 条，新建 {created} 条")


def print_summary(h):
    """打印最终概览"""
    import sqlite3
    db = sqlite3.connect("/Users/braum/work/github/CCcode/backend/data/devicedb.sqlite")
    db.row_factory = sqlite3.Row
    PID = PROJECT_ID

    ents  = db.execute("SELECT count(*) FROM pm_entity_types WHERE project_id=?", [PID]).fetchone()[0]
    rels  = db.execute("SELECT count(*) FROM pm_relation_types WHERE project_id=?", [PID]).fetchone()[0]
    props = db.execute("SELECT count(*) FROM pm_schema_properties WHERE project_id=?", [PID]).fetchone()[0]
    acts  = db.execute("SELECT count(*) FROM pm_project_actions WHERE project_id=?", [PID]).fetchone()[0]
    fns   = db.execute("SELECT count(*) FROM pm_project_functions WHERE project_id=?", [PID]).fetchone()[0]
    db.close()

    section("优化完成 · 最终统计")
    print(f"  实体类型:   {ents} 个")
    print(f"  关系类型:   {rels} 条")
    print(f"  属性字段:   {props} 个")
    print(f"  业务动作:   {acts} 条")
    print(f"  业务函数:   {fns} 个")
    print()


def main():
    h = login()
    step1_clean_relations(h)
    step2_create_core_relations(h)
    step3_update_entity_properties(h)
    step4_create_new_entities(h)
    step5_replace_actions(h)
    step6_replace_functions(h)
    print_summary(h)


if __name__ == "__main__":
    main()
