from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from app.database import Base


class OntologyObjectType(Base):
    __tablename__ = "onto_object_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    display_name = Column(String)
    description = Column(Text)
    primary_key_property = Column(String)
    icon = Column(String)
    color = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class OntologyProperty(Base):
    __tablename__ = "onto_properties"

    id = Column(Integer, primary_key=True, autoincrement=True)
    object_type_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    display_name = Column(String)
    data_type = Column(String, default="STRING")
    required = Column(Boolean, default=False)
    default_value = Column(String)
    description = Column(Text)
    sort_order = Column(Integer, default=0)


class OntologyLinkType(Base):
    __tablename__ = "onto_link_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    display_name = Column(String)
    source_object_type_id = Column(Integer, nullable=False)
    target_object_type_id = Column(Integer, nullable=False)
    cardinality = Column(String, default="ONE_TO_MANY")
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class OntologyObject(Base):
    __tablename__ = "onto_objects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    object_type_id = Column(Integer, nullable=False)
    external_id = Column(String)
    properties_json = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class OntologyLink(Base):
    __tablename__ = "onto_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    link_type_id = Column(Integer, nullable=False)
    source_object_id = Column(Integer, nullable=False)
    target_object_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.now)


class OntologyActionType(Base):
    __tablename__ = "onto_action_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    display_name = Column(String)
    description = Column(Text)
    status = Column(String, default="DRAFT")
    target_object_type_id = Column(Integer)
    trigger_type = Column(String, default="MANUAL")
    trigger_config_json = Column(Text)
    exception_policy = Column(String, default="IGNORE")
    exception_config_json = Column(Text)
    validation_rules_json = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class OntologyActionParameter(Base):
    __tablename__ = "onto_action_parameters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action_type_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    display_name = Column(String)
    data_type = Column(String, default="STRING")
    required = Column(Boolean, default=False)
    default_value = Column(String)
    constraints_json = Column(Text)
    sort_order = Column(Integer, default=0)


class OntologyActionRule(Base):
    __tablename__ = "onto_action_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action_type_id = Column(Integer, nullable=False)
    rule_type = Column(String, nullable=False)
    target_object_type_name = Column(String)
    target_link_type_name = Column(String)
    property_mappings_json = Column(Text)
    condition_json = Column(Text)
    sort_order = Column(Integer, default=0)


class OntologyActionExecution(Base):
    __tablename__ = "onto_action_executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action_type_id = Column(Integer, nullable=False)
    parameters_json = Column(Text)
    result_json = Column(Text)
    status = Column(String)
    error_message = Column(Text)
    executed_at = Column(DateTime, default=datetime.now)


class OntologyFunction(Base):
    __tablename__ = "onto_functions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action_type_id = Column(Integer)
    name = Column(String, unique=True, nullable=False)
    display_name = Column(String)
    description = Column(Text)
    script_type = Column(String, default="PYTHON")
    script_content = Column(Text)
    input_schema_json = Column(Text)
    output_schema_json = Column(Text)
    status = Column(String, default="DRAFT")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class OntologyFunctionLog(Base):
    __tablename__ = "onto_function_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    function_id = Column(Integer, nullable=False)
    action_execution_id = Column(Integer)
    input_data_json = Column(Text)
    output_data_json = Column(Text)
    status = Column(String)
    error_message = Column(Text)
    duration_ms = Column(Integer)
    executed_at = Column(DateTime, default=datetime.now)
