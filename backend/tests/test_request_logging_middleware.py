import logging
import os
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.request_logging import setup_request_logging_middleware


class _ListHandler(logging.Handler):
    def __init__(self) -> None:
        super().__init__()
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)


class RequestLoggingMiddlewareTests(unittest.TestCase):
    def setUp(self) -> None:
        self._env_backup = {
            "API_ACCESS_LOG_LEVEL": os.getenv("API_ACCESS_LOG_LEVEL"),
            "API_SLOW_MS_THRESHOLD": os.getenv("API_SLOW_MS_THRESHOLD"),
        }
        os.environ.pop("API_ACCESS_LOG_LEVEL", None)
        os.environ.pop("API_SLOW_MS_THRESHOLD", None)

        self.logger = logging.getLogger("app.api_access")
        self.logger.setLevel(logging.INFO)
        self.handler = _ListHandler()
        self.logger.addHandler(self.handler)

    def tearDown(self) -> None:
        self.logger.removeHandler(self.handler)
        for key, value in self._env_backup.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def test_logs_successful_api_call_and_sets_request_id_header(self) -> None:
        app = FastAPI()
        setup_request_logging_middleware(app)

        @app.get("/api/ping")
        def ping():
            return {"ok": True}

        client = TestClient(app)
        response = client.get(
            "/api/ping?from=test",
            headers={
                "x-forwarded-for": "10.0.0.1, 127.0.0.1",
                "user-agent": "unit-test-agent",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers.get("X-Request-ID"))
        messages = [record.getMessage() for record in self.handler.records]
        self.assertTrue(any("api_call " in message for message in messages))
        self.assertTrue(any("path=/api/ping" in message for message in messages))
        self.assertTrue(any("status=200" in message for message in messages))

    def test_logs_error_for_failed_api_call(self) -> None:
        app = FastAPI()
        setup_request_logging_middleware(app)

        @app.get("/api/error")
        def raise_error():
            raise RuntimeError("boom")

        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/api/error")

        self.assertEqual(response.status_code, 500)
        messages = [record.getMessage() for record in self.handler.records]
        self.assertTrue(any("api_call_error " in message for message in messages))
        self.assertTrue(any("path=/api/error" in message for message in messages))

    def test_uses_env_log_level_for_api_access_logger(self) -> None:
        os.environ["API_ACCESS_LOG_LEVEL"] = "WARNING"
        app = FastAPI()
        setup_request_logging_middleware(app)

        @app.get("/api/ping")
        def ping():
            return {"ok": True}

        client = TestClient(app)
        response = client.get("/api/ping")

        self.assertEqual(response.status_code, 200)
        messages = [record.getMessage() for record in self.handler.records]
        self.assertFalse(any("api_call " in message for message in messages))

    def test_logs_slow_api_call_as_warning(self) -> None:
        os.environ["API_SLOW_MS_THRESHOLD"] = "0"
        app = FastAPI()
        setup_request_logging_middleware(app)

        @app.get("/api/slow")
        def slow():
            return {"ok": True}

        client = TestClient(app)
        response = client.get("/api/slow")

        self.assertEqual(response.status_code, 200)
        warning_messages = [
            record.getMessage()
            for record in self.handler.records
            if record.levelno >= logging.WARNING
        ]
        self.assertTrue(any("api_call_slow " in message for message in warning_messages))
        self.assertTrue(any("path=/api/slow" in message for message in warning_messages))


if __name__ == "__main__":
    unittest.main()
