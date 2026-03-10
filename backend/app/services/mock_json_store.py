"""JSON-backed stores used by mock routers."""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Callable, Any


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _mock_data_dir() -> Path:
    d = _backend_root() / "mock_data"
    d.mkdir(parents=True, exist_ok=True)
    return d


class JsonStore:
    def __init__(self, file_path: Path, default_factory: Callable[[], dict[str, Any]]):
        self.file_path = file_path
        self._default_factory = default_factory
        self._lock = threading.Lock()
        self._last_mtime_ns: int | None = None
        self.data = self._load_or_init()

    def _load_or_init(self) -> dict[str, Any]:
        if not self.file_path.exists():
            data = self._default_factory()
            self.data = data
            self.save()
            return data

        try:
            with self.file_path.open("r", encoding="utf-8") as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                self._last_mtime_ns = self.file_path.stat().st_mtime_ns
                return loaded
        except (OSError, json.JSONDecodeError):
            pass

        data = self._default_factory()
        self.data = data
        self.save()
        return data

    def _save_locked(self) -> None:
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.file_path.with_suffix(self.file_path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
        tmp.replace(self.file_path)
        try:
            self._last_mtime_ns = self.file_path.stat().st_mtime_ns
        except OSError:
            self._last_mtime_ns = None

    def save(self) -> None:
        with self._lock:
            self._save_locked()

    def reload_if_changed(self) -> bool:
        try:
            current_mtime_ns = self.file_path.stat().st_mtime_ns
        except OSError:
            return False

        with self._lock:
            if self._last_mtime_ns == current_mtime_ns:
                return False

            try:
                with self.file_path.open("r", encoding="utf-8") as f:
                    loaded = json.load(f)
            except (OSError, json.JSONDecodeError):
                return False

            if not isinstance(loaded, dict):
                return False

            self.data = loaded
            self._last_mtime_ns = current_mtime_ns
            return True

    def next_id(self, *, key: str = "idSeq", start: int = 1000) -> int:
        with self._lock:
            current = self.data.get(key, start)
            try:
                current_int = int(current)
            except (TypeError, ValueError):
                current_int = start
            if current_int < start:
                current_int = start
            current_int += 1
            self.data[key] = current_int
            self._save_locked()
            return current_int


def _default_ontology_store() -> dict[str, Any]:
    return {
        "objectTypes": [],
        "properties": {},
        "linkTypes": [],
        "actionTypes": [],
        "actionParameters": {},
        "actionRules": {},
        "functions": [],
        "objects": [],
        "links": [],
        "idSeq": 1000,
    }


def _default_ontology_overview_store() -> dict[str, Any]:
    return {"objectTypes": [], "linkTypes": [], "actions": []}


def _default_project_store() -> dict[str, Any]:
    return {"projects": [], "idSeq": 1000}


def _default_ui_store() -> dict[str, Any]:
    return {"namespaces": {}, "idSeq": 1000}


_mock_dir = _mock_data_dir()

ontology_store = JsonStore(_mock_dir / "ontology_store.json", _default_ontology_store)
ontology_overview_store = JsonStore(
    _mock_dir / "ontology_overview.json",
    _default_ontology_overview_store,
)
project_store = JsonStore(_mock_dir / "project_store.json", _default_project_store)
ui_store = JsonStore(_mock_dir / "ui_store.json", _default_ui_store)


def next_onto_id() -> int:
    return ontology_store.next_id(start=1000)


def next_proj_id() -> int:
    return project_store.next_id(start=1000)


def next_ui_id() -> int:
    return ui_store.next_id(start=1000)
