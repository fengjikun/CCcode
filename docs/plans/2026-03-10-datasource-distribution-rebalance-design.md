# Datasource Distribution Rebalance Design

**Date:** 2026-03-10

## Background

The datasource seeding work now generates ontology-aligned datasource records and supports both database and object storage connections. However, the current distribution is mechanically symmetric: every ontology produces exactly one database datasource and exactly one object storage datasource.

This creates an obvious mock pattern in the UI:

1. Database count equals object storage count.
2. Every ontology is paired one-to-one across source categories.
3. The generated catalog lacks realistic skew across industries and project maturity.

The user requested a more enterprise-like distribution where databases are clearly more common than object storage.

## Goal

Make the datasource page look materially less synthetic by shifting from one-to-one ontology pairing to an industry-biased distribution where:

- databases are clearly more numerous than object storage
- some ontologies have only databases
- some ontologies have databases plus one object storage source
- a smaller subset has multiple databases

## Non-Goals

1. No UI redesign in this iteration.
2. No backend mock-store router changes.
3. No change to datasource CRUD semantics.
4. No attempt to model every enterprise integration nuance.

## Current Root Cause

The page is currently showing the seeded data correctly after the store versioning fix. The unrealistic appearance now comes from the generation rules themselves, not from loading behavior.

The most synthetic rules today are:

- `flatMap()` always emits two records per ontology
- object storage is always present
- secondary database sources never appear
- naming suffixes are too uniform

## Options

### Option A: Lightweight skew

Keep one database for every ontology and add object storage only for selected ontologies.

Pros:

- smallest logic change
- immediately breaks the one-to-one symmetry

Cons:

- still too uniform because every ontology has exactly one database

### Option B: Industry-biased multi-shape distribution

Generate datasource bundles by industry and ontology shape:

- every ontology gets one primary database
- only selected ontologies get object storage
- selected ontologies get a second database

Pros:

- realistic skew without overcomplication
- better visual variation in the table and stat cards
- straightforward to test

Cons:

- more generator rules to maintain than Option A

### Option C: Full maturity-tier simulation

Introduce project maturity tiers and source bundles such as pilot, operational, archive-heavy, and analytics-heavy.

Pros:

- strongest realism

Cons:

- too much rule surface for this mock layer

## Recommendation

Choose Option B.

It is the best balance between realism and maintainability. It removes the obvious one-to-one pattern while keeping the generator deterministic and understandable.

## Proposed Distribution

### Baseline

Every ontology gets one primary database datasource.

### Secondary database rules

Only some ontologies receive a second database source, based on industry and position:

- manufacturing: more frequent second databases
- retail: moderate second databases
- medical: occasional second databases
- transport: rare second databases
- general: rare second databases

These represent combinations like:

- operational DB + analytics DB
- ERP + MES
- transaction DB + subject mart

### Object storage rules

Object storage appears only for selected ontologies, biased toward document-heavy or archive-heavy cases:

- medical: relatively higher object storage ratio
- retail: moderate ratio
- manufacturing: limited ratio
- transport: low ratio
- general: very low ratio

These represent:

- document lakes
- imaging archives
- contract buckets
- extraction result storage

### Naming variation

Move away from only `_db` and `_bucket`.

Use weighted suffixes:

- database: `主库`, `业务库`, `分析库`, `台账库`, `归档库`
- object storage: `文档仓`, `资料桶`, `归档桶`, `附件仓`

Visible names remain Chinese and business-facing. Internal IDs can stay ASCII-safe and deterministic.

## Expected Outcome

With 108 ontology presets, the target visual shape should be approximately:

- databases: 120 to 130
- object storage: 25 to 35

The exact count does not need to be hard-coded in UI copy, but tests should assert broad distribution properties:

- database count > object storage count
- object storage count > 0
- at least some ontologies have multiple database sources

## Migration Strategy

The datasource store already uses `_v` versioning. Increment the datasource data version again so existing seeded stores automatically migrate to the new distribution on next load.

## Files To Change

- `frontend/src/api/dataSource.ts`
  Rework generator rules and bump store version.
- `frontend/src/api/dataSource.test.ts`
  Replace exact 1:1 distribution assertions with realistic distribution checks and migration checks.

## Verification

1. Focused datasource API tests.
2. Frontend build.
3. Manual spot-check of resulting counts in the datasource page after refresh.
