from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    UPLOAD_DIR: str = "uploads"
    PROCESSED_DIR: str = "processed"
    MUSIC_UPLOAD_DIR: str = "bg_music"
    ALLOWED_EXTENSIONS: list = ["mp4", "mov", "avi"]
    CORS_ORIGINS: list = ["*"]
    WHISPER_MODEL: str = "base"
    DEFAULT_DUP_THRESH: float = 0.85
    DEFAULT_FONT_SIZE: int = 28
    API_KEY: str = "sk-ADD YOUR KEY"
    BASE_URL: str = "https://api.deepseek.com"
    MODEL_NAME: str = "deepseek-chat"
    
    class Config:
        env_file = ".env"

# settings = Settings()