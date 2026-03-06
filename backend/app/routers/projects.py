from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.project_mgmt import (
    ActionCreateRequest,
    ActionStatusPatchRequest,
    AiInsightResult,
    ConnectionTestResult,
    DataSourceUpsertRequest,
    EnabledPatchRequest,
    EntityType,
    EntityTypeUpsertRequest,
    ExtractionRun,
    FunctionCreateRequest,
    FunctionStatusPatchRequest,
    OntologyVersion,
    ProjectAction,
    ProjectDataSource,
    ProjectDetail,
    ProjectDocument,
    ProjectFunction,
    ProjectSummary,
    ProjectCreateRequest,
    PublishVersionRequest,
    RelationType,
    RelationTypeUpsertRequest,
    ReviewItem,
    ReviewStatusUpdateRequest,
    SchemaConfig,
    SchemaPromptsUpdateRequest,
    SkillConfig,
)
from app.security import get_current_user
from app.services import project_mgmt_service as project_svc

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _raise_not_implemented(error: NotImplementedError) -> None:
    raise HTTPException(status_code=501, detail=str(error))


def _value_error_status(detail: str, *, default: int = 400) -> int:
    lowered = detail.lower()
    if "已存在" in detail or "already exists" in lowered:
        return 409
    if "不存在" in detail or "not found" in lowered:
        return 404
    return default


