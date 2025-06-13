export interface SWEAgentJob {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress_logs: string[];
  error_message?: string;
  result?: any;
}

export interface SWEAgentJobRequest {
  repo_url: string;
  issue_url: string;
  github_token: string;
}

export interface SWEAgentJobResponse {
  job_id: string;
  status: string;
  message: string;
}

export class SWEAgentService {
  private readonly BACKEND_URL = 'https://designx-705035175306.us-central1.run.app';
  private activeJobs: Map<string, SWEAgentJob> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private jobStatusCallbacks: Map<string, (job: SWEAgentJob) => void> = new Map();

  /**
   * Start a new SWE-agent job
   */
  public async startJob(request: SWEAgentJobRequest): Promise<SWEAgentJobResponse> {
    console.log('🚀 Starting SWE-agent job for:', request.repo_url);
    
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/run-sweagent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Failed to start SWE-agent job: ${response.status}`);
      }

      const jobResponse: SWEAgentJobResponse = await response.json();
      console.log('✅ SWE-agent job started:', jobResponse.job_id);
      
      // Start monitoring this job
      this.monitorJob(jobResponse.job_id);
      
      return jobResponse;
    } catch (error) {
      console.error('❌ Error starting SWE-agent job:', error);
      throw error;
    }
  }

  /**
   * Get the current status of a job
   */
  public async getJobStatus(jobId: string): Promise<SWEAgentJob> {
    console.log('📊 Getting status for job:', jobId);
    
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get job status: ${response.status}`);
      }

      const job: SWEAgentJob = await response.json();
      this.activeJobs.set(jobId, job);
      
      return job;
    } catch (error) {
      console.error('❌ Error getting job status:', error);
      throw error;
    }
  }

  /**
   * List all jobs
   */
  public async listJobs(): Promise<{ jobs: any[] }> {
    console.log('📋 Listing all SWE-agent jobs');
    
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jobs`);
      
      if (!response.ok) {
        throw new Error(`Failed to list jobs: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error listing jobs:', error);
      throw error;
    }
  }

  /**
   * Cancel a running job
   */
  public async cancelJob(jobId: string): Promise<void> {
    console.log('🛑 Cancelling job:', jobId);
    
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel job: ${response.status}`);
      }

      console.log('✅ Job cancelled successfully');
      this.stopMonitoring(jobId);
    } catch (error) {
      console.error('❌ Error cancelling job:', error);
      throw error;
    }
  }

  /**
   * Monitor a job with real-time updates via WebSocket
   */
  public monitorJob(jobId: string, onUpdate?: (job: SWEAgentJob) => void): void {
    console.log('👀 Starting real-time monitoring for job:', jobId);
    
    // Store callback if provided
    if (onUpdate) {
      this.jobStatusCallbacks.set(jobId, onUpdate);
    }

    // Don't create duplicate connections
    if (this.websockets.has(jobId)) {
      console.log('⚠️ Already monitoring job:', jobId);
      return;
    }

    const wsUrl = `${this.BACKEND_URL.replace('https://', 'wss://')}/ws/jobs/${jobId}`;
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected for job:', jobId);
    };
    
    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        console.log('📨 Job update received:', update);
        
        if (update.error) {
          console.error('❌ WebSocket error:', update.error);
          return;
        }

        // Update local cache
        const job: SWEAgentJob = {
          job_id: update.job_id,
          status: update.status,
          created_at: update.created_at || new Date().toISOString(),
          started_at: update.started_at,
          completed_at: update.completed_at,
          progress_logs: update.logs || [],
          error_message: update.error_message,
          result: update.result
        };
        
        this.activeJobs.set(jobId, job);
        
        // Notify callback
        const callback = this.jobStatusCallbacks.get(jobId);
        if (callback) {
          callback(job);
        }
        
        // Close connection if job is completed
        if (job.status === 'completed' || job.status === 'failed') {
          console.log('🏁 Job finished, closing WebSocket connection');
          this.stopMonitoring(jobId);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error for job', jobId, ':', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket closed for job:', jobId);
      this.websockets.delete(jobId);
    };
    
    this.websockets.set(jobId, ws);
  }

  /**
   * Stop monitoring a job
   */
  public stopMonitoring(jobId: string): void {
    console.log('🛑 Stopping monitoring for job:', jobId);
    
    const ws = this.websockets.get(jobId);
    if (ws) {
      ws.close();
      this.websockets.delete(jobId);
    }
    
    this.jobStatusCallbacks.delete(jobId);
  }

  /**
   * Get cached job data
   */
  public getCachedJob(jobId: string): SWEAgentJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Check if a job is currently being monitored
   */
  public isMonitoring(jobId: string): boolean {
    return this.websockets.has(jobId);
  }

  /**
   * Get all active jobs
   */
  public getActiveJobs(): SWEAgentJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Clean up all connections and callbacks
   */
  public cleanup(): void {
    console.log('🧹 Cleaning up SWE-agent service');
    
    // Close all WebSocket connections
    for (const [jobId, ws] of this.websockets) {
      ws.close();
    }
    
    this.websockets.clear();
    this.jobStatusCallbacks.clear();
    this.activeJobs.clear();
  }

  /**
   * Poll for job status (fallback if WebSocket fails)
   */
  public async pollJobStatus(jobId: string, intervalMs: number = 5000): Promise<void> {
    console.log('🔄 Starting polling for job:', jobId, 'every', intervalMs, 'ms');
    
    const poll = async () => {
      try {
        const job = await this.getJobStatus(jobId);
        
        // Notify callback
        const callback = this.jobStatusCallbacks.get(jobId);
        if (callback) {
          callback(job);
        }
        
        // Continue polling if job is still running
        if (job.status === 'pending' || job.status === 'running') {
          setTimeout(poll, intervalMs);
        } else {
          console.log('🏁 Job finished, stopping polling');
        }
      } catch (error) {
        console.error('❌ Error polling job status:', error);
        // Continue polling on error
        setTimeout(poll, intervalMs);
      }
    };
    
    poll();
  }
}

// Create a singleton instance
export const sweAgentService = new SWEAgentService(); 