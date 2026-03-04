import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from app.database import engine, Base
from app.models import *  # noqa: F401, F403 - ensure all models are imported for create_all
from app.routers import devices, diagnosis, ontology_schema, ontology_objects, ontology_actions, ontology_functions
from app.services import fault_knowledge_service

app = FastAPI(title="大族智控设备故障诊断系统", version="2.0.0")

# CORS - allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(devices.router)
app.include_router(diagnosis.router)
app.include_router(ontology_schema.router)
app.include_router(ontology_objects.router)
app.include_router(ontology_actions.router)
app.include_router(ontology_functions.router)


@app.on_event("startup")
def on_startup():
    # Create all database tables
    Base.metadata.create_all(bind=engine)
    # Load fault knowledge graph
    fault_knowledge_service.load()


# Serve React frontend static files (production build)
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve React SPA — all non-API routes fall back to index.html."""
        file_path = _frontend_dist / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(_frontend_dist / "index.html"))
else:
    @app.get("/")
    def root():
        return {"message": "大族智控设备故障诊断系统 API", "version": "2.0.0"}
