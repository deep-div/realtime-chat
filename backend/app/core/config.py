from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables or .env."""

    ENVIRONMENT: str
    LOG_LEVEL: str
    SERVER_ID: str

    REDIS_HOST: str
    REDIS_KEY: str
    REDIS_PORT: int

    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    STORAGE_URL: str
    STORAGE_KEY: str
    STORAGE_SERVICE_KEY: str
    STORAGE_AVATAR_BUCKET: str = "avatars"

    FIREBASE_CREDENTIALS_FILE: str
    DISABLE_AUTH: bool = False
    DEV_USER_ID: str = "dev_uid_tqwatcSdikMYybndtZAr"

    CORS_ORIGINS: list[str] = ["http://localhost:4000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()