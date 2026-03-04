from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ontology import FunctionCreate, FunctionResponse, FunctionLogResponse
from app.services import ontology_function_service as fn_svc

router = APIRouter(prefix="/api/ontology", tags=["ontology-functions"])


# ===== Function CRUD =====

@router.get("/functions", response_model=List[FunctionResponse])
def list_functions(db: Session = Depends(get_db)):
    return fn_svc.list_functions(db)


@router.post("/functions", response_model=FunctionResponse)
def create_function(fn: FunctionCreate, db: Session = Depends(get_db)):
    return fn_svc.create_function(db, fn.model_dump(by_alias=False))


@router.get("/functions/{id}", response_model=FunctionResponse)
def get_function(id: int, db: Session = Depends(get_db)):
    try:
        return fn_svc.get_function(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/functions/{id}", response_model=FunctionResponse)
def update_function(id: int, fn: FunctionCreate, db: Session = Depends(get_db)):
    try:
        return fn_svc.update_function(db, id, fn.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/functions/{id}", status_code=204)
def delete_function(id: int, db: Session = Depends(get_db)):
    try:
        fn_svc.delete_function(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== Execute =====

@router.post("/functions/{id}/execute", response_model=FunctionLogResponse)
def execute_function(id: int, input_data: Optional[Dict[str, Any]] = None, db: Session = Depends(get_db)):
    try:
        return fn_svc.execute_function(db, id, input_data or {})
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== Logs =====

@router.get("/functions/{id}/logs", response_model=List[FunctionLogResponse])
def list_logs(id: int, db: Session = Depends(get_db)):
    return fn_svc.list_logs(db, id)
