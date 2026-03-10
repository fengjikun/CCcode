# Studio Route Workspace Refresh Design

**Date:** 2026-03-10

## Goal

Refresh the running frontend so the L4 area is presented as `workspace 工作台` while all public L4 URLs move from `/coworker/*` to `/studio/*`, with no backward compatibility for the old paths.

## Scope

In scope:
- Update frontend route definitions from `/coworker/*` to `/studio/*`
- Update left navigation entries under `workspace 工作台` to point at `/studio/*`
- Update breadcrumb/page-title parent labels from `Co-worker平台` to `workspace 工作台`
- Remove active frontend references to `/coworker/*` for L4 navigation

Out of scope:
- Renaming internal component/file identifiers such as `AgentStudioPage`
- Updating product docs, PRDs, or prototype HTML
- Adding redirects or compatibility routes from `/coworker/*`

## Constraints

- The old `/coworker/*` URLs must stop working and fall through to 404
- Existing page content for agents, logs, and skills should remain unchanged
- The current workspace already contains unrelated edits in the touched files, so changes must be minimal and local

## Design

### Route layer

Modify `frontend/src/App.tsx` so the three L4 routes become:
- `/studio/agents`
- `/studio/agents/logs`
- `/studio/skills`

No `<Navigate>` compatibility routes will be added for `/coworker/*`.

### Navigation and titles

Modify `frontend/src/components/layout/AppLayout.tsx` so:
- the existing sidebar group label remains `workspace 工作台`
- the three menu item keys switch to `/studio/*`
- `PAGE_TITLES` uses `workspace 工作台` as the parent label for the three L4 pages

The existing selected/open menu logic already derives state from menu keys, so switching the keys is sufficient.

## Validation

Acceptance criteria:
- `/studio/skills`, `/studio/agents`, and `/studio/agents/logs` render the same pages as before
- Sidebar navigation under `workspace 工作台` opens the new `/studio/*` paths
- The page header/breadcrumb parent label shows `workspace 工作台`
- Old `/coworker/*` URLs are no longer defined and resolve to 404

Verification:
- Run frontend tests or a production build
- Search `frontend/src` for active `/coworker/*` references used by the running L4 frontend
- Manually verify the three sidebar entries and URLs
