from fastapi import FastAPI, HTTPException, WebSocket, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from config import settings
import os
import logging
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

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
from screenshot_service import upload_screenshot_endpoint, delete_screenshot_endpoint
from recording_service import upload_recording_endpoint, delete_recording_endpoint

# Task models
class CreateTaskRequest(BaseModel):
    comment_text: str
    platform: str  # 'github', 'slack', 'jira'
    priority: Optional[str] = 'medium'
    element_info: Optional[str] = None
    dom_path: Optional[str] = None
    page_url: Optional[str] = None
    external_id: Optional[str] = None
    external_url: Optional[str] = None
    metadata: Optional[dict] = {}
    screenshot_urls: Optional[List[str]] = []  # URLs of screenshots to associate

class UpdateTaskRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    external_id: Optional[str] = None
    external_url: Optional[str] = None

class ScreenshotResponse(BaseModel):
    id: str
    filename: str
    upload_url: str
    file_size: Optional[int]
    content_type: str
    created_at: datetime

class RecordingResponse(BaseModel):
    id: str
    filename: str
    upload_url: str
    file_size: Optional[int]
    content_type: str
    duration: Optional[int]  # in milliseconds
    quality: str
    created_at: datetime

class TaskResponse(BaseModel):
    id: str
    comment_text: str
    platform: str
    status: str
    priority: str
    element_info: Optional[str]
    dom_path: Optional[str]
    page_url: Optional[str]
    external_id: Optional[str]
    external_url: Optional[str]
    metadata: dict
    screenshots: Optional[List[ScreenshotResponse]] = []
    recordings: Optional[List[RecordingResponse]] = []
    created_at: datetime
    updated_at: datetime

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
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user

@app.post("/api/user/logout")
async def logout_user(current_user: dict = Depends(get_current_user)):
    """Logout current user"""
    # With JWT tokens, logout is handled client-side by removing the token
    return {"success": True, "message": "Logged out successfully"}

