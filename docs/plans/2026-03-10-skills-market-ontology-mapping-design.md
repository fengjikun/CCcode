# Skills Market Ontology Mapping Design

**Date:** 2026-03-10

## Background

The current Skills Hub mock implementation only contains a minimal static dataset and does not reflect the 108 ontology presets already defined in the project. At the same time, the product direction requires a mixed market that contains both ontology-driven business skills and reusable general-purpose skills.

This creates three gaps:

1. The market does not express which skills are recommended for which ontology.
2. The mock dataset is too small and too manual to support iteration.
3. There is no durable data document describing how ontology definitions drive market data.

## Goals

1. Analyze the 108 ontology presets and define what skill capabilities they require.
2. Upgrade the Skills Hub mock data into a mixed market:
   - business skills driven by ontologies
   - general-purpose skills reusable across industries
3. Make the market recommendation-first instead of table-first.
4. Introduce a reusable mock data generation model so future iterations modify rules and templates, not large hard-coded arrays.
5. Produce a data document that records ontology-to-skill mapping logic and the mock data generation rules.

## Non-Goals

1. No backend API redesign in this iteration.
2. No graph-style dependency visualization between skills and agents in this iteration.
3. No attempt to fully replace project management or ontology runtime data models.

## Current State

### Ontology source

`frontend/src/api/projectManagement.ts` already contains `ONTOLOGY_DEFS`, a structured set of 108 ontology presets with:

- ontology code
- ontology name
- industry
- business phase
- triple example
- agent scene
- training type
- data volume

This file is currently the best mock source of truth for ontology-driven recommendation.

### Skills market

`frontend/src/api/skillsMarket.ts` currently exposes a tiny static store with one skill and one importable function. The current `Skill` shape is sufficient for CRUD demos but cannot explain:

- whether a skill is business or general
- which ontology recommends it
- which industry or business phase it covers
- why it is recommended

### UI

`frontend/src/pages/platform/SkillsMarketPage.tsx` is currently a management table with create/edit/import/detail flows. It is not recommendation-first and has duplicated filtering patterns called out in `todo.md`.

## Proposed Approach

Use a mixed market with an ontology mapping layer.

The implementation should keep the existing editable market behavior, but enrich the underlying mock data and UI so the page can answer:

- what skills are recommended
- for which ontology
- for which industry and phase
- whether the skill is business-specific or general-purpose
- why the recommendation exists

## Option Review

### Option A: Expand static skill list only

Add many more mock skills to the existing array and stop there.

Pros:

- lowest implementation cost
- minimal refactor

Cons:

- no ontology mapping model
- no recommendation explanation
- future maintenance remains manual

### Option B: Mixed market with ontology mapping layer

Define a rule-driven market model based on ontology source data, business skill generation, and general skill templates.

Pros:

- supports all 108 ontologies
- supports a mixed market
- scalable for future mock iteration
- aligns with recommendation-first UX

Cons:

- requires type expansion and data generation logic

### Option C: Full relationship graph market

Model skills, ontologies, agents, and scenarios as a relationship graph with advanced visual exploration.

Pros:

- richest model

Cons:

- too large for the current iteration
- over-designed for the current UI and mock stack

### Recommendation

Choose Option B.

It solves the immediate product need without creating a fragile manual dataset or forcing a premature graph system.

## Target Architecture

The new mock system should be split into four layers.

### 1. Ontology analysis layer

Reuse the ontology preset source and normalize it into a market-oriented shape:

- ontology code
- ontology name
- industry
- phase
- triple summary
- agent scene
- training type
- data volume

### 2. Skill template layer

Define reusable templates for:

- general skills
- business skills

General templates should cover common cross-domain capabilities such as:

- document parsing
- data cleaning
- entity extraction
- relation extraction
- graph synthesis
- root-cause analysis
- report generation
- workflow orchestration
- alerting
- compliance review
- risk scoring
- KPI attribution
- conversational QA
- work order generation
- data validation

### 3. Market generation layer

For each ontology:

1. generate one primary business skill
2. attach two to four general skills based on mapping rules
3. produce market aggregates for recommendation and filtering

Expected result:

- about 108 business skills
- about 20 to 30 general skills
- ontology-to-skill mapping coverage for all ontology presets

### 4. Documentation layer

Document:

- ontology classification
- required skill categories
- mapping rules
- mock field dictionary
- iteration strategy

## Data Model Changes

Keep the existing `Skill` shape and extend it.

### Existing fields to retain

- `id`
- `name`
- `displayName`
- `category`
- `status`
- `description`
- `instructions`
- `reference`
- `templates`
- `scripts`
- `dependencies`
- `tags`
- `installs`
- `author`
- `createdAt`
- `updatedAt`

### New market fields

