import json
import time
from pathlib import Path

from app.services.mock_json_store import JsonStore


def test_json_store_reload_if_changed_refreshes_external_file_update(tmp_path: Path):
    path = tmp_path / "ui_store.json"
    path.write_text(json.dumps({"namespaces": {"data-sources": {"items": [{"id": "old"}]}}}), encoding="utf-8")

    store = JsonStore(path, lambda: {"namespaces": {}, "idSeq": 1000})
    assert store.data["namespaces"]["data-sources"]["items"][0]["id"] == "old"

    time.sleep(0.001)
    path.write_text(json.dumps({"namespaces": {"data-sources": {"items": [{"id": "new"}]}}}), encoding="utf-8")

    assert store.reload_if_changed() is True
    assert store.data["namespaces"]["data-sources"]["items"][0]["id"] == "new"
