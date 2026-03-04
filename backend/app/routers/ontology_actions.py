from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ontology import (
    ActionTypeCreate, ActionTypeResponse,
    ActionParameterCreate, ActionParameterResponse,
    ActionRuleCreate, ActionRuleResponse,
    ActionExecutionResponse,
)
from app.services import ontology_action_service as action_svc

router = APIRouter(prefix="/api/ontology", tags=["ontology-actions"])


# ===== ActionType =====

@router.get("/action-types", response_model=List[ActionTypeResponse])
def list_action_types(db: Session = Depends(get_db)):
    return action_svc.list_action_types(db)


@router.post("/action-types", response_model=ActionTypeResponse)
def create_action_type(at: ActionTypeCreate, db: Session = Depends(get_db)):
    return action_svc.create_action_type(db, at.model_dump(by_alias=False))


@router.get("/action-types/{id}", response_model=ActionTypeResponse)
def get_action_type(id: int, db: Session = Depends(get_db)):
    try:
        return action_svc.get_action_type(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/action-types/{id}", response_model=ActionTypeResponse)
def update_action_type(id: int, at: ActionTypeCreate, db: Session = Depends(get_db)):
    try:
        return action_svc.update_action_type(db, id, at.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/action-types/{id}", status_code=204)
def delete_action_type(id: int, db: Session = Depends(get_db)):
    try:
        action_svc.delete_action_type(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== Parameters =====

@router.get("/action-types/{id}/parameters", response_model=List[ActionParameterResponse])
def list_parameters(id: int, db: Session = Depends(get_db)):
    return action_svc.list_parameters(db, id)


@router.post("/action-types/{id}/parameters", response_model=ActionParameterResponse)
def add_parameter(id: int, param: ActionParameterCreate, db: Session = Depends(get_db)):
    try:
        return action_svc.add_parameter(db, id, param.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/parameters/{id}", response_model=ActionParameterResponse)
def update_parameter(id: int, param: ActionParameterCreate, db: Session = Depends(get_db)):
    try:
        return action_svc.update_parameter(db, id, param.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/parameters/{id}", status_code=204)
def delete_parameter(id: int, db: Session = Depends(get_db)):
    try:
        action_svc.delete_parameter(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== Rules =====

@router.get("/action-types/{id}/rules", response_model=List[ActionRuleResponse])
def list_rules(id: int, db: Session = Depends(get_db)):
    return action_svc.list_rules(db, id)


@router.post("/action-types/{id}/rules", response_model=ActionRuleResponse)
def add_rule(id: int, rule: ActionRuleCreate, db: Session = Depends(get_db)):
    try:
        return action_svc.add_rule(db, id, rule.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/rules/{id}", response_model=ActionRuleResponse)
def update_rule(id: int, rule: ActionRuleCreate, db: Session = Depends(get_db)):
    try:
        return action_svc.update_rule(db, id, rule.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/rules/{id}", status_code=204)
def delete_rule(id: int, db: Session = Depends(get_db)):
    try:
        action_svc.delete_rule(db, id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== Execute =====

@router.post("/action-types/{id}/execute", response_model=ActionExecutionResponse)
def execute_action(id: int, parameters: Dict[str, Any], db: Session = Depends(get_db)):
    return action_svc.execute_action(db, id, parameters)


@router.get("/action-types/{id}/executions", response_model=List[ActionExecutionResponse])
def list_executions(id: int, db: Session = Depends(get_db)):
    return action_svc.list_executions(db, id)
