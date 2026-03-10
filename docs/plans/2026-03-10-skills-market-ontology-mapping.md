# Skills Market Ontology Mapping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Skills Hub mock domain into a recommendation-first mixed market backed by the 108 ontology presets, including ontology-to-skill mapping logic, improved mock data, and a durable data document.

**Architecture:** Extend the existing `Skill` type with market and ontology mapping metadata, generate deterministic market data from ontology presets plus general skill templates, and update the Skills Hub page to present recommendations and richer filtering on top of the new store. Keep `frontend/src/api/skillsMarket.ts` as the persistence boundary, but move default data construction into dedicated mock modules under `frontend/src/mocks/skills/`.

**Tech Stack:** React 19, TypeScript 5.9, Ant Design 6, Vitest, existing mock-store API

---

### Task 1: Define the mixed market data model

**Files:**
- Modify: `frontend/src/types/skill.ts`
- Test: `frontend/src/mocks/skills/skillGenerator.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { buildDefaultSkillsMarketStore } from './skillGenerator'

describe('skillGenerator market model', () => {
  it('generates business and general skills with ontology mapping metadata', () => {
    const store = buildDefaultSkillsMarketStore()
    expect(store.skills.some((skill) => skill.marketType === 'business')).toBe(true)
    expect(store.skills.some((skill) => skill.marketType === 'general')).toBe(true)
    expect(store.skills.every((skill) => Array.isArray(skill.sourceOntologyCodes))).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/mocks/skills/skillGenerator.test.ts`
Expected: FAIL because `buildDefaultSkillsMarketStore` and the extended market fields do not exist yet.

**Step 3: Write minimal implementation**

Update `frontend/src/types/skill.ts` to add:

```ts
export type SkillMarketType = 'business' | 'general'
export type SkillCoverageLevel = 'core' | 'enhanced' | 'optional'
export type SkillIndustry = 'manufacturing' | 'retail' | 'medical' | 'transport' | 'general'

export interface Skill {
  // existing fields...
  marketType: SkillMarketType
  industry: SkillIndustry
  phase: string
  featured: boolean
  recommendedScore: number
  usageCount: number
  successRate?: number
  avgLatencyMs?: number
  sourceOntologyCodes: string[]
  sourceOntologyNames: string[]
  recommendedFor: string[]
  capabilities: string[]
  coverageLevel: SkillCoverageLevel
  recommendationReason: string
}

export interface SkillsMarketInsightStats {
  totalSkills: number
  businessSkills: number
  generalSkills: number
  coveredOntologies: number
  coveredIndustries: number
}

export interface SkillsMarketStore {
  skills: Skill[]
  importableFunctions: OntologyFunctionItemLike[]
  featuredSkillIds: string[]
  industryBuckets: { industry: SkillIndustry; skillIds: string[] }[]
  ontologySkillMappings: { ontologyCode: string; ontologyName: string; skillIds: string[] }[]
  insightStats: SkillsMarketInsightStats
}
```

Use a local lightweight `OntologyFunctionItemLike` interface in `skill.ts` to avoid circular type imports.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/mocks/skills/skillGenerator.test.ts`
Expected: PASS once the generator exists in later tasks and the type compile errors are resolved.

**Step 5: Commit**

```bash
git add frontend/src/types/skill.ts frontend/src/mocks/skills/skillGenerator.test.ts
git commit -m "feat: add skills market ontology metadata model"
```

### Task 2: Build deterministic ontology-driven market generators

**Files:**
- Create: `frontend/src/mocks/skills/ontologyCatalog.ts`
- Create: `frontend/src/mocks/skills/skillTemplates.ts`
- Create: `frontend/src/mocks/skills/skillGenerator.ts`
- Modify: `frontend/src/api/projectManagement.ts`
- Test: `frontend/src/mocks/skills/skillGenerator.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { buildDefaultSkillsMarketStore } from './skillGenerator'

