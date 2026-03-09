# Mock Mode Design

**Date:** 2026-03-09

**Goal:** Add a backend-wide mock startup mode that runs locally without MySQL and still supports authenticated frontend integration.

## Scope

- Add a single top-level app mode switch: `APP_MODE=mock`.
- In mock mode, backend startup must not create or use a MySQL connection.
- Authentication must work without the `users` table.
- Existing JSON-backed mock routers remain the primary data source for ontology, projects, and UI mock store APIs.
- Mock mode should preserve the current non-mock path for existing MySQL-backed development and deployment flows.

## Non-Goals

- Rebuilding every production endpoint with full feature parity.
- Replacing current MySQL mode.
- Changing Docker or deployment behavior.

## Architecture

### App Mode

Introduce `APP_MODE` with values:

- `prod` (default): current behavior
- `mock`: full local mock behavior

Mock mode becomes the authoritative switch. Existing `PROJECT_MOCK_ENABLED` and `ONTOLOGY_MOCK_ENABLED` remain compatible, but `APP_MODE=mock` forces them on.

### Database Boundary

Current startup imports `app.database` unconditionally and eagerly creates a MySQL engine. This must be replaced with mode-aware initialization:

- In `prod`, keep current MySQL engine/session creation.
- In `mock`, do not create a SQLAlchemy engine.
- `get_db()` in mock mode should fail fast with a clear error if a non-mock route still depends on a real DB session.

This keeps accidental DB coupling visible during testing instead of silently falling through.

### Authentication

Current auth is DB-backed for both login and `get_current_user()`. Mock mode needs a parallel auth path:

- `POST /api/auth/login` accepts credentials and returns a signed token for a mock admin user.
- `GET /api/auth/me` resolves from token only.
- Protected routes depending on `get_current_user()` keep working because the dependency returns a mock user object in mock mode.

This avoids changing most router declarations.

### Startup Lifecycle

Current startup always:

- bootstraps default user
- recovers interrupted AI insight runs
- loads fault knowledge

In mock mode:

- skip DB-backed bootstrap and recovery logic
- keep fault knowledge loading if it does not require DB
- log that startup is running in mock mode

### Routing Strategy

Existing mock-safe routes should stay mounted:

- `auth`
- `diagnosis`
- `mock_store`
- `mock_ontology`
- `mock_projects`
- `agent` only if its non-DB endpoints are safe

Any router still requiring DB in mock mode should either:

- not be mounted, or
- be replaced with a minimal mock implementation

The initial target is stable startup plus working authenticated mock APIs, not feature parity for every production route.

## Testing Strategy

Add tests that prove:

1. App creation in mock mode does not require MySQL.
2. Mock login works and returns a bearer token.
3. A protected mock endpoint works with that token.
4. Mock mode startup path does not invoke DB bootstrap/recovery hooks.

## Runtime Contract

Mock mode launch command:

```bash
APP_MODE=mock uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

## Risks

- Some mounted routers may still call `get_db()` on request execution.
- Import-time coupling to SQLAlchemy models may still assume a DB-backed session exists.
- Agent endpoints may need partial gating if they query project schema from the DB.

## Recommended Rollout

1. Make startup and auth mock-safe first.
2. Add app-level tests that catch any remaining DB coupling.
3. Start server in `APP_MODE=mock`.
4. Verify frontend-critical mock endpoints manually.