- `marketType: 'business' | 'general'`
- `industry: 'manufacturing' | 'retail' | 'medical' | 'transport' | 'general'`
- `phase: string`
- `featured: boolean`
- `recommendedScore: number`
- `usageCount: number`
- `successRate?: number`
- `avgLatencyMs?: number`

### New ontology mapping fields

- `sourceOntologyCodes: string[]`
- `sourceOntologyNames: string[]`
- `recommendedFor: string[]`
- `capabilities: string[]`
- `coverageLevel: 'core' | 'enhanced' | 'optional'`
- `recommendationReason: string`

### New store aggregates

The skill market store should add:

- `featuredSkillIds: string[]`
- `industryBuckets: { industry: string; skillIds: string[] }[]`
- `ontologySkillMappings: { ontologyCode: string; ontologyName: string; skillIds: string[] }[]`
- `insightStats`

This allows the page to render recommendation blocks without recomputing large scans everywhere.

## Recommendation Rules

### Business skill generation

Each ontology produces one primary business skill.

Input fields:

- ontology name
- industry
- phase
- triple example
- agent scene
- training type

Generated business skill fields include:

- canonical skill name
- display name
- market type = business
- source ontology references
- recommended scene
- capability set
- recommendation reason
- baseline usage metrics for mock display

### General skill mapping rules

Each ontology also maps to two to four general skills.

Example mapping heuristics:

- ontology names or scenes containing document, standard, policy, contract:
  - document parsing
  - compliance review
- ontology names or scenes containing prediction, analysis, root cause:
  - data cleaning
  - root-cause analysis
  - report generation
- ontology names or scenes containing dispatch, work order, execution:
  - workflow orchestration
  - alerting
  - work order generation
- ontology names or scenes containing graph, knowledge, semantic:
  - entity extraction
  - relation extraction
  - graph synthesis

### Recommendation score

Use a deterministic score rather than random ordering.

Suggested factors:

- ontology relevance
- business-vs-general priority
- training type
- data volume band
- featured template weight

This should keep recommendation output stable for demos and tests.

## UI Design

The Skills Hub should become recommendation-first while keeping the table for management actions.

### Page structure

1. summary stats
2. featured recommendation section
3. unified filter bar
4. table/list section
5. richer detail drawer or modal content

### Recommended top section

Show 6 to 8 recommended cards sorted by:

1. `featured`
2. `recommendedScore`
3. business skills before general skills

Each card should show:

- skill name
- market type
- industry
- ontology count
- recommendation reason
- execution metrics

### Filters

Use one unified set of filters:

- market type
- industry
- category
- phase
- coverage level
- free-text search

Search should match:

- skill name
- tags
- ontology name
- agent scene

### Table additions

Add columns for:

- market type
- industry
- linked ontology
- recommendation reason
- execution metrics

The table remains the main place for edit/enable/delete operations.

### Details

The detail view should surface:

- source ontologies
- recommendation scenes
- capabilities
- suggested companion general skills

## Mock Data Organization

Move the skill market mock construction to a dedicated mock domain under `frontend/src/mocks/`.

Suggested files:

- `frontend/src/mocks/skills/ontologyCatalog.ts`
- `frontend/src/mocks/skills/skillTemplates.ts`
- `frontend/src/mocks/skills/skillGenerator.ts`
- `frontend/src/mocks/skills/skillsMarketStore.ts`
- `frontend/src/mocks/skills/skillsMarketInsights.ts`

The API file `frontend/src/api/skillsMarket.ts` should become a thin persistence wrapper around this generated default store.

## Data Documentation

Add a standalone data document:

- `docs/skills-market-ontology-mapping.md`

Suggested contents:

1. background and purpose
2. ontology source structure
3. general skill template library
4. business skill generation rules
5. ontology-to-skill mapping rules
6. field dictionary
7. recommendation scoring strategy
8. future iteration and backend migration path

## Testing Strategy

Add deterministic tests around the generation logic.

Coverage should include:

1. ontology preset count is covered
2. every ontology maps to at least one business skill
3. every ontology maps to at least two total skills
4. generated skill fields are stable and typed
5. recommendation buckets and featured IDs are consistent
6. search/filter helpers operate on new fields correctly

## Risks

### Risk 1: Data volume makes the page noisy

Mitigation:

- recommendation-first layout
- sensible default filters
- stable featured section

### Risk 2: Mock data drifts from ontology source

Mitigation:

- treat ontology presets as the generation source of truth
- keep generation deterministic

### Risk 3: UI file remains too large

Mitigation:

- extract helper functions and market sections where needed
- keep the current page behavior but reduce inline data logic

## Success Criteria

The iteration is successful when:

1. the Skills Hub no longer relies on a single static example skill
2. the market contains both business and general skills
3. all 108 ontology presets are represented in recommendation mapping
4. the page can explain why a skill is recommended
5. the mock generation rules are documented for future iteration
