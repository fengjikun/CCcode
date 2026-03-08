#!/usr/bin/env python3
"""
SQLite → MySQL 全量数据迁移脚本

从 SQLite 读取所有表数据，批量写入 MySQL。
支持：
  - 自动检测所有业务表（跳过 alembic_version）
  - 按外键依赖排序表迁移顺序
  - 批量插入（默认 500 条/批）
  - 逐表统计迁移结果
  - 失败回滚 + 详细错误信息

用法：
  DB_TYPE=mysql python scripts/migrate_sqlite_to_mysql.py --sqlite-path backend/data/devicedb.sqlite

该脚本由 upgrade_to_mysql.sh 自动调用，通常不需要手动执行。
"""

import argparse
import sys
import os
from pathlib import Path

# 确保 backend/ 在 sys.path 中
_backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(_backend_dir))
os.chdir(_backend_dir)

from sqlalchemy import create_engine, inspect, text, MetaData
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session


# ─── 表迁移顺序（按外键依赖关系排列，无外键的表在前） ──────────────────────
# 确保父表先于子表迁移；如果新增了表，追加到合适的位置即可
TABLE_ORDER = [
    # 基础表（无外键依赖）
    "users",
    "fault_records",
    # 本体层
    "onto_object_types",
    "onto_properties",
    "onto_link_types",
    "onto_objects",
    "onto_links",
    "onto_action_types",
    "onto_action_parameters",
    "onto_action_rules",
    "onto_action_executions",
    "onto_functions",
    "onto_function_logs",
    # 项目管理层
    "pm_projects",
    "pm_project_documents",
    "pm_project_data_sources",
    "pm_schema_configs",
    "pm_entity_types",
    "pm_relation_types",
    "pm_schema_properties",
    "pm_skills",
    "pm_extraction_runs",
    "pm_ai_insight_runs",
    "pm_review_items",
    "pm_ontology_versions",
    "pm_version_items",
    "pm_project_actions",
    "pm_project_functions",
]

SKIP_TABLES = {"alembic_version"}
BATCH_SIZE = 500


def get_table_names_from_sqlite(sqlite_engine):
    """获取 SQLite 中的实际表名"""
    insp = inspect(sqlite_engine)
    return [t for t in insp.get_table_names() if t not in SKIP_TABLES]


