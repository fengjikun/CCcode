# Property Datasource Mapping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support entity-property source binding (`dataSourceId/sourceTable/sourceColumn`) and datasource-owned `mappingMap` (`table -> columns`) with validated persistence and UI configuration.

**Architecture:** Extend project management persistence in two places: datasource rows keep a JSON mapping map, and schema property rows keep optional source references. Backend service layer normalizes and validates both models; frontend exposes mapping map editor in datasource modal and three-level cascading selectors in entity property editor.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic v2, React 19, Ant Design 6, TypeScript 5.

---

### Task 1: Add Failing Backend Tests for Datasource `mapping_map`

**Skills:** @superpowers/test-driven-development  
**Files:**
- Create: `backend/tests/test_project_mgmt_datasource_mapping.py`
- Modify: `backend/tests/test_project_mgmt_datasource_mapping.py`
- Test: `backend/tests/test_project_mgmt_datasource_mapping.py`

**Step 1: Write the failing test**

```python
def test_create_data_source_persists_mapping_map_and_returns_it(self):
    payload = {
        "name": "MES-main",
        "type": "MYSQL",
        "host": "127.0.0.1",
        "port": 3306,
        "database": "mes_prod",
        "schema": "",
        "username": "readonly",
        "password": "pw",
        "ssl_enabled": False,
        "enabled": True,
        "extract_mode": "TABLE",
        "tables": ["device"],
        "custom_sql": "",
        "row_limit": 1000,
        "sync_mode": "FULL",
        "incremental_column": "",
        "mapping_map": {"device": ["id", "serial_no"]},
    }
    row = svc.create_data_source(self.db, 1, "proj_map_1", payload)
    self.assertEqual(row["mapping_map"], {"device": ["id", "serial_no"]})
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m unittest tests.test_project_mgmt_datasource_mapping.ProjectDataSourceMappingTests.test_create_data_source_persists_mapping_map_and_returns_it -v`  
Expected: FAIL because response has no `mapping_map`.

**Step 3: Write minimal implementation**

Implement datasource model/schema/service support for `mapping_map_json` and response field.

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m unittest tests.test_project_mgmt_datasource_mapping.ProjectDataSourceMappingTests.test_create_data_source_persists_mapping_map_and_returns_it -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/tests/test_project_mgmt_datasource_mapping.py backend/app/models/project_mgmt.py backend/app/schemas/project_mgmt.py backend/app/services/project_mgmt_service.py backend/alembic/versions/<revision>_add_datasource_mapping_and_property_source_fields.py
git commit -m "test+feat(project-mgmt): support datasource mapping_map persistence"
```

---

### Task 2: Add Failing Backend Tests for `mapping_map` Validation

**Skills:** @superpowers/test-driven-development  
**Files:**
- Modify: `backend/tests/test_project_mgmt_datasource_mapping.py`
- Test: `backend/tests/test_project_mgmt_datasource_mapping.py`

**Step 1: Write the failing test**

```python
def test_create_data_source_rejects_invalid_mapping_map_shape(self):
    payload = self._base_data_source_payload()
    payload["mapping_map"] = {"device": ["", "serial_no"]}
    with self.assertRaises(ValueError):
        svc.create_data_source(self.db, 1, "proj_map_1", payload)
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m unittest tests.test_project_mgmt_datasource_mapping.ProjectDataSourceMappingTests.test_create_data_source_rejects_invalid_mapping_map_shape -v`  
Expected: FAIL because invalid column values are not validated yet.

**Step 3: Write minimal implementation**

Add `_normalize_mapping_map_payload` helper and call it from `_validate_data_source_payload`.

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m unittest tests.test_project_mgmt_datasource_mapping.ProjectDataSourceMappingTests.test_create_data_source_rejects_invalid_mapping_map_shape -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/tests/test_project_mgmt_datasource_mapping.py backend/app/services/project_mgmt_service.py
git commit -m "test+feat(project-mgmt): validate datasource mapping_map payload"
```

---

### Task 3: Add Failing Backend Tests for Entity Property Source Mapping

**Skills:** @superpowers/test-driven-development  
**Files:**
- Modify: `backend/tests/test_project_mgmt_datasource_mapping.py`
- Test: `backend/tests/test_project_mgmt_datasource_mapping.py`

**Step 1: Write the failing tests**

