from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_url: str
    openai_api_key: str
    github_token: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
