from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, from_attributes=True)


# ===== ObjectType =====

class ObjectTypeCreate(_CamelModel):
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    primary_key_property: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class ObjectTypeResponse(_CamelModel):
    id: int
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    primary_key_property: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ===== Property =====

class PropertyCreate(_CamelModel):
    name: str
    display_name: Optional[str] = None
    data_type: str = "STRING"
    required: bool = False
    default_value: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0


class PropertyResponse(_CamelModel):
    id: int
    object_type_id: int
    name: str
    display_name: Optional[str] = None
    data_type: str = "STRING"
    required: bool = False
    default_value: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0


# ===== LinkType =====

class LinkTypeCreate(_CamelModel):
    name: str
    display_name: Optional[str] = None
    source_object_type_id: int
    target_object_type_id: int
    cardinality: str = "ONE_TO_MANY"
    description: Optional[str] = None


class LinkTypeResponse(_CamelModel):
    id: int
    name: str
    display_name: Optional[str] = None
    source_object_type_id: int
    target_object_type_id: int
    cardinality: str = "ONE_TO_MANY"
    description: Optional[str] = None
    created_at: Optional[datetime] = None


# ===== Object =====

class ObjectCreate(_CamelModel):
    external_id: Optional[str] = None
    properties_json: Optional[str] = None


class ObjectResponse(_CamelModel):
    id: int
    object_type_id: int
    external_id: Optional[str] = None
    properties_json: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ===== Link =====

class LinkCreate(_CamelModel):
    link_type_id: int
    source_object_id: int
    target_object_id: int


class LinkResponse(_CamelModel):
    id: int
    link_type_id: int
    source_object_id: int
    target_object_id: int
    created_at: Optional[datetime] = None


# ===== ActionType =====

class ActionTypeCreate(_CamelModel):
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    status: str = "DRAFT"
    target_object_type_id: Optional[int] = None
    trigger_type: str = "MANUAL"
    trigger_config_json: Optional[str] = None
    exception_policy: str = "IGNORE"
    exception_config_json: Optional[str] = None
    validation_rules_json: Optional[str] = None


class ActionTypeResponse(_CamelModel):
    id: int
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    status: str = "DRAFT"
    target_object_type_id: Optional[int] = None
    trigger_type: str = "MANUAL"
    trigger_config_json: Optional[str] = None
    exception_policy: str = "IGNORE"
    exception_config_json: Optional[str] = None
    validation_rules_json: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ===== ActionParameter =====

class ActionParameterCreate(_CamelModel):
    name: str
    display_name: Optional[str] = None
    data_type: str = "STRING"
    required: bool = False
    default_value: Optional[str] = None
    constraints_json: Optional[str] = None
    sort_order: int = 0


class ActionParameterResponse(_CamelModel):
    id: int
    action_type_id: int
    name: str
    display_name: Optional[str] = None
    data_type: str = "STRING"
    required: bool = False
    default_value: Optional[str] = None
    constraints_json: Optional[str] = None
    sort_order: int = 0


# ===== ActionRule =====

class ActionRuleCreate(_CamelModel):
    rule_type: str
    target_object_type_name: Optional[str] = None
    target_link_type_name: Optional[str] = None
    property_mappings_json: Optional[str] = None
    condition_json: Optional[str] = None
    sort_order: int = 0


class ActionRuleResponse(_CamelModel):
    id: int
    action_type_id: int
    rule_type: str
    target_object_type_name: Optional[str] = None
    target_link_type_name: Optional[str] = None
    property_mappings_json: Optional[str] = None
    condition_json: Optional[str] = None
    sort_order: int = 0


# ===== ActionExecution =====

class ActionExecutionResponse(_CamelModel):
    id: int
    action_type_id: int
    parameters_json: Optional[str] = None
    result_json: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    executed_at: Optional[datetime] = None


# ===== Function =====

class FunctionCreate(_CamelModel):
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    action_type_id: Optional[int] = None
    script_type: str = "PYTHON"
    script_content: Optional[str] = None
    input_schema_json: Optional[str] = None
    output_schema_json: Optional[str] = None
    status: str = "DRAFT"


class FunctionResponse(_CamelModel):
    id: int
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    action_type_id: Optional[int] = None
    script_type: str = "PYTHON"
    script_content: Optional[str] = None
    input_schema_json: Optional[str] = None
    output_schema_json: Optional[str] = None
    status: str = "DRAFT"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ===== FunctionLog =====

class FunctionLogResponse(_CamelModel):
    id: int
    function_id: int
    action_execution_id: Optional[int] = None
    input_data_json: Optional[str] = None
    output_data_json: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    executed_at: Optional[datetime] = None
