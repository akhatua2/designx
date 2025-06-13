from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from config import settings
import os
import logging

# Import integration modules
from github_integration import (
    TokenRequest, TokenResponse,
    exchange_github_token, github_oauth_callback, 
    github_auth_success, get_github_user
)
from slack_integration import (
    SlackTokenRequest, SlackTokenResponse,
    exchange_slack_token, slack_oauth_callback, slack_auth_success
)
from jira_integration import (
    JiraTokenRequest, JiraTokenResponse,
    exchange_jira_token, jira_oauth_callback, jira_auth_success
)
from google_integration import (
    GoogleTokenRequest, GoogleTokenResponse,
    exchange_google_token, google_oauth_callback, google_auth_success, get_google_user
)
from sweagent_service import (
    RunSWEAgentRequest, JobResponse, JobStatusResponse,
    sweagent_service, websocket_job_status
)
from auth_service import get_current_user, get_current_user_optional

# Configure logging for Cloud Run
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DesignX Extension API",
    description="Backend API for DesignX browser extension",
    version="1.0.0"
)

# Enable CORS for your extension and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
    expose_headers=settings.CORS_EXPOSE_HEADERS,
)

@app.get("/favicon.ico")
async def favicon():
    """Return a simple favicon to prevent 404 errors"""
    # Simple 16x16 transparent PNG favicon as base64
    favicon_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06\x00\x00\x00\x1f\xf3\xffa\x00\x00\x00\x19tEXtSoftware\x00Adobe ImageReadyq\xc9e<\x00\x00\x00\x0eIDATx\xdab\x00\x02\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
    return Response(content=favicon_data, media_type="image/png")

@app.get("/")
async def root():
    return {"message": "DesignX Extension API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "designx-api"}

# =================== GitHub OAuth Routes ===================
@app.post("/api/github/exchange", response_model=TokenResponse)
async def github_token_exchange(request: TokenRequest):
    return await exchange_github_token(request)

@app.get("/api/github/callback", response_class=HTMLResponse)
async def github_callback(code: str = None, error: str = None):
    return await github_oauth_callback(code, error)

@app.get("/auth/github/success", response_class=HTMLResponse)
async def github_success(code: str = None, error: str = None):
    return await github_auth_success(code, error)

@app.get("/api/github/user")
async def github_user(authorization: str):
    return await get_github_user(authorization)

# =================== Slack OAuth Routes ===================
@app.post("/api/slack/exchange", response_model=SlackTokenResponse)
async def slack_token_exchange(request: SlackTokenRequest):
    return await exchange_slack_token(request)

@app.get("/api/slack/callback", response_class=HTMLResponse)
async def slack_callback(code: str = None, error: str = None):
    return await slack_oauth_callback(code, error)

@app.get("/auth/slack/success", response_class=HTMLResponse)
async def slack_success(code: str = None, error: str = None):
    return await slack_auth_success(code, error)

# =================== Jira OAuth Routes ===================
@app.post("/api/jira/exchange", response_model=JiraTokenResponse)
async def jira_token_exchange(request: JiraTokenRequest):
    return await exchange_jira_token(request)

@app.get("/api/jira/callback", response_class=HTMLResponse)
async def jira_callback(code: str = None, error: str = None):
    return await jira_oauth_callback(code, error)

@app.get("/auth/jira/success", response_class=HTMLResponse)
async def jira_success(code: str = None, error: str = None):
    return await jira_auth_success(code, error)

# =================== Google OAuth Routes ===================
@app.post("/api/google/exchange", response_model=GoogleTokenResponse)
async def google_token_exchange(request: GoogleTokenRequest):
    return await exchange_google_token(request)

@app.get("/api/google/callback", response_class=HTMLResponse)
async def google_callback(code: str = None, error: str = None):
    return await google_oauth_callback(code, error)

@app.get("/auth/google/success", response_class=HTMLResponse)
async def google_success(code: str = None, error: str = None):
    return await google_auth_success(code, error)

@app.get("/api/google/user")
async def google_user(authorization: str):
    return await get_google_user(authorization)

# =================== User Management Routes ===================
@app.get("/api/user/me")
async def get_current_user_info(current_user: dict = get_current_user):
    """Get current authenticated user information"""
    return current_user

@app.post("/api/user/logout")
async def logout_user(current_user: dict = get_current_user):
    """Logout current user"""
    # With JWT tokens, logout is handled client-side by removing the token
    return {"success": True, "message": "Logged out successfully"}

# =================== SWE-Agent Job Routes ===================
@app.post("/api/run-sweagent", response_model=JobResponse)
async def run_sweagent(request: RunSWEAgentRequest):
    """Start a SWE-agent job and return a job ID for tracking"""
    return sweagent_service.create_job(request)

@app.get("/api/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get the status of a specific SWE-agent job"""
    return sweagent_service.get_job_status(job_id)

@app.get("/api/jobs")
async def list_jobs():
    """List all SWE-agent jobs"""
    return sweagent_service.list_jobs()

@app.delete("/api/jobs/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a running SWE-agent job"""
    return sweagent_service.cancel_job(job_id)

@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_updates(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time job status updates"""
    await websocket_job_status(websocket, job_id)

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable for Cloud Run
    port = int(os.getenv("PORT", "8000"))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Required for Cloud Run
        port=port,
        log_level="info",
        proxy_headers=True,  # Required for Cloud Run HTTPS
        forwarded_allow_ips="*"  # Required for Cloud Run
    ) 