```python
def test_create_entity_type_persists_property_source_mapping(self):
    entity = svc.create_entity_type(self.db, 1, "proj_map_1", {
        "name": "Device",
        "properties": [{
            "name": "serial_no",
            "display_name": "序列号",
            "data_source_id": self.ds_id,
            "source_table": "device",
            "source_column": "serial_no",
        }],
    })
    prop = entity["properties"][0]
    self.assertEqual(prop["data_source_id"], self.ds_id)
    self.assertEqual(prop["source_table"], "device")
    self.assertEqual(prop["source_column"], "serial_no")

def test_create_entity_type_rejects_unknown_source_column(self):
    with self.assertRaises(ValueError):
        svc.create_entity_type(self.db, 1, "proj_map_1", {
            "name": "Device",
            "properties": [{
                "name": "serial_no",
                "data_source_id": self.ds_id,
                "source_table": "device",
                "source_column": "not_exists",
            }],
        })
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python -m unittest tests.test_project_mgmt_datasource_mapping.ProjectDataSourceMappingTests.test_create_entity_type_persists_property_source_mapping tests.test_project_mgmt_datasource_mapping.ProjectDataSourceMappingTests.test_create_entity_type_rejects_unknown_source_column -v`  
Expected: FAIL because property source fields are missing and not validated.

**Step 3: Write minimal implementation**

Add source fields to `SchemaProperty` model/schema and normalize/validate in service.

**Step 4: Run tests to verify they pass**

Run: same command as Step 2  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/tests/test_project_mgmt_datasource_mapping.py backend/app/models/project_mgmt.py backend/app/schemas/project_mgmt.py backend/app/services/project_mgmt_service.py backend/alembic/versions/<revision>_add_datasource_mapping_and_property_source_fields.py
git commit -m "test+feat(project-mgmt): support validated entity property source mapping"
```

---

### Task 4: Wire Backend Response Models and Project Detail Aggregation

**Skills:** @superpowers/test-driven-development  
**Files:**
- Modify: `backend/tests/test_project_mgmt_datasource_mapping.py`
- Modify: `backend/app/services/project_mgmt_service.py`
- Modify: `backend/app/schemas/project_mgmt.py`

**Step 1: Write the failing test**

```python
def test_get_project_detail_contains_mapping_map_and_property_sources(self):
    detail = svc.get_project_detail(self.db, 1, "proj_map_1")
    ds = detail["data_sources"][0]
    self.assertIn("mapping_map", ds)
    ent = detail["schema_config"]["entity_types"][0]
    self.assertIn("data_source_id", ent["properties"][0])
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m unittest tests.test_project_mgmt_datasource_mapping.ProjectDataSourceMappingTests.test_get_project_detail_contains_mapping_map_and_property_sources -v`  
Expected: FAIL if response serialization omits new fields.

**Step 3: Write minimal implementation**

Ensure `_to_data_source_response`, `_to_schema_property_response`, and schema payload builders include all new fields.

**Step 4: Run test to verify it passes**

Run: same as Step 2  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/tests/test_project_mgmt_datasource_mapping.py backend/app/services/project_mgmt_service.py backend/app/schemas/project_mgmt.py
git commit -m "test+feat(project-mgmt): expose mapping metadata in project detail responses"
```

---

### Task 5: Frontend Types and API Mapping for New Fields

**Skills:** @superpowers/test-driven-development  
**Files:**
- Modify: `frontend/src/types/projectMvp.ts`
- Modify: `frontend/src/api/projectManagement.ts`

**Step 1: Write a failing type-level check**

Create temporary check in `frontend/src/types/projectMvp.ts` usage block (or dedicated `frontend/src/types/projectMvp.typecheck.ts`) that expects:

```typescript
const ds: StructuredDataSource = {} as any
ds.mappingMap.device.includes('serial_no')
const prop: EntityPropertyConfig = {} as any
prop.dataSourceId
```

**Step 2: Run type check to verify it fails**

Run: `cd frontend && npm run build`  
Expected: FAIL because new fields are missing.

**Step 3: Write minimal implementation**

Add `mappingMap` in datasource type/API payload mapping and `dataSourceId/sourceTable/sourceColumn` in property type/API mapping.

**Step 4: Run type check to verify it passes**

Run: `cd frontend && npm run build`  
Expected: PASS for type check changes.

**Step 5: Commit**

```bash
git add frontend/src/types/projectMvp.ts frontend/src/api/projectManagement.ts
git commit -m "feat(frontend): add mapping metadata types and api mapping"
```

---

### Task 6: Add Datasource Mapping Map Editor in `DataSourceModal`

**Skills:** @superpowers/test-driven-development  
**Files:**
- Modify: `frontend/src/pages/workspace/modals/DataSourceModal.tsx`
- Modify: `frontend/src/pages/workspace/constants.ts` (if helper constants needed)

