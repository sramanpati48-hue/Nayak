import json
from typing import List, Union
from pydantic import BeforeValidator, AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated

def parse_cors(v: str | List[str]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, str) and (v.startswith("[") and v.endswith("]")):
        try:
            return json.loads(v)
        except Exception:
            return [v]
    return v

class Settings(BaseSettings):
    PROJECT_NAME: str = "Nayak"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"
    
    # CORS setup (converts comma-separated or json string list into array)
    BACKEND_CORS_ORIGINS: Annotated[
        List[str], BeforeValidator(parse_cors)
    ] = ["http://localhost:3000"]
    
    # SQLite DB Configuration
    DATABASE_URL: str = "sqlite+aiosqlite:///./nayak.db"
    
    # LLM Provider API Keys
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    model_config = SettingsConfigDict(
        # Read from root or local api directory
        env_file=("../../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
