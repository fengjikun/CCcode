# README Local Development Design

**Goal:** Make the repository root `README.md` present local development as the single recommended startup path for new users, while retaining Docker as a secondary deployment option.

**Context:** The current README places local development, Docker deployment, and rebuild instructions at similar prominence. That makes the default path ambiguous, especially because backend runtime still defaults to `APP_MODE=prod` unless `backend/.env` explicitly sets `APP_MODE=mock`.

## Decision

Use a root-README-first approach:

1. Rewrite the `快速开始` section so local development is the primary entry point.
2. Require a minimal `backend/.env` example with `APP_MODE=mock`.
3. Standardize startup instructions around `./scripts/start.sh`.
4. Move Docker guidance into a later supplementary section instead of presenting it as a parallel default path.

## Alternatives Considered

### 1. Root README rewrite

Recommended.

- Pros: minimal change, fixes first-impression guidance, aligns with actual scripts and ports.
- Cons: root README still carries multiple usage modes, so wording and ordering must stay strict.

### 2. Short root README plus external dev doc

- Pros: cleaner root document.
- Cons: introduces an extra navigation step and weakens the default-path signal.

### 3. README + full Docker doc restructuring together

- Pros: strongest cross-document consistency.
- Cons: expands scope beyond the current need.

## Target Structure

### Quick Start

- Add a short recommendation that new users should start with local development, not Docker.

### Startup Preparation

- Keep only the necessary prerequisites:
  - Python 3.10+
  - Node.js 18+
  - frontend/backend dependency installation
  - `backend/.env`

### Minimal Runnable Config

Show a required local example:

```env
APP_MODE=mock
AUTH_DEFAULT_USERNAME=admin
AUTH_DEFAULT_PASSWORD=admin123456
```

Explain that `APP_MODE=mock` avoids MySQL dependency during local startup.

### Startup Command

Use only:

```bash
./scripts/start.sh
```

Do not place split frontend/backend commands on the main path.

### Access Information

Keep these values explicit:

- Frontend: `http://localhost:9002`
- Backend: `http://localhost:9000`
- API docs: `http://localhost:9000/docs`
- Default credentials: `admin` / `admin123456`

### Common Issues

- If Node version is wrong, check `nvm use 22`.
- If `APP_MODE=mock` is missing, backend will start in `prod` mode and expect MySQL.

### Supplementary Docker Section

- Retain Docker instructions, but move them behind local development.
- Keep the existing note that Docker defaults to `mock` and `APP_MODE=prod` is the explicit opt-in for real database mode.

## Out of Scope

- Changing backend runtime defaults.
- Rewriting `docs/docker-deployment.md`.
- Changing startup scripts or ports.
