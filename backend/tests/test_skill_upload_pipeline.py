import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.project_mgmt import Project, Skill
from app.services import project_mgmt_service as svc


def _build_skill_zip(skill_md_content: str) -> bytes:
    buff = BytesIO()
    with ZipFile(buff, "w") as zf:
        zf.writestr("demo-skill/SKILL.md", skill_md_content)
        zf.writestr("demo-skill/README.md", "# demo")
    return buff.getvalue()


class SkillUploadPipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        db_file = Path(self._tmpdir.name) / "test.sqlite"
        self._engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self._engine)
        self._SessionLocal = sessionmaker(bind=self._engine, autocommit=False, autoflush=False)
        self.db = self._SessionLocal()

        project = Project(
            id="proj_skill_1",
            owner_user_id=1,
            name="Skill Project",
            description="",
        )
        self.db.add(project)
        self.db.commit()

    def tearDown(self) -> None:
        self.db.close()
        self._engine.dispose()
        self._tmpdir.cleanup()

    def test_upload_custom_skill_parses_skill_md_and_persists_package_blob(self) -> None:
        skill_zip = _build_skill_zip(
            """---
name: ontology-builder
description: 构建企业知识图谱的标准技能包
---

# Ontology Builder

用于构建并融合图谱实体关系。
"""
        )

        result = svc.upload_custom_skill(self.db, 1, "proj_skill_1", "ontology-builder.zip", skill_zip)

        self.assertEqual(result["source"], "uploaded")
        self.assertEqual(result["name"], "ontology-builder")
        self.assertTrue(result.get("metadata", {}).get("has_skill_md"))
        self.assertEqual(result.get("metadata", {}).get("package_format"), "claude-skill-zip")
        self.assertGreater(result.get("metadata", {}).get("package_entries", 0), 0)

        skill_row = self.db.query(Skill).filter(Skill.id == result["id"]).first()
        self.assertIsNotNone(skill_row)
        assert skill_row is not None
        self.assertIsNotNone(skill_row.package_blob)
        self.assertEqual(skill_row.file_name, "ontology-builder.zip")
        self.assertIn("claude-skill", skill_row.tags_json or "")

    def test_upload_custom_skill_rejects_zip_without_skill_md(self) -> None:
        buff = BytesIO()
        with ZipFile(buff, "w") as zf:
            zf.writestr("demo/readme.txt", "missing skill md")

        with self.assertRaises(ValueError):
            svc.upload_custom_skill(self.db, 1, "proj_skill_1", "bad.zip", buff.getvalue())


if __name__ == "__main__":
    unittest.main()
