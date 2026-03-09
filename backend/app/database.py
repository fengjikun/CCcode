import os
from datetime import datetime
from types import SimpleNamespace
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.sql.elements import BinaryExpression

APP_MODE = (os.getenv("APP_MODE", "prod") or "prod").strip().lower()
IS_MOCK_MODE = APP_MODE == "mock"


class MockQuery:
    def __init__(self, model, state: dict):
        self._model = model
        self._state = state
        self._items = self._load_items()

    def _load_items(self):
        model_name = getattr(self._model, "__name__", "")
        if model_name == "FaultRecord":
            return list(self._state["fault_records"])
        return []

    def filter(self, *criteria):
        for criterion in criteria:
            if isinstance(criterion, BinaryExpression):
                key = getattr(criterion.left, "key", None)
                value = getattr(criterion.right, "value", None)
                if key is not None:
                    self._items = [
                        item for item in self._items if getattr(item, key, None) == value
                    ]
        return self

    def order_by(self, *_args):
        return self

    def limit(self, count: int):
        self._items = self._items[:count]
        return self

    def first(self):
        return self._items[0] if self._items else None

    def all(self):
        return list(self._items)


class MockDatabaseSession:
    def __init__(self, state: dict):
        self._state = state

    def query(self, model):
        return MockQuery(model, self._state)

    def add(self, obj):
        model_name = obj.__class__.__name__
        if model_name == "FaultRecord":
            if getattr(obj, "id", None) is None:
                obj.id = self._state["fault_record_seq"]
                self._state["fault_record_seq"] += 1
            if getattr(obj, "reported_at", None) is None:
                obj.reported_at = datetime.now()
            records = self._state["fault_records"]
            if not any(getattr(item, "id", None) == obj.id for item in records):
                records.append(obj)

    def commit(self):
        return None

    def refresh(self, _obj):
        return None

    def close(self):
        return None

    def delete(self, obj):
        model_name = obj.__class__.__name__
        if model_name == "FaultRecord":
            self._state["fault_records"] = [
                item for item in self._state["fault_records"] if getattr(item, "id", None) != obj.id
            ]

    def get(self, model, ident):
        model_name = getattr(model, "__name__", "")
        if model_name == "FaultRecord":
            for item in self._state["fault_records"]:
                if getattr(item, "id", None) == ident:
                    return item
            return None
        if model_name == "User" and ident == 1:
            username = (os.getenv("AUTH_DEFAULT_USERNAME", "admin") or "admin").strip() or "admin"
            return SimpleNamespace(id=1, username=username, is_active=True)
        return None


_mock_state = {
    "fault_records": [],
    "fault_record_seq": 1,
}

# 数据库配置：仅支持 MySQL；mock 模式下完全跳过引擎初始化
_host = os.getenv("DB_HOST", "127.0.0.1")
_port = os.getenv("DB_PORT", "3306")
_user = os.getenv("DB_USER", "cccode")
_password = os.getenv("DB_PASSWORD", "CCcode@2024")
_name = os.getenv("DB_NAME", "cccode")
DATABASE_URL = f"mysql+pymysql://{quote_plus(_user)}:{quote_plus(_password)}@{_host}:{_port}/{_name}?charset=utf8mb4"

if IS_MOCK_MODE:
    engine = None

    def SessionLocal():
        return MockDatabaseSession(_mock_state)
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        pool_pre_ping=True,
    )
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        if hasattr(db, "close"):
            db.close()
