import json
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union


class Settings(BaseSettings):
    PROJECT_NAME: str = "UCU SideQuest API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/sidequest"
    )
    
    # JWT & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ucu-sidequest-dev-insecure-secret-key-change-in-prod-2026-minimum-32-chars")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Amazon Cognito / Google Federation
    AWS_REGION: str = os.getenv("AWS_REGION", "eu-central-1")
    COGNITO_USER_POOL_ID: str = os.getenv("COGNITO_USER_POOL_ID", "")
    COGNITO_CLIENT_ID: str = os.getenv("COGNITO_CLIENT_ID", "")
    COGNITO_DOMAIN: str = os.getenv("COGNITO_DOMAIN", "")
    COGNITO_JWKS_URL: str = os.getenv("COGNITO_JWKS_URL", "")
    GOOGLE_SIGNIN_ENABLED: bool = os.getenv("GOOGLE_SIGNIN_ENABLED", "false").lower() in ("true", "1", "yes")

    # CORS & Public Frontend Domain
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    CORS_ALLOW_ORIGIN_REGEX: str = os.getenv(
        "CORS_ALLOW_ORIGIN_REGEX",
        r"https://.*\.amplifyapp\.com"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, list):
            return [str(x).strip().rstrip("/") for x in v if str(x).strip()]
        if isinstance(v, str):
            raw = v.strip()
            if not raw:
                return ["http://localhost:3000", "http://127.0.0.1:3000"]
            if raw.startswith("["):
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return [str(x).strip().rstrip("/") for x in parsed if str(x).strip()]
                except Exception:
                    pass
            return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]
        return ["http://localhost:3000"]

    @property
    def effective_cors_origins(self) -> List[str]:
        origins = list(self.CORS_ORIGINS) if isinstance(self.CORS_ORIGINS, list) else [str(self.CORS_ORIGINS)]
        if self.FRONTEND_URL:
            cleaned = self.FRONTEND_URL.strip().rstrip("/")
            if cleaned and cleaned not in origins:
                origins.append(cleaned)
        return origins

    @property
    def cognito_issuer(self) -> str:
        if not self.COGNITO_USER_POOL_ID or not self.AWS_REGION:
            return ""
        return f"https://cognito-idp.{self.AWS_REGION}.amazonaws.com/{self.COGNITO_USER_POOL_ID}"

    @property
    def cognito_jwks_uri(self) -> str:
        if self.COGNITO_JWKS_URL:
            return self.COGNITO_JWKS_URL
        if not self.cognito_issuer:
            return ""
        return f"{self.cognito_issuer}/.well-known/jwks.json"

    @property
    def is_cognito_configured(self) -> bool:
        placeholders = {"", "eu-central-1_example", "exampleclientid123456", "your-user-pool-id", "your-app-client-id"}
        return (
            bool(self.COGNITO_USER_POOL_ID and self.COGNITO_USER_POOL_ID not in placeholders)
            and bool(self.COGNITO_CLIENT_ID and self.COGNITO_CLIENT_ID not in placeholders)
        )
    
    # Timezone
    APP_TIMEZONE: str = "Europe/Kyiv"

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()
