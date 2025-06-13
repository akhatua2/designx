import os
import uuid
import threading
import time
import subprocess
import signal
from datetime import datetime
from enum import Enum
from typing import Dict, Optional
from pathlib import Path

from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import asyncio

from config import settings
from utils.log import get_logger

logger = get_logger("sweagent-service")

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"

class SWEAgentJob(BaseModel):
    id: str
    repo_url: str
    issue_url: str
    status: JobStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    pid: Optional[int] = None
    error_message: Optional[str] = None
    logs: list[str] = []
    result: Optional[dict] = None

class RunSWEAgentRequest(BaseModel):
    repo_url: str
    issue_url: str
    github_token: str

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str

class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress_logs: list[str] = []
    error_message: Optional[str] = None
    result: Optional[dict] = None

# Global job storage (in production, use Redis/database)
jobs: Dict[str, SWEAgentJob] = {}

# WebSocket connections for real-time updates
active_connections: Dict[str, list[WebSocket]] = {}

class SWEAgentService:
    def __init__(self):
        self.logger = get_logger("sweagent-service")
    
    def create_job(self, request: RunSWEAgentRequest) -> JobResponse:
        """Create a new SWE-agent job"""
        job_id = str(uuid.uuid4())
        
        job = SWEAgentJob(
            id=job_id,
            repo_url=request.repo_url,
            issue_url=request.issue_url,
            status=JobStatus.PENDING,
            created_at=datetime.now()
        )
        
        jobs[job_id] = job
        self.logger.info(f"🚀 Created SWE-agent job {job_id} for {request.repo_url}")
        
        # Start background execution
        thread = threading.Thread(
            target=self._run_sweagent_background, 
            args=(job_id, request), 
            daemon=True
        )
        thread.start()
        
        return JobResponse(
            job_id=job_id,
            status=JobStatus.PENDING,
            message=f"SWE-agent job {job_id} started"
        )
    
    def get_job_status(self, job_id: str) -> JobStatusResponse:
        """Get the status of a specific job"""
        if job_id not in jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job = jobs[job_id]
        return JobStatusResponse(
            job_id=job.id,
            status=job.status,
            created_at=job.created_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            progress_logs=job.logs,
            error_message=job.error_message,
            result=job.result
        )
    
    def list_jobs(self) -> dict:
        """List all jobs"""
        job_summaries = []
        for job in jobs.values():
            job_summaries.append({
                "job_id": job.id,
                "repo_url": job.repo_url,
                "issue_url": job.issue_url,
                "status": job.status,
                "created_at": job.created_at,
                "started_at": job.started_at,
                "completed_at": job.completed_at,
                "pid": job.pid
            })
        
        job_summaries.sort(key=lambda x: x["created_at"], reverse=True)
        return {"jobs": job_summaries}
    
    def cancel_job(self, job_id: str) -> dict:
        """Cancel a running job"""
        if job_id not in jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job = jobs[job_id]
        
        if job.status not in [JobStatus.PENDING, JobStatus.RUNNING]:
            raise HTTPException(status_code=400, detail="Job is not running")
        
        try:
            if job.pid:
                os.kill(job.pid, signal.SIGTERM)
                job.logs.append("🛑 Job cancelled by user")
            
            job.status = JobStatus.FAILED
            job.completed_at = datetime.now()
            job.error_message = "Job cancelled by user"
            
            return {"message": f"Job {job_id} cancelled"}
        except Exception as e:
            self.logger.error(f"Error cancelling job {job_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to cancel job: {str(e)}")
    
    def _run_sweagent_background(self, job_id: str, request: RunSWEAgentRequest):
        """Background thread to run SWE-agent"""
        try:
            # Update job status
            jobs[job_id].status = JobStatus.RUNNING
            jobs[job_id].started_at = datetime.now()
            jobs[job_id].logs.append("🚀 Starting SWE-agent...")
            
            # Set environment variables
            env = os.environ.copy()
            env["GITHUB_TOKEN"] = request.github_token
            
            # Add API keys
            if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
                env["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
                jobs[job_id].logs.append(f"🔑 OpenAI API key configured")
            else:
                jobs[job_id].logs.append("⚠️ No OpenAI API key found")
            
            if hasattr(settings, 'MODAL_TOKEN_ID') and settings.MODAL_TOKEN_ID:
                env["MODAL_TOKEN_ID"] = settings.MODAL_TOKEN_ID
                jobs[job_id].logs.append(f"🔑 Modal credentials configured")
            else:
                jobs[job_id].logs.append("⚠️ No Modal credentials found")
                
            if hasattr(settings, 'MODAL_TOKEN_SECRET') and settings.MODAL_TOKEN_SECRET:
                env["MODAL_TOKEN_SECRET"] = settings.MODAL_TOKEN_SECRET
            
            # Find SWE-agent path
            possible_paths = [
                '/app/SWE-agent',
                'SWE-agent',
                'backend/SWE-agent',
                os.path.join(os.path.dirname(__file__), 'SWE-agent')
            ]
            
            swe_agent_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    swe_agent_path = path
                    break
            
            if not swe_agent_path:
                raise Exception(f"SWE-agent directory not found. Tried: {possible_paths}")
            
            jobs[job_id].logs.append(f"📂 Using SWE-agent path: {swe_agent_path}")
            
            # Build command
            cmd = [
                "sweagent", "run",
                "--agent.model.name=gpt-4.1", 
                "--config", "config/default.yaml",
                "--agent.model.per_instance_cost_limit=1.00",
                f"--env.repo.github_url={request.repo_url}",
                f"--problem_statement.github_url={request.issue_url}",
                "--env.deployment.type=modal"
            ]
            
            jobs[job_id].logs.append(f"🤖 Command: {' '.join(cmd)}")
            
            # Run process
            process = subprocess.Popen(
                cmd,
                cwd=swe_agent_path,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            jobs[job_id].pid = process.pid
            jobs[job_id].logs.append(f"🔄 Process started with PID: {process.pid}")
            
            # Stream output
            while True:
                line = process.stdout.readline()
                if not line:
                    if process.poll() is not None:
                        break
                    time.sleep(0.1)
                    continue
                
                line = line.strip()
                if line:
                    # Add to job logs (keep last 100 lines)
                    jobs[job_id].logs.append(f"🤖 {line}")
                    if len(jobs[job_id].logs) > 100:
                        jobs[job_id].logs = jobs[job_id].logs[-100:]
                    
                    # Log to Cloud Run
                    self.logger.info(f"Job {job_id}: {line}")
            
            # Process completed
            return_code = process.wait()
            jobs[job_id].completed_at = datetime.now()
            
            if return_code == 0:
                jobs[job_id].status = JobStatus.COMPLETED
                jobs[job_id].logs.append("✅ SWE-agent completed successfully")
                jobs[job_id].result = {"success": True, "return_code": return_code}
                self.logger.info(f"✅ Job {job_id} completed successfully")
            else:
                jobs[job_id].status = JobStatus.FAILED
                jobs[job_id].error_message = f"Process failed with exit code {return_code}"
                jobs[job_id].logs.append(f"❌ SWE-agent failed (exit code: {return_code})")
                self.logger.error(f"❌ Job {job_id} failed with exit code {return_code}")
                
        except Exception as e:
            jobs[job_id].status = JobStatus.FAILED
            jobs[job_id].completed_at = datetime.now()
            jobs[job_id].error_message = str(e)
            jobs[job_id].logs.append(f"❌ Error: {str(e)}")
            self.logger.error(f"❌ Job {job_id} failed with error: {str(e)}")

# Global service instance
sweagent_service = SWEAgentService()

async def websocket_job_status(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time job status updates"""
    await websocket.accept()
    
    if job_id not in jobs:
        await websocket.send_json({"error": "Job not found"})
        await websocket.close()
        return
    
    # Add connection to active connections
    if job_id not in active_connections:
        active_connections[job_id] = []
    active_connections[job_id].append(websocket)
    
    try:
        # Send initial status
        job = jobs[job_id]
        await websocket.send_json({
            "job_id": job.id,
            "status": job.status,
            "logs": job.logs,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        })
        
        # Keep connection alive and send updates
        while True:
            await asyncio.sleep(2)  # Poll every 2 seconds
            
            if job_id in jobs:
                job = jobs[job_id]
                await websocket.send_json({
                    "job_id": job.id,
                    "status": job.status,
                    "logs": job.logs[-10:],  # Send last 10 log lines
                    "completed_at": job.completed_at.isoformat() if job.completed_at else None
                })
                
                # Close connection if job is completed
                if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                    break
    
    except WebSocketDisconnect:
        pass
    finally:
        # Remove connection
        if job_id in active_connections:
            try:
                active_connections[job_id].remove(websocket)
                if not active_connections[job_id]:
                    del active_connections[job_id]
            except ValueError:
                pass 