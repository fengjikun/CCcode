import os
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# 数据库配置：仅支持 MySQL
_host = os.getenv("DB_HOST", "127.0.0.1")
_port = os.getenv("DB_PORT", "3306")
_user = os.getenv("DB_USER", "cccode")
_password = os.getenv("DB_PASSWORD", "CCcode@2024")
_name = os.getenv("DB_NAME", "cccode")
DATABASE_URL = f"mysql+pymysql://{quote_plus(_user)}:{quote_plus(_password)}@{_host}:{_port}/{_name}?charset=utf8mb4"
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
        db.close()
