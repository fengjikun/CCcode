"""集中式日志配置 — 在 main.py 中最早调用 configure_logging()"""
from __future__ import annotations

import logging
import os
import sys


def configure_logging() -> None:
    """配置应用日志：格式、级别、handler。

    环境变量：
        APP_LOG_LEVEL   应用日志级别，默认 INFO
        LOG_FORMAT      "json" 输出 JSON Lines（生产环境），其他值输出可读文本（默认）
    """
    level_name = (os.getenv("APP_LOG_LEVEL") or "INFO").strip().upper()
    level = logging._nameToLevel.get(level_name, logging.INFO)

    log_format = (os.getenv("LOG_FORMAT") or "text").strip().lower()

    if log_format == "json":
        fmt = '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)r}'
    else:
        fmt = "%(asctime)s [%(levelname)-8s] %(name)s — %(message)s"

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S"))

    # 配置根 logger
    root = logging.getLogger()
    root.setLevel(logging.WARNING)  # 第三方库默认 WARNING
    if not any(isinstance(h, logging.StreamHandler) and h.stream is sys.stdout for h in root.handlers):
        root.addHandler(handler)

    # 应用自身 logger 降到用户配置级别
    for name in ("app", "app.api_access"):
        lg = logging.getLogger(name)
        lg.setLevel(level)
        lg.propagate = True

    # 压制 alembic 迁移的 INFO 日志（只保留 WARNING+）
    logging.getLogger("alembic").setLevel(logging.WARNING)
    logging.getLogger("alembic.runtime.migration").setLevel(logging.WARNING)
