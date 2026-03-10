# Remove Ontology Overview Design

**Date:** 2026-03-10

## Background

The frontend still exposes a dedicated "本体概览" entry under the Deepology section. The user wants this capability removed completely, not merely hidden from navigation.

Current direct entry points are:

- menu entry in `frontend/src/components/layout/AppLayout.tsx`
- route registration in `frontend/src/App.tsx`
- page implementation in `frontend/src/pages/platform/OntologyOverviewPage.tsx`
- supporting API module in `frontend/src/api/ontologyOverview.ts`
- supporting type module in `frontend/src/types/ontologyOverview.ts`

## Goal

Remove the ontology overview menu, route, page, and directly associated client-side support code so the feature no longer exists in the shipped frontend.

## Non-Goals

1. No change to project workspace, project list, or ontology management flows.
2. No redesign of the remaining Deepology navigation structure.
3. No backend cleanup unless a hard frontend reference still points to it.

## Options

### Option A: Hide entry points only

Remove the menu item and route but keep page and helper files in the repository.

Pros:

- smallest change
- easy rollback

Cons:

- leaves dead code behind
- does not satisfy "彻底不要"

### Option B: Hard removal

Remove menu, route, page file, and directly associated API/type files.

Pros:

- fully matches the requirement
- no dead code remains

Cons:

- requires checking for residual imports and route references

## Recommendation

Choose Option B.

The feature is explicitly unwanted, so the correct implementation is complete removal rather than soft hiding.

## Proposed Design

### Navigation cleanup

Update `frontend/src/components/layout/AppLayout.tsx` to:

- remove the `/ontology/overview` menu item
- remove the breadcrumb title mapping for `/ontology/overview`

### Route cleanup

Update `frontend/src/App.tsx` to:

- remove the `OntologyOverviewPage` import
- remove the `/ontology/overview` route

### File cleanup

Delete:

- `frontend/src/pages/platform/OntologyOverviewPage.tsx`
- `frontend/src/api/ontologyOverview.ts`
- `frontend/src/types/ontologyOverview.ts`

### Verification

Use ripgrep to confirm no remaining frontend references to:

- `OntologyOverviewPage`
- `/ontology/overview`
- `ontologyOverview`
- `本体概览`

Then run a frontend build to ensure all imports and route wiring remain valid.
