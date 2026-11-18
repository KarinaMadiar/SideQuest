import ssl
from typing import AsyncGenerator, Tuple, Dict, Any
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


def normalize_async_db_url(raw_url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Normalizes a DATABASE_URL for SQLAlchemy AsyncEngine (`asyncpg` or `aiosqlite`).
    - Converts `postgres://` and `postgresql://` to `postgresql+asyncpg://`
    - Converts `sqlite://` to `sqlite+aiosqlite://`
    - Strips libpq-only query params like `sslmode` and `channel_binding` (used by Neon)
      from asyncpg URLs and translates `sslmode=require` into `connect_args={"ssl": ...}`.
    """
    url = raw_url.strip()
    connect_args: Dict[str, Any] = {}

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
        url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    if "sqlite" in url:
        connect_args["check_same_thread"] = False
        return url, connect_args

    if "postgresql+asyncpg" in url:
        parsed = urlparse(url)
        query_params = dict(parse_qsl(parsed.query, keep_blank_values=True))
        sslmode = query_params.pop("sslmode", None)
        query_params.pop("channel_binding", None)

        if sslmode and sslmode not in ("disable", "allow"):
            ssl_ctx = ssl.create_default_context()
            if sslmode in ("require", "prefer"):
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ssl_ctx

        new_query = urlencode(query_params)
        url = urlunparse(parsed._replace(query=new_query))

    return url, connect_args


db_url, db_connect_args = normalize_async_db_url(settings.DATABASE_URL)

engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    poolclass=pool.NullPool if "postgresql" in db_url else None,
    connect_args=db_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
