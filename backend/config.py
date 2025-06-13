import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import List

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # CORS settings
    ALLOWED_ORIGINS: List[str] = [
        "chrome-extension://*",
        "http://localhost:8000",
        "http://localhost:3000",
        "*"
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    CORS_EXPOSE_HEADERS: List[str] = []

    # GitHub OAuth settings
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "https://designx-705035175306.us-central1.run.app/api/github/callback"

    # Slack OAuth settings
    SLACK_CLIENT_ID: str = ""
    SLACK_CLIENT_SECRET: str = ""
    SLACK_REDIRECT_URI: str = "https://designx-705035175306.us-central1.run.app/api/slack/callback"

    # Jira OAuth settings
    JIRA_CLIENT_ID: str = ""
    JIRA_CLIENT_SECRET: str = ""
    JIRA_REDIRECT_URI: str = "https://designx-705035175306.us-central1.run.app/api/jira/callback"

    # SWE-agent settings
    OPENAI_API_KEY: str = ""
    GITHUB_TOKEN: str = ""

    # Modal settings
    MODAL_TOKEN_ID: str = ""
    MODAL_TOKEN_SECRET: str = ""

    # Supabase settings
    SUPABASE_URL: str = "https://nkqdhckrtbhrvjpdadmi.supabase.co"
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""  # Add this to .env for admin operations

    # JWT settings
    JWT_SECRET: str = "your_super_secure_jwt_secret_here"

    # Google OAuth settings
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "https://designx-705035175306.us-central1.run.app/api/google/callback"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields instead of raising validation errors

settings = Settings() 