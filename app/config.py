"""Application configuration loaded from environment variables."""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # API
    api_v1_str: str = Field("/api/v1", alias="API_V1_STR")
    project_name: str = Field("User Management Service", alias="PROJECT_NAME")
    version: str = Field("0.1.0", alias="VERSION")

    # Database - PostgreSQL
    postgres_user: str = Field(..., alias="POSTGRES_USER")
    postgres_password: str = Field(..., alias="POSTGRES_PASSWORD")
    postgres_db: str = Field(..., alias="POSTGRES_DB")
    postgres_host: str = Field("localhost", alias="POSTGRES_HOST")
    postgres_port: int = Field(5432, alias="POSTGRES_PORT")

    # Database - MongoDB
    mongodb_url: str = Field(..., alias="MONGODB_URL")
    mongodb_db: str = Field("user_management_audit", alias="MONGODB_DB")

    # JWT
    secret_key: str = Field(..., alias="SECRET_KEY")
    algorithm: str = Field("HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    # CORS — JSON array from env (e.g. '["http://localhost:3000","http://localhost:8080"]')
    cors_origins: List[str] = Field([], alias="CORS_ORIGINS", json=True)

    # Initial Admin
    first_superuser_email: str = Field("admin@example.com", alias="FIRST_SUPERUSER_EMAIL")
    first_superuser_password: str = Field(..., alias="FIRST_SUPERUSER_PASSWORD")
    first_superuser_username: str = Field("admin", alias="FIRST_SUPERUSER_USERNAME")

    # Initial Guest
    guest_user_email: str = Field("guest@example.com", alias="GUEST_USER_EMAIL")
    guest_user_password: str = Field("guest123", alias="GUEST_USER_PASSWORD")
    guest_user_username: str = Field("guest", alias="GUEST_USER_USERNAME")

    @property
    def postgres_dsn(self) -> str:
        """Construct async PostgreSQL DSN."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
