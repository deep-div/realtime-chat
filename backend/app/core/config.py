from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables or .env."""

    ENVIRONMENT: str
    LOG_LEVEL: str
    SERVER_ID: str

    REDIS_HOST: str
    REDIS_KEY: str
    REDIS_PORT: int

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()