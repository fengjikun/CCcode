# Datasource Ontology Seeding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the platform datasource mock system so it seeds ontology-aligned datasource records for every ontology preset and supports both database sources and true object storage sources on the datasource page.

**Architecture:** Export the ontology preset catalog from `frontend/src/api/projectManagement.ts`, extend the datasource type model with object storage engines and connection fields, then generate the default datasource store deterministically in `frontend/src/api/dataSource.ts`. Update `frontend/src/pages/platform/DataSourcePage.tsx` to create, test, and display object storage records while preserving the existing mock-store CRUD flow.

**Tech Stack:** React 19, TypeScript 5.9, Ant Design 6, Vitest, local mock-store API

---

### Task 1: Export ontology presets for datasource generation

**Files:**
- Modify: `frontend/src/api/projectManagement.ts`
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { ONTOLOGY_DEFS } from './projectManagement'

describe('projectManagement ontology exports', () => {
  it('exports ontology presets for datasource generation', () => {
    expect(Array.isArray(ONTOLOGY_DEFS)).toBe(true)
    expect(ONTOLOGY_DEFS.length).toBeGreaterThan(100)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: FAIL because `ONTOLOGY_DEFS` is not exported yet or the test file does not exist.

**Step 3: Write minimal implementation**

Update `frontend/src/api/projectManagement.ts`:

```ts
export type OntologyDef = [string, string, string, string, string, string, string, number]

export const ONTOLOGY_DEFS: OntologyDef[] = [
  // existing ontology preset definitions
]
```

Keep all runtime behavior unchanged; only expose the source catalog for reuse.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: PASS for the export assertion.

**Step 5: Commit**

```bash
git add frontend/src/api/projectManagement.ts frontend/src/api/dataSource.test.ts
git commit -m "feat: export ontology presets for datasource seeding"
```

### Task 2: Extend datasource types for real object storage support

**Files:**
- Modify: `frontend/src/types/dataSource.ts`
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { OBJECT_STORAGE_TYPES } from '../types/dataSource'

describe('dataSource types', () => {
  it('exposes object storage datasource types', () => {
    expect(OBJECT_STORAGE_TYPES).toEqual(['S3', 'OSS', 'MinIO'])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: FAIL because `OBJECT_STORAGE_TYPES` and the new storage types do not exist.

**Step 3: Write minimal implementation**

Update `frontend/src/types/dataSource.ts` to:

```ts
export type ObjectStorageType = 'S3' | 'OSS' | 'MinIO'
export type DataSourceType = StructuredType | ObjectStorageType

export const OBJECT_STORAGE_TYPES: ObjectStorageType[] = ['S3', 'OSS', 'MinIO']

export interface DataSourceConnection {
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  endpoint?: string
  bucket?: string
  region?: string
  pathPrefix?: string
  accessKey?: string
  secretKey?: string
}
```

Update labels and icons so the page can render these new types.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: PASS for the type export assertion.

**Step 5: Commit**

```bash
git add frontend/src/types/dataSource.ts frontend/src/api/dataSource.test.ts
git commit -m "feat: add object storage datasource types"
```

### Task 3: Generate ontology-aligned default datasource records

**Files:**
- Modify: `frontend/src/api/dataSource.ts`
- Modify: `frontend/src/api/projectManagement.ts`
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { listDataSources } from './dataSource'
import { ONTOLOGY_DEFS } from './projectManagement'

describe('dataSource defaults', () => {
  it('generates one database datasource and one object storage datasource per ontology', async () => {
    const list = await listDataSources()
    expect(list.length).toBe(ONTOLOGY_DEFS.length * 2)
    const grouped = new Map(list.map((item) => [item.name, item]))
    expect(list.some((item) => item.category === 'structured')).toBe(true)
    expect(list.some((item) => item.category === 'unstructured')).toBe(true)
    expect(list.some((item) => item.type === 'S3' || item.type === 'OSS' || item.type === 'MinIO')).toBe(true)
    expect(grouped.has('制造业_故障诊断本体_db')).toBe(true)
    expect(grouped.has('制造业_故障诊断本体_bucket')).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: FAIL because the default store is still a two-item static array.

**Step 3: Write minimal implementation**

Refactor `frontend/src/api/dataSource.ts`:

```ts
function buildDefaultItems(): DataSource[] {
  return ONTOLOGY_DEFS.flatMap((def, index) => {
    const [code, ontologyName, industry, phase, , agentScene, , dataCount] = def
    return [
      buildStructuredDataSource({ code, ontologyName, industry, phase, agentScene, dataCount, index }),
      buildObjectStorageDataSource({ code, ontologyName, industry, phase, agentScene, dataCount, index }),
    ]
  })
}

const DEFAULT_STORE: DSStore = {
  items: buildDefaultItems(),
}
```

Use deterministic helpers for:

- display name generation
- stable ASCII ids
- engine rotation
- record count
- sync frequency
- status
- structured connection fields
- object storage connection fields

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: PASS with full ontology coverage.

**Step 5: Commit**

```bash
git add frontend/src/api/dataSource.ts frontend/src/api/projectManagement.ts frontend/src/api/dataSource.test.ts
git commit -m "feat: seed ontology-aligned datasource defaults"
```

### Task 4: Preserve CRUD behavior for object storage datasource records

**Files:**
- Modify: `frontend/src/api/dataSource.ts`
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { createDataSource, getDataSource } from './dataSource'

describe('dataSource object storage CRUD', () => {
  it('creates an object storage datasource with bucket connection fields', async () => {
    const created = await createDataSource({
      name: '测试对象存储',
      category: 'unstructured',
      type: 'MinIO',
      connection: {
        endpoint: 'https://minio.demo.local',
        bucket: 'ontology-fault-diagnosis',
        region: 'cn-east-1',
        pathPrefix: 'fault-diagnosis/',
        accessKey: 'demo-access',
        secretKey: 'demo-secret',
      },
      syncFrequency: 'daily',
      description: '对象存储测试数据源',
    })

    const loaded = await getDataSource(created.id)
    expect(loaded?.connection.bucket).toBe('ontology-fault-diagnosis')
    expect(loaded?.type).toBe('MinIO')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: FAIL until the updated type model and persistence path accept the new fields cleanly.

**Step 3: Write minimal implementation**

Keep `createDataSource`, `updateDataSource`, and `getDataSource` generic over the extended `DataSourceConnection` shape so the new fields persist without special casing.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: PASS for CRUD with object storage fields.

**Step 5: Commit**

```bash
git add frontend/src/api/dataSource.ts frontend/src/api/dataSource.test.ts
git commit -m "feat: persist object storage datasource records"
```

### Task 5: Update the datasource page form and detail modal

**Files:**
- Modify: `frontend/src/pages/platform/DataSourcePage.tsx`
- Modify: `frontend/src/types/dataSource.ts`
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { testConnection } from './dataSource'

describe('dataSource connection testing', () => {
  it('returns an object-storage specific success message for storage endpoints', async () => {
    const result = await testConnection({
      endpoint: 'https://s3.demo.local',
      bucket: 'ontology-demo',
      region: 'cn-north-1',
    })
    expect(result.success).toBe(true)
    expect(result.message).toContain('对象存储')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: FAIL because `testConnection` always returns a database-specific message.

**Step 3: Write minimal implementation**

Update `frontend/src/pages/platform/DataSourcePage.tsx` to:

- use `OBJECT_STORAGE_TYPES` for `unstructured`
- replace the `fileName` field with:
  - `endpoint`
  - `bucket`
  - `region`
  - `pathPrefix`
  - `accessKey`
  - `secretKey`
- validate storage fields before test/create
- render storage details in the details modal

Update `testConnection` in `frontend/src/api/dataSource.ts`:

```ts
export async function testConnection(connection: DataSourceConnection) {
  if (connection.endpoint && connection.bucket) {
    return { success: true, message: '对象存储连接成功，Bucket 可访问' }
  }
  return { success: true, message: '连接成功，数据库版本 8.0.35' }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: PASS with storage-aware connection messaging.

**Step 5: Commit**

```bash
git add frontend/src/pages/platform/DataSourcePage.tsx frontend/src/types/dataSource.ts frontend/src/api/dataSource.ts frontend/src/api/dataSource.test.ts
git commit -m "feat: add object storage support to datasource page"
```

### Task 6: Verify the final behavior

**Files:**
- Modify: none
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Run focused tests**

Run: `npm test -- --run frontend/src/api/dataSource.test.ts`
Expected: PASS for ontology coverage, object storage typing, CRUD persistence, and connection messaging.

**Step 2: Run broader safety tests**

Run: `npm test -- --run frontend/src/pages/platform/DashboardPage.layout.test.ts frontend/src/pages/workspace/navigation.test.ts`
Expected: PASS to confirm no broad frontend regression from shared imports.

**Step 3: Run build verification**

Run: `npm run build`
Expected: PASS with no TypeScript errors from the updated datasource types and page.

**Step 4: Commit**

```bash
git add frontend/src/api/projectManagement.ts frontend/src/types/dataSource.ts frontend/src/api/dataSource.ts frontend/src/pages/platform/DataSourcePage.tsx frontend/src/api/dataSource.test.ts docs/plans/2026-03-10-datasource-ontology-seeding-design.md docs/plans/2026-03-10-datasource-ontology-seeding.md
git commit -m "feat: seed ontology-aligned datasource catalog"
```
