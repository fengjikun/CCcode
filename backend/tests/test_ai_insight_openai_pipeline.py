import os
import tempfile
import time
import unittest
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.project_mgmt import AiInsightRun, EntityType, Project, ProjectDocument, RelationType, SchemaProperty
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

    def test_create_ai_schema_insight_run_executes_in_background_and_persists_result(self) -> None:
        called = {"flag": False}

        def _fake_llm_runner(*, project, enabled_docs, xlsx_inputs, existing_entity_names):
            called["flag"] = True
            self.assertEqual(project.id, "proj_test_1")
            self.assertGreaterEqual(len(enabled_docs), 1)
            self.assertGreater(len(xlsx_inputs.get("entity_templates") or []), 0)
            return {
                "entities": [
                    {
                        "name": "FaultPhenomenon",
                        "display_name": "故障现象",
                        "description": "设备故障现象",
                        "properties": [],
                        "evidence": [{"sheet": "实体定义", "row": 2, "snippet": "故障现象"}],
                        "confidence": 0.92,
                    }
                ],
                "relations": [],
                "warnings": [],
            }

        setattr(svc, "_run_ai_schema_insight_llm", _fake_llm_runner)

        created = svc.create_ai_schema_insight_run(self.db, 1, "proj_test_1")
        self.assertEqual(created["status"], "RUNNING")
        self.assertGreaterEqual(len(created.get("logs") or []), 1)

        finished = self._wait_until_ai_run_finished(created["id"])
        self.assertTrue(called["flag"], "create_ai_schema_insight_run 必须触发后台 AI 洞察")
        self.assertEqual(finished["status"], "COMPLETED")
        self.assertEqual(finished["added_entity_count"], 1)
        self.assertEqual(finished["added_relation_count"], 0)
        self.assertEqual(finished["added_entity_names"], ["FaultPhenomenon"])
        self.assertEqual(self.db.query(EntityType).count(), 1)
        self.assertGreaterEqual(len(finished.get("logs") or []), 1)

    def test_create_ai_schema_insight_run_rejects_when_another_run_is_running(self) -> None:
        def _slow_llm_runner(*, project, enabled_docs, xlsx_inputs, existing_entity_names):
            time.sleep(0.3)
            return {
                "entities": [
                    {
                        "name": "FaultPhenomenon",
                        "display_name": "故障现象",
                        "description": "设备故障现象",
                        "properties": [],
                        "evidence": [{"sheet": "实体定义", "row": 2, "snippet": "故障现象"}],
                        "confidence": 0.92,
                    }
                ],
                "relations": [],
                "warnings": [],
            }

        setattr(svc, "_run_ai_schema_insight_llm", _slow_llm_runner)

        first = svc.create_ai_schema_insight_run(self.db, 1, "proj_test_1")
        self.assertEqual(first["status"], "RUNNING")

        with self.assertRaises(ValueError):
            svc.create_ai_schema_insight_run(self.db, 1, "proj_test_1")

        self._wait_until_ai_run_finished(first["id"])

    def test_run_ai_schema_insight_processes_documents_one_by_one_and_dedupes_relation_type(self) -> None:
        second_doc = ProjectDocument(
            id="doc_test_2",
            project_id="proj_test_1",
            name="second.xlsx",
            file_type="xlsx",
            size_bytes=FIXTURE_XLSX_PATH.stat().st_size if FIXTURE_XLSX_PATH.exists() else 0,
            status="READY",
            enabled=True,
            storage_path=str(FIXTURE_XLSX_PATH),
            uploaded_at=datetime(2000, 1, 1),
        )
        self.db.add(second_doc)
        self.db.commit()

        calls: list[str] = []

        def _fake_llm_runner(*, project, enabled_docs, xlsx_inputs, existing_entity_names):
            self.assertEqual(project.id, "proj_test_1")
            self.assertEqual(len(enabled_docs), 1, "多文档 AI 洞察必须按单文档逐个执行")
            self.assertGreater(len(xlsx_inputs.get("entity_templates") or []), 0)
            doc = enabled_docs[0]
            calls.append(doc.id)
            if doc.id == "doc_test_1":
                return {
                    "entities": [
                        {
                            "name": "FaultPhenomenon",
                            "display_name": "故障现象",
                            "description": "设备故障现象",
                            "properties": [],
                            "evidence": [{"sheet": "实体定义", "row": 2, "snippet": "故障现象"}],
                            "confidence": 0.92,
                        },
                        {
                            "name": "AlarmCode",
                            "display_name": "报警码",
                            "description": "设备报警码",
                            "properties": [],
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
            return {
                "entities": [
                    {
                        "name": "Sensor",
                        "display_name": "传感器",
                        "description": "设备传感器",
                        "properties": [],
                        "evidence": [{"sheet": "实体定义", "row": 4, "snippet": "传感器"}],
                        "confidence": 0.9,
                    },
                    {
                        "name": "AlarmCode",
                        "display_name": "报警码",
                        "description": "设备报警码",
                        "properties": [],
                        "evidence": [{"sheet": "实体定义", "row": 5, "snippet": "报警码"}],
                        "confidence": 0.9,
                    },
                ],
                "relations": [
                    {
                        "name": "triggered_by",
                        "display_name": "触发关系",
                        "description": "传感器触发报警",
                        "domain_entity_name": "Sensor",
                        "range_entity_name": "AlarmCode",
                        "properties": [],
                        "evidence": [{"sheet": "关系定义", "row": 8, "snippet": "传感器-报警码"}],
                        "confidence": 0.86,
                    }
                ],
                "warnings": [],
            }

        setattr(svc, "_run_ai_schema_insight_llm", _fake_llm_runner)

        result = svc.run_ai_schema_insight(self.db, 1, "proj_test_1")

        self.assertEqual(len(calls), 2)
        self.assertEqual(result["scanned_document_count"], 2)
        self.assertCountEqual(result["added_entity_names"], ["FaultPhenomenon", "AlarmCode", "Sensor"])
        self.assertEqual(result["added_relation_names"], ["triggered_by"])
        self.assertEqual(self.db.query(EntityType).count(), 3)
        self.assertEqual(self.db.query(RelationType).count(), 1)

    def test_run_ai_schema_insight_keeps_previous_document_results_when_later_document_fails(self) -> None:
        second_doc = ProjectDocument(
            id="doc_test_2",
            project_id="proj_test_1",
            name="second.xlsx",
            file_type="xlsx",
            size_bytes=FIXTURE_XLSX_PATH.stat().st_size if FIXTURE_XLSX_PATH.exists() else 0,
            status="READY",
            enabled=True,
            storage_path=str(FIXTURE_XLSX_PATH),
            uploaded_at=datetime(2000, 1, 1),
        )
        self.db.add(second_doc)
        self.db.commit()

        calls: list[str] = []

        def _fake_llm_runner(*, project, enabled_docs, xlsx_inputs, existing_entity_names):
            self.assertEqual(len(enabled_docs), 1)
            doc = enabled_docs[0]
            calls.append(doc.id)
            if doc.id == "doc_test_1":
                return {
                    "entities": [
                        {
                            "name": "FaultPhenomenon",
                            "display_name": "故障现象",
                            "description": "设备故障现象",
                            "properties": [],
                            "evidence": [{"sheet": "实体定义", "row": 2, "snippet": "故障现象"}],
                            "confidence": 0.92,
                        }
                    ],
                    "relations": [],
                    "warnings": [],
                }
            return {
                "entities": [],
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

        self.assertEqual(len(calls), 2)
        self.assertEqual(self.db.query(EntityType).count(), 1)
        self.assertEqual(self.db.query(RelationType).count(), 0)

    def test_recover_interrupted_ai_insight_runs_marks_running_run_failed(self) -> None:
        now = datetime.now()
        run = AiInsightRun(
            id="airun_restart_1",
            project_id="proj_test_1",
            status="RUNNING",
            progress=45,
            scanned_document_count=1,
            added_entity_count=0,
            added_relation_count=0,
            added_entity_names_json="[]",
            added_relation_names_json="[]",
            warnings_json="[]",
            runtime_meta_json='{"stage":"LLM_EXTRACTING","logs":["文档解析完成，开始调用 AI 模型。"]}',
            error_message="",
            created_at=now,
            completed_at=None,
            updated_at=now,
        )
        self.db.add(run)
        self.db.commit()

        recovered = svc.recover_interrupted_ai_insight_runs(
            self.db,
            reason="服务已重启，任务中断，请重新执行",
        )
        self.assertEqual(recovered, 1)

        self.db.expire_all()
        run = svc.get_ai_schema_insight_run(self.db, 1, "proj_test_1", "airun_restart_1")
        self.assertEqual(run["status"], "FAILED")
        self.assertEqual(run["progress"], 100)
        self.assertEqual(run["error_message"], "服务已重启，任务中断，请重新执行")
        self.assertTrue(run["completed_at"])
        self.assertIn("任务中断", "\n".join(run.get("logs") or []))

    def test_get_project_detail_cleans_interrupted_running_ai_insight_run(self) -> None:
        now = datetime.now()
        run = AiInsightRun(
            id="airun_refresh_1",
            project_id="proj_test_1",
            status="RUNNING",
            progress=20,
            scanned_document_count=1,
            added_entity_count=0,
            added_relation_count=0,
            added_entity_names_json="[]",
            added_relation_names_json="[]",
            warnings_json="[]",
            runtime_meta_json='{"stage":"PREPARING","logs":["开始扫描文档。"]}',
            error_message="",
            created_at=now,
            completed_at=None,
            updated_at=now,
        )
        self.db.add(run)
        self.db.commit()

        detail = svc.get_project_detail(self.db, 1, "proj_test_1")

        self.assertIsNotNone(detail.get("ai_insight_run"))
        latest = detail["ai_insight_run"]
        self.assertEqual(latest["id"], "airun_refresh_1")
        self.assertEqual(latest["status"], "FAILED")
        self.assertEqual(latest["progress"], 100)
        self.assertTrue(latest.get("completed_at"))
        self.assertIn("服务实例中断", latest.get("error_message") or "")

    def _wait_until_ai_run_finished(self, run_id: str, timeout_seconds: float = 5.0) -> dict:
        deadline = time.time() + timeout_seconds
        while time.time() < deadline:
            self.db.expire_all()
            run = svc.get_ai_schema_insight_run(self.db, 1, "proj_test_1", run_id)
            if run["status"] != "RUNNING":
                return run
            time.sleep(0.05)
        self.fail("AI 洞察任务超时未结束")


if __name__ == "__main__":
    unittest.main()
