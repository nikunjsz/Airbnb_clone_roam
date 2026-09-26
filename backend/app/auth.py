"""Cookie-session authentication and demo identity switching."""

from datetime import timedelta
import hashlib
import hmac
import os
import re
import secrets

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import DemoSession, User, utc_now


SESSION_COOKIE = "roam_session"
SESSION_DAYS = 14
PBKDF2_ITERATIONS = 600_000
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

router = APIRouter(prefix="/api/v1", tags=["identity"])


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    avatar_url: str
    bio: str
    can_host: bool


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class DemoSessionRequest(BaseModel):
    user_id: int


def hash_password(password: str) -> str:
    """Hash passwords with a unique salt; raw passwords are never persisted."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        algorithm, iterations, salt_hex, expected_hex = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(actual.hex(), expected_hex)
    except (ValueError, TypeError):
        return False


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def set_session_cookie(response: Response, db: Session, user: User) -> None:
    raw_token = secrets.token_urlsafe(32)
    db.add(
        DemoSession(
            token_hash=token_digest(raw_token),
            user_id=user.id,
            expires_at=utc_now() + timedelta(days=SESSION_DAYS),
        )
    )
    db.commit()
    response.set_cookie(
        SESSION_COOKIE,
        raw_token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=os.getenv("APP_ENV") == "production",
        samesite="lax",
        path="/",
    )


def get_current_user(
    session_token: str | None = Cookie(None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> User | None:
    if not session_token:
        return None
    session = db.scalar(
        select(DemoSession).where(
            DemoSession.token_hash == token_digest(session_token),
            DemoSession.expires_at > utc_now(),
        )
    )
    return db.get(User, session.user_id) if session else None


def require_user(user: User | None = Depends(get_current_user)) -> User:
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Sign in required")
    return user


@router.get("/demo/users", response_model=list[UserOut])
def demo_users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).where(User.email.like("%@roam.demo")).order_by(User.id)))


@router.post("/demo/session", response_model=UserOut)
def choose_demo_user(payload: DemoSessionRequest, response: Response, db: Session = Depends(get_db)) -> User:
    user = db.get(User, payload.user_id)
    if user is None or not user.email.endswith("@roam.demo"):
        raise HTTPException(404, detail="Demo user not found")
    set_session_cookie(response, db, user)
    return user


@router.post("/auth/register", response_model=UserOut, status_code=201)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(422, detail="Enter a valid email address")
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(409, detail="An account with this email already exists")
    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        avatar_url=f"https://ui-avatars.com/api/?name={payload.name.strip().replace(' ', '+')}",
        bio="",
        can_host=True,
    )
    db.add(user)
    db.flush()
    set_session_cookie(response, db, user)
    return user


@router.post("/auth/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, detail="Incorrect email or password")
    set_session_cookie(response, db, user)
    return user


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(require_user)) -> User:
    return user


@router.post("/auth/logout", status_code=204)
def logout(
    response: Response,
    session_token: str | None = Cookie(None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> None:
    if session_token:
        session = db.scalar(select(DemoSession).where(DemoSession.token_hash == token_digest(session_token)))
        if session:
            db.delete(session)
            db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
