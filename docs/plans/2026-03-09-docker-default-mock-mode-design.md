# Docker Default Mock Mode Design

**Date:** 2026-03-09

**Goal:** Make Docker-based deployment default to mock mode, while preserving an explicit path to switch back to prod mode.

## Scope

- Docker Compose should default `APP_MODE` to `mock`.
- The example environment file should document `APP_MODE=mock`.
- Deployment docs should state that Docker defaults to mock, and that `APP_MODE=prod` is the opt-in override.

## Non-Goals

- Changing the application-wide default mode outside Docker.
- Removing MySQL-backed prod mode.
- Changing local non-Docker startup behavior.

## Recommended Approach

Use Docker-layer defaults instead of changing backend runtime defaults.

### Why

- Lowest blast radius: only Docker startup behavior changes.
- Existing direct `uvicorn` and other non-Docker flows keep their current semantics.
- Operators can still switch to prod explicitly via env configuration.

## Design

### Compose Behavior

In `docker-compose.yml`, set:

```yaml
APP_MODE: ${APP_MODE:-mock}
```

This means:

- no `APP_MODE` set → Docker runs in mock mode
- `APP_MODE=prod` set in `deploy/.env` or environment → Docker runs in prod mode

### Example Env

In `deploy/.env.example`, add:

```env
APP_MODE=mock
```

This makes the generated default deployment config self-documenting and aligned with actual compose behavior.

### Docs

Update deployment docs and README to say:

- Docker deployment defaults to mock mode
- to use prod mode, set `APP_MODE=prod`
- prod mode still requires MySQL and manual migration execution

## Testing

Add a small regression test that asserts:

1. `docker-compose.yml` contains the mock default expression
2. `deploy/.env.example` contains `APP_MODE=mock`

This is enough for the requested behavior because the change is configuration-driven.