@router.get("", response_model=List[ProjectSummary])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.list_projects(db, current_user.id)
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("", response_model=ProjectSummary, status_code=201)
def create_project(
    payload: ProjectCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.create_project(db, current_user.id, payload.model_dump(by_alias=False))
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project_detail(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.get_project_detail(db, current_user.id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project_svc.delete_project(db, current_user.id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.get("/{project_id}/documents", response_model=List[ProjectDocument])
def list_documents(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.list_documents(db, current_user.id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/documents", response_model=ProjectDocument, status_code=201)
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        content = await file.read()
        return project_svc.upload_document(db, current_user.id, project_id, file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.patch("/{project_id}/documents/{document_id}", response_model=ProjectDocument)
def patch_document_enabled(
    project_id: str,
    document_id: str,
    payload: EnabledPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.patch_document_enabled(
            db, current_user.id, project_id, document_id, payload.enabled
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.delete("/{project_id}/documents/{document_id}", status_code=204)
def delete_document(
    project_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project_svc.delete_document(db, current_user.id, project_id, document_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.get("/{project_id}/data-sources", response_model=List[ProjectDataSource])
def list_data_sources(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.list_data_sources(db, current_user.id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/data-sources", response_model=ProjectDataSource, status_code=201)
def create_data_source(
    project_id: str,
    payload: DataSourceUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.create_data_source(
            db, current_user.id, project_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.put("/{project_id}/data-sources/{data_source_id}", response_model=ProjectDataSource)
def update_data_source(
    project_id: str,
    data_source_id: str,
    payload: DataSourceUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.update_data_source(
            db, current_user.id, project_id, data_source_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.patch("/{project_id}/data-sources/{data_source_id}", response_model=ProjectDataSource)
def patch_data_source_enabled(
    project_id: str,
    data_source_id: str,
    payload: EnabledPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.patch_data_source_enabled(
            db, current_user.id, project_id, data_source_id, payload.enabled
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.delete("/{project_id}/data-sources/{data_source_id}", status_code=204)
def delete_data_source(
    project_id: str,
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project_svc.delete_data_source(db, current_user.id, project_id, data_source_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post(
    "/{project_id}/data-sources/{data_source_id}/test-connection",
    response_model=ConnectionTestResult,
)
def test_data_source_connection(
    project_id: str,
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.test_data_source_connection(db, current_user.id, project_id, data_source_id)
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/schema/entity-types", response_model=EntityType, status_code=201)
def create_entity_type(
    project_id: str,
    payload: EntityTypeUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.create_entity_type(
            db, current_user.id, project_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.put("/{project_id}/schema/entity-types/{entity_type_id}", response_model=EntityType)
def update_entity_type(
    project_id: str,
    entity_type_id: str,
    payload: EntityTypeUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.update_entity_type(
            db, current_user.id, project_id, entity_type_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.delete("/{project_id}/schema/entity-types/{entity_type_id}", status_code=204)
def delete_entity_type(
    project_id: str,
    entity_type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project_svc.delete_entity_type(db, current_user.id, project_id, entity_type_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/schema/relation-types", response_model=RelationType, status_code=201)
def create_relation_type(
    project_id: str,
    payload: RelationTypeUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.create_relation_type(
            db, current_user.id, project_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.put("/{project_id}/schema/relation-types/{relation_type_id}", response_model=RelationType)
def update_relation_type(
    project_id: str,
    relation_type_id: str,
    payload: RelationTypeUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.update_relation_type(
            db, current_user.id, project_id, relation_type_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.delete("/{project_id}/schema/relation-types/{relation_type_id}", status_code=204)
def delete_relation_type(
    project_id: str,
    relation_type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project_svc.delete_relation_type(db, current_user.id, project_id, relation_type_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.patch("/{project_id}/schema/prompts", response_model=SchemaConfig)
def update_schema_prompts(
    project_id: str,
    payload: SchemaPromptsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.update_schema_prompts(
            db, current_user.id, project_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/skills/upload", response_model=SkillConfig, status_code=201)
async def upload_custom_skill(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        content = await file.read()
        return project_svc.upload_custom_skill(
            db, current_user.id, project_id, file.filename or "", content
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.delete("/{project_id}/skills/{skill_id}", status_code=204)
def delete_custom_skill(
    project_id: str,
    skill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project_svc.delete_custom_skill(db, current_user.id, project_id, skill_id)
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/schema/ai-insight", response_model=AiInsightResult)
def run_ai_schema_insight(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.run_ai_schema_insight(db, current_user.id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/runs", response_model=ExtractionRun, status_code=201)
def create_extraction_run(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.create_extraction_run(db, current_user.id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.get("/{project_id}/runs/{run_id}", response_model=ExtractionRun)
def get_extraction_run(
    project_id: str,
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.get_extraction_run(db, current_user.id, project_id, run_id)
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.patch(
    "/{project_id}/runs/{run_id}/review-items/{item_id}",
    response_model=ReviewItem,
)
def patch_review_item_status(
    project_id: str,
    run_id: str,
    item_id: str,
    payload: ReviewStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.patch_review_item_status(
            db, current_user.id, project_id, run_id, item_id, payload.status.value
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/runs/{run_id}/publish", response_model=OntologyVersion, status_code=201)
def publish_run_version(
    project_id: str,
    run_id: str,
    payload: PublishVersionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.publish_run_version(
            db, current_user.id, project_id, run_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/actions", response_model=ProjectAction, status_code=201)
def create_action(
    project_id: str,
    payload: ActionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.create_action(
            db, current_user.id, project_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.patch("/{project_id}/actions/{action_id}", response_model=ProjectAction)
def patch_action_status(
    project_id: str,
    action_id: str,
    payload: ActionStatusPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.patch_action_status(
            db, current_user.id, project_id, action_id, payload.status.value
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.delete("/{project_id}/actions/{action_id}", status_code=204)
def delete_action(
    project_id: str,
    action_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project_svc.delete_action(db, current_user.id, project_id, action_id)
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.post("/{project_id}/functions", response_model=ProjectFunction, status_code=201)
def create_function(
    project_id: str,
    payload: FunctionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.create_function(
            db, current_user.id, project_id, payload.model_dump(by_alias=False)
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.patch("/{project_id}/functions/{function_id}", response_model=ProjectFunction)
def patch_function_status(
    project_id: str,
    function_id: str,
    payload: FunctionStatusPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return project_svc.patch_function_status(
            db, current_user.id, project_id, function_id, payload.status.value
        )
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)


@router.delete("/{project_id}/functions/{function_id}", status_code=204)
def delete_function(
    project_id: str,
    function_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project_svc.delete_function(db, current_user.id, project_id, function_id)
    except ValueError as e:
        raise HTTPException(status_code=_value_error_status(str(e)), detail=str(e))
    except NotImplementedError as e:
        _raise_not_implemented(e)
