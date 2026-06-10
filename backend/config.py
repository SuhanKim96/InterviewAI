from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_url: str
    openai_api_key: str
    github_token: str = ""
    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json
                return json.loads(v)
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    model_config = {"env_file": ".env"}


settings = Settings()
