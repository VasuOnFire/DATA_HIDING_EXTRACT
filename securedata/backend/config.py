from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SECUREDATA"
    DEBUG: bool = False
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-min-32-characters-long"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OTP_EXPIRE_MINUTES: int = 2
    
    # Database - Using SQLite for local development
    DATABASE_URL: str = "sqlite:///./securedata.db"
    
    # Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    
    # Encryption
    RSA_KEY_SIZE: int = 2048
    AES_KEY_SIZE: int = 256
    PBKDF2_ITERATIONS: int = 100000
    
    # CORS - comma-separated string parsed to list
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # Email SMTP Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""  # Your Gmail address
    SMTP_PASSWORD: str = ""  # Your Gmail app password
    FROM_EMAIL: str = ""  # Sender email (defaults to SMTP_USER if empty)
    
    class Config:
        env_file = ".env"
        
    def get_allowed_origins(self) -> List[str]:
        """Parse comma-separated origins into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