def migrate_table(table_name, sqlite_engine, mysql_engine, metadata):
    """迁移单个表的数据"""
    # 使用 metadata 反射获取表结构
    if table_name not in metadata.tables:
        return 0, "表不在 SQLite 元数据中，跳过"

    table = metadata.tables[table_name]

    # 从 SQLite 读取全部数据
    with sqlite_engine.connect() as src_conn:
        rows = src_conn.execute(table.select()).fetchall()

    if not rows:
        return 0, None

    # 获取列名
    columns = [c.name for c in table.columns]

    # 先清空 MySQL 目标表（幂等：可重复执行）
    with mysql_engine.begin() as dst_conn:
        dst_conn.execute(text(f"SET FOREIGN_KEY_CHECKS = 0"))
        dst_conn.execute(text(f"DELETE FROM `{table_name}`"))
        dst_conn.execute(text(f"SET FOREIGN_KEY_CHECKS = 1"))

    # 批量插入到 MySQL
    total = len(rows)
    with mysql_engine.begin() as dst_conn:
        dst_conn.execute(text(f"SET FOREIGN_KEY_CHECKS = 0"))
        for i in range(0, total, BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            data = [dict(zip(columns, row)) for row in batch]
            dst_conn.execute(table.insert(), data)
        dst_conn.execute(text(f"SET FOREIGN_KEY_CHECKS = 1"))

    return total, None


def main():
    parser = argparse.ArgumentParser(description="SQLite → MySQL 数据迁移")
    parser.add_argument("--sqlite-path", required=True, help="SQLite 数据库文件路径")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE, help="批量插入大小")
    parser.add_argument("--dry-run", action="store_true", help="仅检查，不执行迁移")
    args = parser.parse_args()

    sqlite_path = Path(args.sqlite_path)
    if not sqlite_path.exists():
        print(f"错误: SQLite 文件不存在: {sqlite_path}")
        sys.exit(1)

    # ─── 连接数据库 ─────────────────────────────────────────────────────
    sqlite_url = f"sqlite:///{sqlite_path}"
    sqlite_engine = create_engine(sqlite_url)

    # MySQL engine 从环境变量构建（与 app.database 一致的逻辑）
    db_host = os.getenv("DB_HOST", "127.0.0.1")
    db_port = os.getenv("DB_PORT", "3306")
    db_user = os.getenv("DB_USER", "cccode")
    db_password = os.getenv("DB_PASSWORD", "CCcode@2024")
    db_name = os.getenv("DB_NAME", "cccode")
    mysql_url = URL.create(
        "mysql+pymysql",
        username=db_user,
        password=db_password,
        host=db_host,
        port=int(db_port),
        database=db_name,
        query={"charset": "utf8mb4"},
    ).render_as_string(hide_password=False)
    mysql_engine = create_engine(mysql_url, pool_pre_ping=True)

    # ─── 反射 SQLite 表结构 ─────────────────────────────────────────────
    metadata = MetaData()
    metadata.reflect(bind=sqlite_engine)

    sqlite_tables = get_table_names_from_sqlite(sqlite_engine)

    # 按预定义顺序排列，未在 TABLE_ORDER 中的表追加到末尾
    ordered = [t for t in TABLE_ORDER if t in sqlite_tables]
    remaining = [t for t in sqlite_tables if t not in TABLE_ORDER]
    migrate_tables = ordered + remaining

    print(f"\n{'─' * 60}")
    print(f"  发现 {len(migrate_tables)} 个表需要迁移")
    print(f"{'─' * 60}")

    if args.dry_run:
        for t in migrate_tables:
            with sqlite_engine.connect() as conn:
                count = conn.execute(text(f"SELECT COUNT(*) FROM [{t}]")).scalar()
            print(f"  {t:40s} {count:>8} 行")
        print(f"\n  [DRY RUN] 未执行实际迁移")
        return

    # ─── 逐表迁移 ───────────────────────────────────────────────────────
    total_rows = 0
    success_count = 0
    fail_count = 0
    results = []

    for table_name in migrate_tables:
        try:
            count, err = migrate_table(table_name, sqlite_engine, mysql_engine, metadata)
            if err:
                results.append((table_name, "SKIP", err))
            else:
                results.append((table_name, "OK", f"{count} 行"))
                total_rows += count
                success_count += 1
        except Exception as e:
            results.append((table_name, "FAIL", str(e)))
            fail_count += 1

    # ─── 打印结果 ───────────────────────────────────────────────────────
    print(f"\n{'─' * 60}")
    print(f"  {'表名':40s} {'状态':6s} {'详情'}")
    print(f"{'─' * 60}")
    for name, status, detail in results:
        if status == "OK":
            icon = "✓"
        elif status == "SKIP":
            icon = "→"
        else:
            icon = "✗"
        print(f"  {icon} {name:38s} {status:6s} {detail}")

    print(f"{'─' * 60}")
    print(f"  总计: {success_count} 个表成功, {fail_count} 个失败, {total_rows} 行数据已迁移")
    print(f"{'─' * 60}\n")

    # ─── 验证 ───────────────────────────────────────────────────────────
    if fail_count == 0:
        # 对比每张表的行数
        mismatch = []
        for table_name in migrate_tables:
            if table_name not in metadata.tables:
                continue
            with sqlite_engine.connect() as conn:
                src_count = conn.execute(text(f"SELECT COUNT(*) FROM [{table_name}]")).scalar()
            with mysql_engine.connect() as conn:
                dst_count = conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`")).scalar()
            if src_count != dst_count:
                mismatch.append((table_name, src_count, dst_count))

        if mismatch:
            print("  ⚠️  行数不一致:")
            for name, src, dst in mismatch:
                print(f"     {name}: SQLite={src}, MySQL={dst}")
            sys.exit(1)
        else:
            print("  ✓ 数据验证通过：所有表行数一致")
    else:
        print(f"  ⚠️  有 {fail_count} 个表迁移失败，请检查错误信息")
        sys.exit(1)


if __name__ == "__main__":
    main()
