from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from app.database import SessionLocal
from app.models import *  # noqa: F401, F403 - ensure all models are imported
from app.routers import (
    auth, diagnosis, ontology_schema, ontology_objects, ontology_actions, ontology_functions, projects
)
from app.security import bootstrap_default_user, get_current_user
from app.services import fault_knowledge_service

app = FastAPI(title="大族智控设备故障诊断系统", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
_protected = [Depends(get_current_user)]
app.include_router(auth.router)
app.include_router(diagnosis.router, dependencies=_protected)
app.include_router(ontology_schema.router, dependencies=_protected)
app.include_router(ontology_objects.router, dependencies=_protected)
app.include_router(ontology_actions.router, dependencies=_protected)
app.include_router(ontology_functions.router, dependencies=_protected)
app.include_router(projects.router)


@app.on_event("startup")
def on_startup():
    # Run Alembic migrations to ensure database schema is up to date
    from alembic.config import Config
    from alembic import command

    alembic_cfg = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
    command.upgrade(alembic_cfg, "head")

    # Bootstrap an initial admin account when user table is empty.
    db = SessionLocal()
    try:
        bootstrap_default_user(db)
    finally:
        db.close()

    # Load fault knowledge graph
    fault_knowledge_service.load()


# Serve React frontend static files (production build)
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve React SPA — all non-API routes fall back to index.html."""
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = (_frontend_dist / full_path).resolve()
        if full_path and file_path.is_relative_to(_frontend_dist) and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(_frontend_dist / "index.html"))
else:
    @app.get("/")
    def root():
        return {"message": "大族智控设备故障诊断系统 API", "version": "2.0.0"}
