import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.database import IS_MOCK_MODE, get_db
from app.models.user import User

AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "please-change-this-secret-key")
AUTH_TOKEN_EXPIRE_MINUTES = max(1, int(os.getenv("AUTH_TOKEN_EXPIRE_MINUTES", "480")))
AUTH_PASSWORD_HASH_ITERATIONS = max(100000, int(os.getenv("AUTH_PASSWORD_HASH_ITERATIONS", "200000")))

bearer_scheme = HTTPBearer(auto_error=False)


def build_mock_user(username: str | None = None, user_id: int = 1):
    resolved_username = (username or os.getenv("AUTH_DEFAULT_USERNAME", "admin") or "admin").strip() or "admin"
    return SimpleNamespace(id=user_id, username=resolved_username, is_active=True)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        AUTH_PASSWORD_HASH_ITERATIONS,
    )
    return f"pbkdf2_sha256${AUTH_PASSWORD_HASH_ITERATIONS}${salt}${_b64url_encode(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_raw, salt, expected_digest = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return hmac.compare_digest(_b64url_encode(digest), expected_digest)
    except Exception:
        return False


def create_access_token(user_id: int, username: str) -> tuple[str, int]:
    expires_in = AUTH_TOKEN_EXPIRE_MINUTES * 60
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": int(expires_at.timestamp()),
    }
    payload_segment = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    )
    signature_segment = _b64url_encode(
        hmac.new(
            AUTH_SECRET_KEY.encode("utf-8"),
            payload_segment.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    )
    return f"{payload_segment}.{signature_segment}", expires_in


def decode_access_token(token: str) -> dict:
    try:
        payload_segment, signature_segment = token.split(".", 1)
    except ValueError as e:
        raise ValueError("Invalid token format") from e

    expected_signature = _b64url_encode(
        hmac.new(
            AUTH_SECRET_KEY.encode("utf-8"),
            payload_segment.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    )
    if not hmac.compare_digest(expected_signature, signature_segment):
        raise ValueError("Invalid token signature")

    try:
        payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
    except Exception as e:
        raise ValueError("Invalid token payload") from e

    exp = payload.get("exp")
    if not isinstance(exp, int):
        raise ValueError("Invalid token expiration")
    if exp <= int(datetime.now(timezone.utc).timestamp()):
        raise ValueError("Token expired")
    return payload


def _raise_unauthorized(detail: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        _raise_unauthorized("缺少认证信息")

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub") or 1)
    except Exception:
        _raise_unauthorized("登录状态无效或已过期")

    if IS_MOCK_MODE:
        username = str(payload.get("username") or os.getenv("AUTH_DEFAULT_USERNAME", "admin"))
        return build_mock_user(username=username, user_id=user_id)

    user = db.get(User, user_id)
    if not user or not user.is_active:
        _raise_unauthorized("账号不可用")
    return user


def bootstrap_default_user(db: Session) -> None:
    if IS_MOCK_MODE:
        return

    existing_user = db.query(User).first()
    if existing_user:
        return

    username = (os.getenv("AUTH_DEFAULT_USERNAME", "admin") or "").strip()
    password = (os.getenv("AUTH_DEFAULT_PASSWORD", "admin123456") or "").strip()
    if not username or not password:
        return

    user = User(
        username=username,
        password_hash=hash_password(password),
        is_active=True,
    )
    db.add(user)
    db.commit()
