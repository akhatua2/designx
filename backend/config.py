import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    # GitHub OAuth configuration
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    
    # API configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # CORS origins - allow extension and localhost
    ALLOWED_ORIGINS: list[str] = [
        "chrome-extension://*",  # Chrome extensions
        "moz-extension://*",     # Firefox extensions
        "http://localhost:*",    # Local development
        "https://localhost:*",   # Local development (HTTPS)
        "*"                      # Temporarily allow all for debugging
    ]
    
    # CORS configuration
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["*"]
    CORS_ALLOW_HEADERS: list[str] = ["*"]
    CORS_EXPOSE_HEADERS: list[str] = ["*"]

settings = Settings() 