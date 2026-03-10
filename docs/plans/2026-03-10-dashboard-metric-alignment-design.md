# Dashboard Metric Alignment Design

## Context

The dashboard homepage currently shows headline counts for `数据源`, `Object Types`, and `数字员工`, but those values do not come from the same APIs used by the source pages. The dashboard keeps its own mock stats store and also hardcodes pipeline stage counts, which causes visible mismatches with the actual list pages.

The required business mapping is now confirmed:

- `数据源` must match `/datasource`
- `本体数量` must mean ontology project count from `/ontology/projects`
- `worker 数量` must mean digital human count from `/digital-worker/business`

## Problem

The current implementation has two separate sources of truth:

1. `frontend/src/api/dashboard.ts` stores independent summary counts
2. `frontend/src/pages/platform/DashboardPage.tsx` hardcodes pipeline stage counts

This makes the dashboard drift as soon as data sources, ontology projects, or digital humans are added or removed elsewhere in the app.

## Approved Direction

Make dashboard stats an aggregation layer over the existing feature APIs instead of a separate metrics store.

This keeps the dashboard aligned with the same mock stores already used by the source pages and removes the need to manually sync seeded counts.

## Mapping

### Top Summary Cards

- `数据源` -> `listDataSources().length`
- `本体项目` -> `listProjects().length`
- `Agent / Skills` -> keep current dashboard-specific source for now
- other cards -> keep current dashboard-specific source for now

### Pipeline Overview

- `L1 数据源` -> `listDataSources().length`
- `L3 本体层` -> `listProjects().length`
- `L7 数字员工` -> `listDigitalHumans().length`
- all other stage counts -> keep current dashboard-specific values for now

### Business Outcomes

- `已上线数字员工` -> `listDigitalHumans().length`

## Architecture

`frontend/src/api/dashboard.ts` becomes the single aggregation boundary for dashboard stats:

- load the dashboard store as before for activity and the remaining operational metrics
- read data source count from `frontend/src/api/dataSource.ts`
- read ontology project count from `frontend/src/api/projectManagement.ts`
- read digital human count from `frontend/src/api/digitalHuman.ts`
- merge those counts into the returned `PlatformStats`

`frontend/src/pages/platform/DashboardPage.tsx` should render pipeline stage counts from fetched stats instead of embedded constants for the aligned metrics.

## Error Handling

If one aggregated source fails, the dashboard should still render. For this mock frontend, a conservative fallback is acceptable:

- keep the existing dashboard store defaults for non-aligned metrics
- for aligned metrics, fall back to the stored stat value if aggregation fails

## Testing

Add source-driven regression coverage:

- verify `getPlatformStats()` returns aggregated counts from data sources, projects, and digital humans
- verify the dashboard page source no longer renders `Object Types`
- verify the dashboard page source renders `本体项目`
- verify the dashboard page source no longer hardcodes the old L1/L3/L7 pipeline counts

## Out of Scope

- redefining `Agent / Skills` mapping
- changing activity feed content
- replacing the remaining mock operational stats
