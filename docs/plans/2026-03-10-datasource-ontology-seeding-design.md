# Datasource Ontology Seeding Design

**Date:** 2026-03-10

## Background

The platform datasource page at `frontend/src/pages/platform/DataSourcePage.tsx` currently reads a tiny local mock store from `frontend/src/api/dataSource.ts`. That store contains only two generic datasource records and does not reflect the ontology catalog already defined in `frontend/src/api/projectManagement.ts`.

The product requirement for this iteration is to seed datasource records that align with the ontology list and support both database-style sources and object-storage-style sources. The current UI labels `unstructured` as "对象存储", but the underlying type model only supports file-like values such as `CSV`, `PDF`, and `Word`. That mismatch makes the page look broader than the model it actually supports.

There is also a source-of-truth detail that matters for this implementation: the project code currently defines 109 ontology presets in `ONTOLOGY_DEFS`, not 108. The datasource generator must follow the code, not stale external counts.

## Goals

1. Generate datasource mock data from the ontology preset catalog instead of hand-maintaining a tiny static array.
2. Cover every ontology preset with deterministic datasource naming that includes ontology context.
3. Support both structured database sources and true object storage sources in the datasource model and UI.
4. Keep the page fully editable through the existing local mock-store flow.
5. Make the generated records realistic enough for demos: varied engines, endpoints, record counts, sync frequencies, status, and descriptions.

## Non-Goals

1. No backend API redesign in this iteration.
2. No project-workspace datasource redesign in this iteration.
3. No attempt to unify the platform datasource page and project-level datasource model yet.
4. No live connectivity to real databases or object storage services.

## Current State

### Ontology source

`frontend/src/api/projectManagement.ts` already contains `ONTOLOGY_DEFS`, the best mock source of truth for ontology names, industries, phases, and approximate data volume.

### Datasource model

`frontend/src/types/dataSource.ts` currently defines:

- `structured` vs `unstructured`
- structured types: `MySQL`, `PostgreSQL`, `Oracle`, `SQL Server`, `SAP ERP`, `MongoDB`
- unstructured types: `CSV`, `Excel`, `JSON`, `XML`, `PDF`, `Word`, `TXT`
- a `DataSourceConnection` shape that only supports either database fields or a single `fileName`

This is insufficient for representing object storage.

### Datasource page

`frontend/src/pages/platform/DataSourcePage.tsx` already has:

- filtering
- create/edit/delete
- detail modal
- test connection flow

The page is therefore a good consumer for richer generated data, but its form and detail sections need to be updated for object storage fields.

## Options

### Option A: Seed ontology-aligned data without changing the model

Reuse the existing file-like unstructured types and only generate more rows.

Pros:

- lowest code change
- fast implementation

Cons:

- "对象存储" remains fake
- generated rows still do not match the requested semantics

### Option B: Add real object storage modeling and seed from ontology presets

Extend the datasource types and page to support object storage engines such as `S3`, `OSS`, and `MinIO`, then generate deterministic datasource rows from ontology presets.

Pros:

- matches the requested demo semantics
- keeps datasource page behavior coherent
- makes future mock expansion rule-driven instead of manual

Cons:

- touches type model, data generator, and UI

### Option C: Rebuild both platform datasource page and project datasource workspace together

Use one cross-app datasource model and seed all pages in one pass.

Pros:

- eventual consistency

Cons:

- too large for this request
- higher regression risk

## Recommendation

Choose Option B.

It solves the actual requirement with bounded scope. The page will genuinely support database and object storage records, and the seed data will be derived from ontology presets instead of a tiny manual array.

## Proposed Design

### 1. Introduce a datasource generation layer

Use the ontology catalog from `frontend/src/api/projectManagement.ts` as input and build the default datasource store from deterministic rules.

For each ontology preset:

1. generate one structured datasource
2. generate one object storage datasource

Expected result:

- 109 structured records
- 109 object storage records
- 218 total default datasource records

### 2. Extend the datasource type system

Keep category as:

- `structured`
- `unstructured`

But redefine unstructured types as true object storage engines:

- `S3`
- `OSS`
- `MinIO`

Retain structured database engines already used by the page.

Extend `DataSourceConnection` with object storage fields:

- `endpoint`
- `bucket`
- `region`
- `pathPrefix`
- `accessKey`
- `secretKey`

Structured fields remain:

- `host`
- `port`
- `database`
- `username`
- `password`

### 3. Generate realistic ontology-aligned records

Datasource naming should reflect ontology and industry context. Example pattern:

- structured: `<industry>_<ontology>_db`
- object storage: `<industry>_<ontology>_bucket`

Descriptions should mention the ontology scope, business phase, and intended extraction content.

Generation rules should vary:

- database engine by industry and index
- object storage engine by industry and index
- sync frequency by ontology phase and data volume
- status and last sync by deterministic index rules
- record count using ontology `dataCount` as the base signal

The generator must sanitize datasource names into stable ASCII-friendly IDs while keeping the visible display name readable in Chinese.

### 4. Update page forms and detail rendering

`frontend/src/pages/platform/DataSourcePage.tsx` should:

- show object storage type choices for `unstructured`
- render object storage fields instead of file name
- send the correct connection payload into `createDataSource`
- display object storage connection details in the detail modal
- keep structured test connection behavior
- return a storage-specific success message for object storage tests

### 5. Preserve mock-store CRUD behavior

`frontend/src/api/dataSource.ts` remains the persistence boundary using `mockStoreClient`. The only change is that the default store becomes generator-driven rather than a tiny hard-coded array.

This keeps user-created and edited datasource records durable in local storage after the first load.

## Files To Change

- `frontend/src/api/projectManagement.ts`
  Export ontology definitions for reuse.
- `frontend/src/types/dataSource.ts`
  Extend datasource type system for object storage.
- `frontend/src/api/dataSource.ts`
  Replace static defaults with generator-driven ontology datasource records.
- `frontend/src/pages/platform/DataSourcePage.tsx`
  Update create form, connection tests, and detail rendering for object storage.
- `frontend/src/api/dataSource.test.ts`
  Add datasource generator and CRUD-focused tests.

## Testing Strategy

1. Add tests that prove the default datasource store covers every ontology preset with one structured and one object storage datasource.
2. Add tests that prove object storage datasource creation stores the new connection fields.
3. Run focused Vitest coverage for the datasource API.
4. Run a frontend build to catch type regressions in the updated page.

## Risks

1. `DataSourcePage.tsx` is already modified in the current workspace, so edits must be rebased carefully onto the existing file state.
2. Exporting `ONTOLOGY_DEFS` from `projectManagement.ts` must avoid changing existing behavior.
3. Local storage versioning is not built into `dataSource.ts`, so default-store regeneration must not break existing persisted user data unexpectedly.

## Mitigations

1. Read the current page before editing and make minimal scoped changes.
2. Export only the ontology constant and type alias already in use.
3. Keep the datasource API backward-compatible when loading previously persisted records where possible, and use generated defaults only for fresh stores.
