from __future__ import annotations

import importlib
import sys

from fastapi.testclient import TestClient


def _reload_mock_app():
    for name in list(sys.modules):
        if name == "app" or name.startswith("app."):
            sys.modules.pop(name, None)
    return importlib.import_module("app.main")


def test_mock_mode_login_and_protected_routes(monkeypatch):
    monkeypatch.setenv("APP_MODE", "mock")

    main_mod = _reload_mock_app()
    client = TestClient(main_mod.app)

    login_res = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123456"},
    )
    assert login_res.status_code == 200

    token = login_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "admin"

    projects_res = client.get("/api/projects/", headers=headers)
    assert projects_res.status_code == 200
    assert isinstance(projects_res.json(), list)

    phenomena_res = client.get("/api/diagnosis/phenomena", headers=headers)
    assert phenomena_res.status_code == 200
    assert isinstance(phenomena_res.json(), list)


def test_mock_mode_login_rejects_invalid_credentials(monkeypatch):
    monkeypatch.setenv("APP_MODE", "mock")

    main_mod = _reload_mock_app()
    client = TestClient(main_mod.app)

    bad_password_res = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "wrong-password"},
    )
    assert bad_password_res.status_code == 401
    assert bad_password_res.json()["detail"] == "用户名或密码错误"

    bad_username_res = client.post(
        "/api/auth/login",
        json={"username": "not-admin", "password": "admin123456"},
    )
    assert bad_username_res.status_code == 401
    assert bad_username_res.json()["detail"] == "用户名或密码错误"
