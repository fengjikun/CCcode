from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.fault_record import FaultRecord
from app.schemas.diagnosis import DiagnosisRequest, FaultRecordResponse
from app.services import diagnosis_service
from app.services import fault_knowledge_service as knowledge

router = APIRouter(prefix="/api/diagnosis", tags=["diagnosis"])


@router.post("/analyze", response_model=FaultRecordResponse)
def analyze(request: DiagnosisRequest, db: Session = Depends(get_db)):
    req_dict = request.model_dump(by_alias=False)
    return diagnosis_service.diagnose(db, req_dict)


@router.get("/records", response_model=List[FaultRecordResponse])
def get_all_records(db: Session = Depends(get_db)):
    return db.query(FaultRecord).order_by(FaultRecord.reported_at.desc()).all()


@router.get("/records/device/{device_id}", response_model=List[FaultRecordResponse])
def get_by_device(device_id: int, db: Session = Depends(get_db)):
    return db.query(FaultRecord).filter(
        FaultRecord.device_id == device_id
    ).order_by(FaultRecord.reported_at.desc()).all()


@router.get("/records/{id}", response_model=FaultRecordResponse)
def get_record(id: int, db: Session = Depends(get_db)):
    record = db.get(FaultRecord, id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.delete("/records/{id}", status_code=204)
def delete_record(id: int, db: Session = Depends(get_db)):
    record = db.get(FaultRecord, id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()


@router.get("/phenomena")
def get_phenomena():
    return knowledge.all_phenomena()


@router.get("/phenomena/search")
def search_phenomena(q: str = Query(...)):
    return knowledge.search_phenomena(q)


@router.get("/phenomena/{id}/detail")
def get_phenomenon_detail(id: str):
    return knowledge.get_phenomenon_detail(id)


@router.get("/checkpoints")
def get_checkpoints(nodeId: str = Query(...)):
    return knowledge.get_checkpoints(nodeId)


@router.get("/causes-solutions")
def get_causes_solutions(subPhenId: str = Query(...)):
    return knowledge.get_causes_and_solutions(subPhenId)


@router.get("/graph")
def get_graph_data():
    return knowledge.graph_data()