**Step 1: Add failing behavior assertion (manual acceptance baseline)**

Document baseline: open "新增数据源" modal, no `映射 Map` editor exists.

**Step 2: Verify baseline fails acceptance**

Run: `cd frontend && npm run dev`  
Expected: UI lacks mapping editor (manual fail against new requirement).

**Step 3: Write minimal implementation**

Add mapping section with `Form.List`:

```tsx
{ key: string; table: string; columns: string[] }
```

Normalize submit payload:

```typescript
mappingMap: rows.reduce<Record<string, string[]>>((acc, row) => {
  const table = row.table.trim()
  const cols = (row.columns || []).map(c => c.trim()).filter(Boolean)
  if (table && cols.length > 0) acc[table] = Array.from(new Set(cols))
  return acc
}, {})
```

**Step 4: Verify requirement passes**

Run: `cd frontend && npm run build`  
Expected: PASS and modal can configure mapping rows manually in dev UI.

**Step 5: Commit**

```bash
git add frontend/src/pages/workspace/modals/DataSourceModal.tsx frontend/src/pages/workspace/constants.ts
git commit -m "feat(frontend): add datasource mapping map editor"
```

---

### Task 7: Add Cascading Source Selectors to Entity Property Form and Mapping Tag Display

**Skills:** @superpowers/test-driven-development  
**Files:**
- Modify: `frontend/src/pages/workspace/modals/SchemaFormModal.tsx`
- Modify: `frontend/src/pages/workspace/tabs/SchemaTab.tsx`
- Modify: `frontend/src/pages/workspace/types.ts` (if props typing changes)

**Step 1: Add failing behavior assertion (manual acceptance baseline)**

Document baseline: entity property card has no `数据源/来源表/来源列` cascaders, tree has no mapping tag.

**Step 2: Verify baseline fails acceptance**

Run: `cd frontend && npm run dev`  
Expected: current UI cannot bind property source.

**Step 3: Write minimal implementation**

- Pass `project.dataSources` into `SchemaFormModal`.
- In entity property list add 3 selects with cascading reset.
- Restrict mapping controls to entity mode only.
- In `SchemaTab` property node add:

```tsx
{property.dataSourceId && property.sourceTable && property.sourceColumn && (
  <Tag color="cyan">
    {dataSourceNameById.get(property.dataSourceId) || property.dataSourceId}
    {' · '}
    {property.sourceTable}.{property.sourceColumn}
  </Tag>
)}
```

**Step 4: Verify requirement passes**

Run: `cd frontend && npm run build && npm run lint`  
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/pages/workspace/modals/SchemaFormModal.tsx frontend/src/pages/workspace/tabs/SchemaTab.tsx frontend/src/pages/workspace/types.ts
git commit -m "feat(frontend): support entity property source selectors and mapping tags"
```

---

### Task 8: End-to-End Verification Before Completion

**Skills:** @superpowers/verification-before-completion  
**Files:**
- Verify only: backend + frontend changed files

**Step 1: Run backend target tests**

Run:

```bash
cd backend && python -m unittest tests.test_project_mgmt_datasource_mapping -v
```

Expected: all tests PASS.

**Step 2: Run backend regression suite slice**

Run:

```bash
cd backend && python -m unittest tests.test_extraction_run_ai_pipeline tests.test_ai_insight_openai_pipeline -v
```

Expected: PASS (no regression in schema/extraction behavior).

**Step 3: Run frontend verification**

Run:

```bash
cd frontend && npm run build && npm run lint
```

Expected: PASS.

**Step 4: Manual acceptance checks**

- Create datasource with mapping map rows.
- Edit entity property and select datasource/table/column.
- Save and reload page; selection persists.
- Schema tree shows mapping tag.
- Relation property editor does not show mapping selectors.

**Step 5: Final commit**

```bash
git add backend/app/models/project_mgmt.py backend/app/schemas/project_mgmt.py backend/app/services/project_mgmt_service.py backend/alembic/versions/<revision>_add_datasource_mapping_and_property_source_fields.py backend/tests/test_project_mgmt_datasource_mapping.py frontend/src/types/projectMvp.ts frontend/src/api/projectManagement.ts frontend/src/pages/workspace/modals/DataSourceModal.tsx frontend/src/pages/workspace/modals/SchemaFormModal.tsx frontend/src/pages/workspace/tabs/SchemaTab.tsx
git commit -m "feat(project-mgmt): add datasource mapping map and entity property source binding"
```
