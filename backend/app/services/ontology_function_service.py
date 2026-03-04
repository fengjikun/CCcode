import json
import time
from sqlalchemy.orm import Session
from app.models.ontology import OntologyFunction, OntologyFunctionLog
from app.utils.script_executor import execute_python_script, ScriptTimeoutError


# ===== Function CRUD =====

def list_functions(db: Session):
    return db.query(OntologyFunction).all()


def get_function(db: Session, id: int) -> OntologyFunction:
    fn = db.get(OntologyFunction, id)
    if not fn:
        raise ValueError(f"Function not found: {id}")
    return fn


def create_function(db: Session, data: dict) -> OntologyFunction:
    fn = OntologyFunction(**data)
    db.add(fn)
    db.commit()
    db.refresh(fn)
    return fn


def update_function(db: Session, id: int, data: dict) -> OntologyFunction:
    fn = get_function(db, id)
    for key, value in data.items():
        if value is not None:
            setattr(fn, key, value)
    db.commit()
    db.refresh(fn)
    return fn


def delete_function(db: Session, id: int):
    fn = get_function(db, id)
    db.delete(fn)
    db.commit()


# ===== Execute Function =====

def execute_function(db: Session, id: int, input_data: dict,
                     action_execution_id: int = None) -> OntologyFunctionLog:
    fn = get_function(db, id)
    log = OntologyFunctionLog(
        function_id=id,
        action_execution_id=action_execution_id,
        input_data_json=_to_json(input_data),
    )

    start_ms = time.time() * 1000

    try:
        result = execute_python_script(fn.script_content, input_data)
        duration = int(time.time() * 1000 - start_ms)

        if isinstance(result, dict):
            output_json = _to_json(result)
        else:
            output_json = _to_json({"result": str(result) if result is not None else "null"})

        log.output_data_json = output_json
        log.status = "SUCCESS"
        log.duration_ms = duration

    except ScriptTimeoutError:
        duration = int(time.time() * 1000 - start_ms)
        log.status = "TIMEOUT"
        log.error_message = "Script execution timed out after 30 seconds"
        log.duration_ms = duration

    except Exception as e:
        duration = int(time.time() * 1000 - start_ms)
        log.status = "FAILED"
        log.error_message = str(e)
        log.duration_ms = duration

    db.add(log)
    db.commit()
    db.refresh(log)
    return log


# ===== Logs =====

def list_logs(db: Session, function_id: int):
    return db.query(OntologyFunctionLog).filter(
        OntologyFunctionLog.function_id == function_id
    ).order_by(OntologyFunctionLog.executed_at.desc()).all()


def _to_json(obj) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False)
    except Exception:
        return "{}"