describe('skillGenerator coverage', () => {
  it('covers all ontology presets with at least one business skill and two mapped skills', () => {
    const store = buildDefaultSkillsMarketStore()
    expect(store.ontologySkillMappings).toHaveLength(108)
    expect(store.ontologySkillMappings.every((item) => item.skillIds.length >= 2)).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/mocks/skills/skillGenerator.test.ts`
Expected: FAIL because no generator or coverage mapping exists.

**Step 3: Write minimal implementation**

1. Export ontology preset data from `frontend/src/api/projectManagement.ts`:

```ts
export type OntologyDef = [string, string, string, string, string, string, string, number]
export const ONTOLOGY_DEFS: OntologyDef[] = [/* existing 108 definitions */]
```

2. In `frontend/src/mocks/skills/ontologyCatalog.ts`, normalize the ontology presets:

```ts
export interface OntologyCatalogEntry {
  code: string
  name: string
  industry: SkillIndustry
  phase: string
  triple: string
  agentScene: string
  trainingType: string
  dataCount: number
}

export const ONTOLOGY_CATALOG = ONTOLOGY_DEFS.map(([code, name, industry, phase, triple, agentScene, trainingType, dataCount]) => ({
  code,
  name,
  industry: industry as SkillIndustry,
  phase,
  triple,
  agentScene,
  trainingType,
  dataCount,
}))
```

3. In `frontend/src/mocks/skills/skillTemplates.ts`, define 20 to 30 reusable general skill templates with stable metadata.

4. In `frontend/src/mocks/skills/skillGenerator.ts`, implement:

```ts
export function buildDefaultSkillsMarketStore(): SkillsMarketStore {
  const businessSkills = ONTOLOGY_CATALOG.map(buildBusinessSkillFromOntology)
  const generalSkills = buildGeneralSkillLibrary()
  const ontologySkillMappings = ONTOLOGY_CATALOG.map((ontology) => {
    const related = collectSkillIdsForOntology(ontology, businessSkills, generalSkills)
    return { ontologyCode: ontology.code, ontologyName: ontology.name, skillIds: related }
  })
  return buildStore({ businessSkills, generalSkills, ontologySkillMappings })
}
```

Use deterministic heuristics for:

- business skill naming
- capability assignment
- general skill recommendation
- featured flags
- recommendation score
- usage metrics

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/mocks/skills/skillGenerator.test.ts`
Expected: PASS with full ontology coverage and stable generated market data.

**Step 5: Commit**

```bash
git add frontend/src/api/projectManagement.ts frontend/src/mocks/skills/ontologyCatalog.ts frontend/src/mocks/skills/skillTemplates.ts frontend/src/mocks/skills/skillGenerator.ts frontend/src/mocks/skills/skillGenerator.test.ts
git commit -m "feat: generate mixed skills market from ontology presets"
```

### Task 3: Refactor the Skills Hub API around the generated store

**Files:**
- Modify: `frontend/src/api/skillsMarket.ts`
- Test: `frontend/src/api/skillsMarket.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { listSkills } from './skillsMarket'

describe('skillsMarket defaults', () => {
  it('loads a generated mixed market and preserves ontology metadata', async () => {
    const skills = await listSkills()
    expect(skills.length).toBeGreaterThan(100)
    expect(skills[0]).toHaveProperty('marketType')
    expect(skills.some((skill) => skill.sourceOntologyCodes.length > 0)).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/api/skillsMarket.test.ts`
Expected: FAIL because `skillsMarket.ts` still uses the old single-skill default store.

**Step 3: Write minimal implementation**

Refactor `frontend/src/api/skillsMarket.ts` so:

```ts
import { buildDefaultSkillsMarketStore } from '../mocks/skills/skillGenerator'

const DEFAULT_STORE: SkillsMarketStore = buildDefaultSkillsMarketStore()

export async function listSkills(): Promise<Skill[]> {
  return (await loadStore()).skills
}

export async function listOntologySkillMappings() {
  return (await loadStore()).ontologySkillMappings
}

export async function getSkillsMarketInsightStats() {
  return (await loadStore()).insightStats
}
```

Also fix the ontology import de-duplication bug by comparing imported function IDs or normalized skill names instead of flattening tags.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/api/skillsMarket.test.ts`
Expected: PASS and the default store now contains mixed market data.

**Step 5: Commit**

```bash
git add frontend/src/api/skillsMarket.ts frontend/src/api/skillsMarket.test.ts
git commit -m "feat: back skills market api with generated mock store"
```

### Task 4: Add page helpers for recommendation and filtering

**Files:**
- Create: `frontend/src/pages/platform/skillsMarket.helpers.ts`
- Create: `frontend/src/pages/platform/skillsMarket.helpers.test.ts`
- Modify: `frontend/src/pages/platform/SkillsMarketPage.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { buildDefaultSkillsMarketStore } from '../../mocks/skills/skillGenerator'
import { getFeaturedSkills, filterSkills } from './skillsMarket.helpers'

describe('skillsMarket helpers', () => {
  it('returns featured skills sorted by recommendation score', () => {
    const store = buildDefaultSkillsMarketStore()
    const featured = getFeaturedSkills(store.skills, 6)
    expect(featured).toHaveLength(6)
    expect(featured[0].recommendedScore).toBeGreaterThanOrEqual(featured[1].recommendedScore)
  })

  it('filters by market type, industry, phase, and search text', () => {
    const store = buildDefaultSkillsMarketStore()
    const filtered = filterSkills(store.skills, {
      marketType: 'business',
      industry: 'manufacturing',
      phase: '生产',
      query: '故障',
    })
    expect(filtered.every((skill) => skill.marketType === 'business')).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/pages/platform/skillsMarket.helpers.test.ts`
Expected: FAIL because no helper module exists yet.

**Step 3: Write minimal implementation**

Create `frontend/src/pages/platform/skillsMarket.helpers.ts`:

```ts
export function getFeaturedSkills(skills: Skill[], limit = 6): Skill[] {
  return [...skills]
    .filter((skill) => skill.featured)
    .sort((a, b) => b.recommendedScore - a.recommendedScore)
    .slice(0, limit)
}

export function filterSkills(skills: Skill[], filters: SkillsMarketFilters): Skill[] {
  // apply market type, industry, category, phase, coverage level, and text search
}
```

Update the page to use helpers instead of inline filter duplication.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/pages/platform/skillsMarket.helpers.test.ts`
Expected: PASS and the filtering behavior is covered by unit tests.

**Step 5: Commit**

```bash
git add frontend/src/pages/platform/skillsMarket.helpers.ts frontend/src/pages/platform/skillsMarket.helpers.test.ts frontend/src/pages/platform/SkillsMarketPage.tsx
git commit -m "feat: add recommendation and filtering helpers for skills market"
```

### Task 5: Upgrade the Skills Hub page to recommendation-first UX

**Files:**
- Modify: `frontend/src/pages/platform/SkillsMarketPage.tsx`
- Modify: `frontend/src/styles/global.css`
- Test: `frontend/src/pages/platform/skillsMarket.helpers.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { buildDefaultSkillsMarketStore } from '../../mocks/skills/skillGenerator'
import { summarizeMarketStats } from './skillsMarket.helpers'

describe('skills market summaries', () => {
  it('summarizes business, general, ontology, and industry coverage metrics', () => {
    const store = buildDefaultSkillsMarketStore()
    const stats = summarizeMarketStats(store)
    expect(stats.businessSkills).toBeGreaterThan(0)
    expect(stats.generalSkills).toBeGreaterThan(0)
    expect(stats.coveredOntologies).toBe(108)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/pages/platform/skillsMarket.helpers.test.ts`
Expected: FAIL because the summary helper and new page assumptions do not exist yet.

**Step 3: Write minimal implementation**

In `frontend/src/pages/platform/SkillsMarketPage.tsx`:

1. Add a featured recommendation section above the table.
2. Replace duplicated category filter UI with one unified filter row.
3. Add new stats cards for:
   - total skills
   - business skills
   - general skills
   - covered ontologies
   - covered industries
4. Add table columns for:
   - market type
   - industry
   - linked ontology
   - recommendation reason
   - execution metrics
5. Enrich the detail modal with:
   - source ontologies
   - recommendation scenes
   - capabilities
   - coverage level

In `frontend/src/styles/global.css`, add focused styles for featured market cards and compact metadata rows.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/pages/platform/skillsMarket.helpers.test.ts`
Expected: PASS, and the page compiles with the new helpers and fields.

**Step 5: Commit**

```bash
git add frontend/src/pages/platform/SkillsMarketPage.tsx frontend/src/styles/global.css frontend/src/pages/platform/skillsMarket.helpers.test.ts
git commit -m "feat: redesign skills market around ontology recommendations"
```

### Task 6: Add the durable data document for future iteration

**Files:**
- Create: `docs/skills-market-ontology-mapping.md`

**Step 1: Write the failing test**

There is no automated test for this documentation task. Validation is manual.

**Step 2: Run test to verify it fails**

Skip. This is a documentation-only task.

**Step 3: Write minimal implementation**

Create `docs/skills-market-ontology-mapping.md` with sections for:

- background and scope
- ontology source structure
- general skill template library
- business skill generation rules
- ontology-to-skill mapping rules
- field dictionary
- recommendation score rules
- iteration strategy

Include concrete examples for:

- one manufacturing ontology
- one retail ontology
- one general business ontology

**Step 4: Run test to verify it passes**

Manual verification:

- open the document
- confirm it matches the implemented fields and generator rules

**Step 5: Commit**

```bash
git add docs/skills-market-ontology-mapping.md
git commit -m "docs: add skills market ontology mapping data guide"
```

### Task 7: Run final verification

**Files:**
- Verify: `frontend/src/types/skill.ts`
- Verify: `frontend/src/api/skillsMarket.ts`
- Verify: `frontend/src/pages/platform/SkillsMarketPage.tsx`
- Verify: `frontend/src/mocks/skills/skillGenerator.ts`
- Verify: `docs/skills-market-ontology-mapping.md`

**Step 1: Write the failing test**

No new test code. This task verifies the completed implementation.

**Step 2: Run test to verify it fails**

Skip.

**Step 3: Write minimal implementation**

No code changes unless verification reveals defects.

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- --run frontend/src/mocks/skills/skillGenerator.test.ts frontend/src/api/skillsMarket.test.ts frontend/src/pages/platform/skillsMarket.helpers.test.ts
```

Then run:

```bash
npm run build
```

Expected:

- all targeted tests PASS
- frontend build succeeds

**Step 5: Commit**

If verification required fixes, commit those fixes with a focused message.