# =================== Screenshot Upload Routes ===================
@app.post("/api/upload/screenshot")
async def upload_screenshot(image: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a screenshot image"""
    return await upload_screenshot_endpoint(image, current_user)

@app.delete("/api/upload/screenshot/{filename:path}")
async def delete_screenshot(filename: str, current_user: dict = Depends(get_current_user)):
    """Delete a screenshot image"""
    return await delete_screenshot_endpoint(filename, current_user)

# =================== Recording Upload Routes ===================
@app.post("/api/upload/recording")
async def upload_recording(video: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a recording video"""
    return await upload_recording_endpoint(video, current_user)

@app.delete("/api/upload/recording/{filename:path}")
async def delete_recording(filename: str, current_user: dict = Depends(get_current_user)):
    """Delete a recording video"""
    return await delete_recording_endpoint(filename, current_user)

@app.post("/api/tasks/{task_id}/screenshots", response_model=ScreenshotResponse)
async def upload_task_screenshot(task_id: str, image: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a screenshot for a specific task"""
    from screenshot_service import create_screenshot_for_task_endpoint
    
    # Use the new service method that directly creates screenshots with task association
    result = await create_screenshot_for_task_endpoint(image, task_id, current_user)
    return ScreenshotResponse(**result)

@app.post("/api/tasks/{task_id}/recordings", response_model=RecordingResponse)
async def upload_task_recording(task_id: str, video: UploadFile = File(...), duration: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Upload a recording for a specific task"""
    from recording_service import create_recording_for_task_endpoint
    
    # Use the new service method that directly creates recordings with task association
    result = await create_recording_for_task_endpoint(task_id, video, duration, current_user)
    return RecordingResponse(**result)

@app.get("/api/tasks/{task_id}/screenshots", response_model=List[ScreenshotResponse])
async def get_task_screenshots(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get all screenshots for a specific task"""
    from config import get_supabase_client
    
    supabase = get_supabase_client()
    
    # Verify task belongs to current user
    task_result = supabase.table("tasks").select("id").eq("id", task_id).eq("user_id", current_user["id"]).execute()
    if not task_result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        result = supabase.table("screenshots").select("*").eq("tasks_id", task_id).execute()
        if result.data:
            return [ScreenshotResponse(**screenshot) for screenshot in result.data]
        else:
            return []
    except Exception as e:
        logger.error(f"Error fetching task screenshots: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/tasks/{task_id}/recordings", response_model=List[RecordingResponse])
async def get_task_recordings(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get all recordings for a specific task"""
    from config import get_supabase_client
    
    supabase = get_supabase_client()
    
    # Verify task belongs to current user
    task_result = supabase.table("tasks").select("id").eq("id", task_id).eq("user_id", current_user["id"]).execute()
    if not task_result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        result = supabase.table("recordings").select("*").eq("tasks_id", task_id).execute()
        if result.data:
            return [RecordingResponse(**recording) for recording in result.data]
        else:
            return []
    except Exception as e:
        logger.error(f"Error fetching task recordings: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# =================== Task Management Routes ===================
@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(request: CreateTaskRequest, current_user: dict = Depends(get_current_user)):
    """Create a new task/comment"""
    from config import get_supabase_client
    
    supabase = get_supabase_client()
    
    # Insert task into database
    task_data = {
        "user_id": current_user["id"],
        "comment_text": request.comment_text,
        "platform": request.platform,
        "priority": request.priority,
        "element_info": request.element_info,
        "dom_path": request.dom_path,
        "page_url": request.page_url,
        "external_id": request.external_id,
        "external_url": request.external_url,
        "metadata": request.metadata or {}
    }
    
    try:
        result = supabase.table("tasks").insert(task_data).execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create task")
        
        created_task = result.data[0]
        task_id = created_task["id"]
        
        # Associate screenshots with the task if provided
        if request.screenshot_urls:
            try:
                for screenshot_url in request.screenshot_urls:
                    # Find screenshots by upload_url and update with tasks_id
                    supabase.table("screenshots").update({"tasks_id": task_id}).eq("upload_url", screenshot_url).eq("user_id", current_user["id"]).execute()
            except Exception as e:
                logger.warning(f"Error associating screenshots with task {task_id}: {str(e)}")
        
        # Fetch the complete task with screenshots
        complete_task = supabase.table("tasks").select("*").eq("id", task_id).execute()
        screenshots_result = supabase.table("screenshots").select("*").eq("tasks_id", task_id).execute()
        
        task_data = complete_task.data[0]
        task_data["screenshots"] = [ScreenshotResponse(**screenshot) for screenshot in screenshots_result.data] if screenshots_result.data else []
        
        return TaskResponse(**task_data)
    except Exception as e:
        logger.error(f"Error creating task: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/tasks", response_model=List[TaskResponse])
async def get_user_tasks(current_user: dict = Depends(get_current_user)):
    """Get all tasks for the current user"""
    from config import get_supabase_client
    
    supabase = get_supabase_client()
    
    try:
        # Get tasks
        tasks_result = supabase.table("tasks").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).execute()
        
        if not tasks_result.data:
            return []
        
        # Get screenshots and recordings for all tasks
        task_ids = [task["id"] for task in tasks_result.data]
        screenshots_result = supabase.table("screenshots").select("*").in_("tasks_id", task_ids).execute()
        recordings_result = supabase.table("recordings").select("*").in_("tasks_id", task_ids).execute()
        
        # Group screenshots by tasks_id
        screenshots_by_task = {}
        if screenshots_result.data:
            for screenshot in screenshots_result.data:
                task_id = screenshot["tasks_id"]
                if task_id not in screenshots_by_task:
                    screenshots_by_task[task_id] = []
                screenshots_by_task[task_id].append(ScreenshotResponse(**screenshot))
        
        # Group recordings by tasks_id
        recordings_by_task = {}
        if recordings_result.data:
            for recording in recordings_result.data:
                task_id = recording["tasks_id"]
                if task_id not in recordings_by_task:
                    recordings_by_task[task_id] = []
                recordings_by_task[task_id].append(RecordingResponse(**recording))
        
        # Build response with screenshots and recordings
        tasks_with_media = []
        for task in tasks_result.data:
            task_data = task.copy()
            task_data["screenshots"] = screenshots_by_task.get(task["id"], [])
            task_data["recordings"] = recordings_by_task.get(task["id"], [])
            tasks_with_media.append(TaskResponse(**task_data))
        
        return tasks_with_media
    except Exception as e:
        logger.error(f"Error fetching tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, request: UpdateTaskRequest, current_user: dict = Depends(get_current_user)):
    """Update a task's status or other fields"""
    from config import get_supabase_client
    
    supabase = get_supabase_client()
    
    # Prepare update data
    update_data = {}
    if request.status is not None:
        update_data["status"] = request.status
    if request.priority is not None:
        update_data["priority"] = request.priority
    if request.external_id is not None:
        update_data["external_id"] = request.external_id
    if request.external_url is not None:
        update_data["external_url"] = request.external_url
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    try:
        # Verify task belongs to current user and update
        result = supabase.table("tasks").update(update_data).eq("id", task_id).eq("user_id", current_user["id"]).execute()
        if result.data:
            return TaskResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="Task not found")
    except Exception as e:
        logger.error(f"Error updating task: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    from config import get_supabase_client
    
    supabase = get_supabase_client()
    
    try:
        # Verify task belongs to current user and delete
        result = supabase.table("tasks").delete().eq("id", task_id).eq("user_id", current_user["id"]).execute()
        if result.data:
            return {"success": True, "message": "Task deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Task not found")
    except Exception as e:
        logger.error(f"Error deleting task: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

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