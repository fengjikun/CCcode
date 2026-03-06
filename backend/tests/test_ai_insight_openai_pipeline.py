import os
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.project_mgmt import EntityType, Project, ProjectDocument, RelationType, SchemaProperty
from app.services import project_mgmt_service as svc


FIXTURE_XLSX_PATH = Path("/Users/braum/work/github/CCcode/prototyype/场景二：Schema（实体与关系定义）.xlsx")


class AiInsightOpenAIPipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        db_file = Path(self._tmpdir.name) / "test.sqlite"
        self._engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self._engine)
        self._SessionLocal = sessionmaker(bind=self._engine, autocommit=False, autoflush=False)
        self.db = self._SessionLocal()

        project = Project(
            id="proj_test_1",
            owner_user_id=1,
            name="Test Project",
            description="",
        )
        document = ProjectDocument(
            id="doc_test_1",
            project_id=project.id,
            name=FIXTURE_XLSX_PATH.name,
            file_type="xlsx",
            size_bytes=FIXTURE_XLSX_PATH.stat().st_size if FIXTURE_XLSX_PATH.exists() else 0,
            status="READY",
            enabled=True,
            storage_path=str(FIXTURE_XLSX_PATH),
        )
        self.db.add(project)
        self.db.add(document)
        self.db.commit()

        self._original_runner = getattr(svc, "_run_ai_schema_insight_llm")
        self._env_backup = {
            "LLM_API_KEY": os.getenv("LLM_API_KEY"),
            "LLM_BASE_URL": os.getenv("LLM_BASE_URL"),
            "LLM_MODEL": os.getenv("LLM_MODEL"),
        }
        os.environ["LLM_API_KEY"] = "test-key"
        os.environ["LLM_BASE_URL"] = "https://example.com/v1"
        os.environ["LLM_MODEL"] = "test-model"

    def tearDown(self) -> None:
        setattr(svc, "_run_ai_schema_insight_llm", self._original_runner)
        for key, value in self._env_backup.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        self.db.close()
        self._engine.dispose()
        self._tmpdir.cleanup()

    def test_run_ai_schema_insight_reads_xlsx_and_persists_valid_llm_output(self) -> None:
        self.assertTrue(FIXTURE_XLSX_PATH.exists(), "测试依赖的 xlsx 文件不存在")

        def _fake_llm_runner(*, project, enabled_docs, xlsx_inputs, existing_entity_names):
            self.assertEqual(project.id, "proj_test_1")
            self.assertGreaterEqual(len(enabled_docs), 1)
            # This assertion locks the new behavior: xlsx content must be parsed before LLM extraction.
            self.assertGreater(len(xlsx_inputs.get("entity_templates") or []), 0)
            return {
                "entities": [
                    {
                        "name": "FaultPhenomenon",
                        "display_name": "故障现象",
                        "description": "设备故障现象",
                        "properties": [
                            {
                                "name": "symptom_desc",
                                "display_name": "现象描述",
                                "data_type": "TEXT",
                                "required": True,
                                "default_value": "",
                                "description": "故障现象描述",
                            }
                        ],
                        "evidence": [{"sheet": "实体定义", "row": 2, "snippet": "故障现象"}],
                        "confidence": 0.92,
                    },
                    {
                        "name": "AlarmCode",
                        "display_name": "报警码",
                        "description": "设备报警码",
                        "properties": [
                            {
                                "name": "code",
                                "display_name": "编码",
                                "data_type": "STRING",
                                "required": True,
                                "default_value": "",
                                "description": "报警编码",
                            }
                        ],
                        "evidence": [{"sheet": "实体定义", "row": 3, "snippet": "报警码"}],
                        "confidence": 0.9,
                    },
                ],
                "relations": [
                    {
                        "name": "triggered_by",
                        "display_name": "由报警触发",
                        "description": "故障现象由报警码触发",
                        "domain_entity_name": "FaultPhenomenon",
                        "range_entity_name": "AlarmCode",
                        "properties": [],
                        "evidence": [{"sheet": "关系定义", "row": 2, "snippet": "故障现象-报警码"}],
                        "confidence": 0.88,
                    }
                ],
                "warnings": [],
            }

        setattr(svc, "_run_ai_schema_insight_llm", _fake_llm_runner)

        result = svc.run_ai_schema_insight(self.db, 1, "proj_test_1")

        self.assertEqual(result["added_entity_count"], 2)
        self.assertEqual(result["added_relation_count"], 1)
        self.assertCountEqual(result["added_entity_names"], ["FaultPhenomenon", "AlarmCode"])
        self.assertEqual(result["added_relation_names"], ["triggered_by"])

        self.assertEqual(self.db.query(EntityType).count(), 2)
        self.assertEqual(self.db.query(RelationType).count(), 1)
        self.assertGreaterEqual(self.db.query(SchemaProperty).count(), 2)

    def test_run_ai_schema_insight_rejects_relation_pointing_to_missing_entity(self) -> None:
        def _fake_llm_runner(*, project, enabled_docs, xlsx_inputs, existing_entity_names):
            return {
                "entities": [
                    {
                        "name": "FaultPhenomenon",
                        "display_name": "故障现象",
                        "description": "设备故障现象",
                        "properties": [],
                        "evidence": [{"sheet": "实体定义", "row": 2, "snippet": "故障现象"}],
                        "confidence": 0.9,
                    }
                ],
                "relations": [
                    {
                        "name": "broken_relation",
                        "display_name": "无效关系",
                        "description": "引用不存在实体",
                        "domain_entity_name": "FaultPhenomenon",
                        "range_entity_name": "MissingEntity",
                        "properties": [],
                        "evidence": [{"sheet": "关系定义", "row": 10, "snippet": "坏关系"}],
                        "confidence": 0.7,
                    }
                ],
                "warnings": [],
            }

        setattr(svc, "_run_ai_schema_insight_llm", _fake_llm_runner)

        with self.assertRaises(ValueError):
            svc.run_ai_schema_insight(self.db, 1, "proj_test_1")

        self.assertEqual(self.db.query(EntityType).count(), 0)
        self.assertEqual(self.db.query(RelationType).count(), 0)


if __name__ == "__main__":
    unittest.main()
