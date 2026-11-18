import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


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
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    
    # Timezone
    APP_TIMEZONE: str = "Europe/Kyiv"

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()
