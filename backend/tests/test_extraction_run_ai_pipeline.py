import json
import os
import sys
import tempfile
import time
import types
import unittest
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.project_mgmt import EntityType, ExtractionRun, Project, ProjectDocument, RelationType
from app.services import project_mgmt_service as svc


class ExtractionRunAiPipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        db_file = Path(self._tmpdir.name) / "test.sqlite"
        self._engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self._engine)
        self._SessionLocal = sessionmaker(bind=self._engine, autocommit=False, autoflush=False)
        self.db = self._SessionLocal()

        self.doc_path = Path(self._tmpdir.name) / "source.md"
        self.doc_path.write_text(
            "# 设备履历\n\n张三目前在华星科技担任设备工程师。\n",
            encoding="utf-8",
        )

        project = Project(
            id="proj_ext_1",
            owner_user_id=1,
            name="Extraction Project",
            description="",
        )
        document = ProjectDocument(
            id="doc_ext_1",
            project_id=project.id,
            name="source.md",
            file_type="md",
            size_bytes=self.doc_path.stat().st_size,
            status="READY",
            enabled=True,
            storage_path=str(self.doc_path),
        )
        entity_person = EntityType(
            id="ent_person",
            project_id=project.id,
            name="Person",
            description="Person type",
        )
        entity_org = EntityType(
            id="ent_org",
            project_id=project.id,
            name="Org",
            description="Org type",
        )
        relation = RelationType(
            id="rel_works_for",
            project_id=project.id,
            name="works_for",
            domain_entity_type_id=entity_person.id,
            range_entity_type_id=entity_org.id,
            description="employment",
        )

        self.db.add(project)
        self.db.add(document)
        self.db.add(entity_person)
        self.db.add(entity_org)
        self.db.add(relation)
        self.db.commit()

        self._original_runner = getattr(svc, "_run_ai_instance_extraction_llm", None)
        self._env_backup = {
            "LLM_API_KEY": os.getenv("LLM_API_KEY"),
            "LLM_BASE_URL": os.getenv("LLM_BASE_URL"),
            "LLM_MODEL": os.getenv("LLM_MODEL"),
        }
        os.environ["LLM_API_KEY"] = "test-key"
        os.environ["LLM_BASE_URL"] = "https://example.com/v1"
        os.environ["LLM_MODEL"] = "test-model"

    def tearDown(self) -> None:
        if self._original_runner is None:
            if hasattr(svc, "_run_ai_instance_extraction_llm"):
                delattr(svc, "_run_ai_instance_extraction_llm")
        else:
            setattr(svc, "_run_ai_instance_extraction_llm", self._original_runner)

        for key, value in self._env_backup.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

        self.db.close()
        self._engine.dispose()
        self._tmpdir.cleanup()

    def test_create_extraction_run_uses_model_output_to_build_review_items(self) -> None:
        called = {"flag": False}

        def _fake_llm_runner(*, project, enabled_docs, schema_payload, document_payload, xlsx_inputs):
            called["flag"] = True
            self.assertEqual(project.id, "proj_ext_1")
            self.assertEqual(len(enabled_docs), 1)
            self.assertGreaterEqual(len(schema_payload.get("entity_types") or []), 2)
            self.assertEqual((schema_payload.get("relation_types") or [])[0]["name"], "works_for")
            self.assertGreaterEqual(len(document_payload.get("documents") or []), 1)
            self.assertEqual(len(xlsx_inputs.get("entity_instances") or []), 0)
            return {
                "entities": [
                    {
                        "type": "Person",
                        "name": "张三",
                        "evidence": "文档提到张三在华星科技任职。",
                        "confidence": 0.93,
                    },
                    {
                        "type": "Org",
                        "name": "华星科技",
                        "evidence": "文档提到华星科技。",
                        "confidence": 0.91,
                    },
                ],
                "relations": [
                    {
                        "relation": "works_for",
                        "domain_type": "Person",
                        "domain_name": "张三",
                        "range_type": "Org",
                        "range_name": "华星科技",
                        "evidence": "张三目前在华星科技担任设备工程师。",
                        "confidence": 0.88,
                    }
                ],
                "warnings": [],
            }

        setattr(svc, "_run_ai_instance_extraction_llm", _fake_llm_runner)

        created = svc.create_extraction_run(self.db, 1, "proj_ext_1")
        self.assertEqual(created["status"], "RUNNING")
        result = self._wait_until_run_finished(created["id"])

        self.assertTrue(called["flag"], "create_extraction_run 必须调用模型抽取")
        self.assertEqual(result["status"], "COMPLETED")
        self.assertEqual(result["candidate_entity_count"], 2)
        self.assertEqual(result["candidate_relation_count"], 1)
        self.assertEqual(result["pending_review_count"], 3)
        self.assertIsNotNone(result.get("logs"))
        self.assertGreater(len(result.get("logs") or []), 0)
        logs = result.get("logs") or []
        self.assertTrue(any("load" in line and "skill" in line for line in logs), "应记录 mock skill 加载日志")
        load_index = next(
            (idx for idx, line in enumerate(logs) if "load" in line and "skill" in line),
            -1,
        )
        model_index = next((idx for idx, line in enumerate(logs) if "开始并发抽取" in line), -1)
        self.assertGreaterEqual(load_index, 0)
        self.assertGreaterEqual(model_index, 0)
        self.assertLess(load_index, model_index, "应先记录 load skill，再记录抽取日志")

        titles = [item["title"] for item in result["review_items"]]
        self.assertIn("Person::张三", titles)
        self.assertIn("Org::华星科技", titles)
        self.assertIn("Person::张三 -[works_for]-> Org::华星科技", titles)

    def test_create_extraction_run_filters_invalid_relation_by_schema(self) -> None:
        def _fake_llm_runner(*, project, enabled_docs, schema_payload, document_payload, xlsx_inputs):
            return {
                "entities": [
                    {
                        "type": "Person",
                        "name": "张三",
                        "evidence": "文档提到张三。",
                        "confidence": 0.9,
                    }
                ],
                "relations": [
                    {
                        "relation": "works_for",
                        "domain_type": "Org",
                        "domain_name": "华星科技",
                        "range_type": "Person",
                        "range_name": "张三",
                        "evidence": "关系方向错误。",
                        "confidence": 0.87,
                    }
                ],
                "warnings": [],
            }

        setattr(svc, "_run_ai_instance_extraction_llm", _fake_llm_runner)

        created = svc.create_extraction_run(self.db, 1, "proj_ext_1")
        result = self._wait_until_run_finished(created["id"])

        self.assertEqual(result["candidate_entity_count"], 1)
        self.assertEqual(result["candidate_relation_count"], 0)
        titles = [item["title"] for item in result["review_items"]]
        self.assertEqual(titles, ["Person::张三"])

    def test_create_extraction_run_logs_mock_skill_load_before_processing(self) -> None:
        def _fake_llm_runner(*, project, enabled_docs, schema_payload, document_payload, xlsx_inputs):
            return {
                "entities": [
                    {
                        "type": "Person",
                        "name": "张三",
                        "evidence": "文档提到张三。",
                        "confidence": 0.9,
                    }
                ],
                "relations": [],
                "warnings": [],
            }

        setattr(svc, "_run_ai_instance_extraction_llm", _fake_llm_runner)

        created = svc.create_extraction_run(self.db, 1, "proj_ext_1")
        result = self._wait_until_run_finished(created["id"])

        self.assertEqual(result["status"], "COMPLETED")
        logs = result.get("logs") or []
        self.assertTrue(any("load" in line and "skill" in line for line in logs), "应记录 mock skill 加载日志")
        load_index = next(
            (idx for idx, line in enumerate(logs) if "load" in line and "skill" in line),
            -1,
        )
        model_index = next((idx for idx, line in enumerate(logs) if "开始并发抽取" in line), -1)
        self.assertGreaterEqual(load_index, 0)
        self.assertGreaterEqual(model_index, 0)
        self.assertLess(load_index, model_index, "应先记录 load skill，再记录抽取日志")

    def test_create_extraction_run_rejects_when_another_run_is_running(self) -> None:
        def _slow_llm_runner(*, project, enabled_docs, schema_payload, document_payload, xlsx_inputs):
            time.sleep(0.3)
            return {
                "entities": [
                    {
                        "type": "Person",
                        "name": "张三",
                        "evidence": "文档提到张三。",
                        "confidence": 0.9,
                    }
                ],
                "relations": [],
                "warnings": [],
            }

        setattr(svc, "_run_ai_instance_extraction_llm", _slow_llm_runner)

        first = svc.create_extraction_run(self.db, 1, "proj_ext_1")
        self.assertEqual(first["status"], "RUNNING")

        with self.assertRaises(ValueError):
            svc.create_extraction_run(self.db, 1, "proj_ext_1")

        self._wait_until_run_finished(first["id"])

    def test_run_ai_instance_extraction_llm_prompt_uses_schema_whitelist(self) -> None:
        captured: dict[str, object] = {}

        class _FakeCompletions:
            def create(self, *, model: str, messages: list[dict[str, str]], max_tokens: int):
                captured["model"] = model
                captured["messages"] = messages
                captured["max_tokens"] = max_tokens
                return types.SimpleNamespace(
                    choices=[
                        types.SimpleNamespace(
                            message=types.SimpleNamespace(
                                content='{"entities":[],"relations":[],"warnings":[]}'
                            )
                        )
                    ]
                )

        class _FakeOpenAI:
            def __init__(self, *, api_key: str, base_url: str):
                captured["api_key"] = api_key
                captured["base_url"] = base_url
                self.chat = types.SimpleNamespace(completions=_FakeCompletions())

        original_openai = sys.modules.get("openai")
        sys.modules["openai"] = types.SimpleNamespace(OpenAI=_FakeOpenAI)
        try:
            schema_payload = {
                "entity_types": [
                    {"name": "Equipment"},
                    {"name": "Failure"},
                ],
                "relation_types": [
                    {"name": "has_failure", "domain": "Equipment", "range": "Failure"},
                ],
            }
            project = self.db.query(Project).filter(Project.id == "proj_ext_1").first()
            self.assertIsNotNone(project)
            assert project is not None
            result = svc._run_ai_instance_extraction_llm(
                project=project,
                enabled_docs=[],
                schema_payload=schema_payload,
                document_payload={
                    "documents": [{"id": "doc_1", "name": "source.md", "text": "设备 A 发生故障 B"}]
                },
                xlsx_inputs={},
            )

            self.assertEqual(result, {"entities": [], "relations": [], "warnings": []})
            messages = captured.get("messages")
            self.assertIsInstance(messages, list)
            assert isinstance(messages, list)
            system_prompt = next(item["content"] for item in messages if item.get("role") == "system")
            user_prompt = next(item["content"] for item in messages if item.get("role") == "user")
            self.assertIn("允许实体类型白名单：Equipment, Failure", system_prompt)
            self.assertIn("允许关系签名白名单：has_failure: Equipment -> Failure", system_prompt)
            self.assertNotIn("works_for", system_prompt)

            payload = json.loads(user_prompt)
            relation_hint = payload["output_schema_hint"]["relations"][0]
            self.assertEqual(relation_hint["relation"], "has_failure")
            self.assertEqual(relation_hint["domain_type"], "Equipment")
            self.assertEqual(relation_hint["range_type"], "Failure")
        finally:
            if original_openai is None:
                sys.modules.pop("openai", None)
            else:
                sys.modules["openai"] = original_openai

    def test_get_project_detail_cleans_interrupted_running_extraction_run(self) -> None:
        now = datetime.now()
        run = ExtractionRun(
            id="run_stale_1",
            project_id="proj_ext_1",
            status="RUNNING",
            progress=30,
            source_snapshot_json="{}",
            candidate_entity_count=0,
            candidate_relation_count=0,
            pending_review_count=0,
            error_message='{"stage":"EXTRACTING","logs":["正在抽取。"]}',
            created_at=now,
            completed_at=None,
            updated_at=now,
        )
        self.db.add(run)
        self.db.commit()

        detail = svc.get_project_detail(self.db, 1, "proj_ext_1")
        latest = detail["runs"][0]
        self.assertEqual(latest["id"], "run_stale_1")
        self.assertEqual(latest["status"], "FAILED")
        self.assertEqual(latest["progress"], 100)
        self.assertTrue(latest.get("completed_at"))
        self.assertIn("服务实例中断", latest.get("error_message") or "")

    def _wait_until_run_finished(self, run_id: str, timeout_seconds: float = 5.0) -> dict:
        deadline = time.time() + timeout_seconds
        while time.time() < deadline:
            self.db.expire_all()
            run = svc.get_extraction_run(self.db, 1, "proj_ext_1", run_id)
            if run["status"] != "RUNNING":
                return run
            time.sleep(0.05)
        self.fail("抽取任务超时未结束")


if __name__ == "__main__":
    unittest.main()
