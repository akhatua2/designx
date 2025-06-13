import React, { useState, useEffect } from 'react';
import { sweAgentService, type SWEAgentJob } from './SWEAgentService';

interface SWEAgentJobStatusProps {
  jobId: string;
  onClose?: () => void;
  onJobComplete?: (job: SWEAgentJob) => void;
}

export const SWEAgentJobStatus: React.FC<SWEAgentJobStatusProps> = ({
  jobId,
  onClose,
  onJobComplete
}) => {
  const [job, setJob] = useState<SWEAgentJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadJob = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Try to get cached job first
        const cachedJob = sweAgentService.getCachedJob(jobId);
        if (cachedJob) {
          setJob(cachedJob);
          setIsLoading(false);
        }
        
        // Fetch latest status
        const latestJob = await sweAgentService.getJobStatus(jobId);
        if (mounted) {
          setJob(latestJob);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load job');
          setIsLoading(false);
        }
      }
    };

    const handleJobUpdate = (updatedJob: SWEAgentJob) => {
      if (mounted) {
        setJob(updatedJob);
        
        // Notify parent when job completes
        if ((updatedJob.status === 'completed' || updatedJob.status === 'failed') && onJobComplete) {
          onJobComplete(updatedJob);
        }
      }
    };

    // Start monitoring
    sweAgentService.monitorJob(jobId, handleJobUpdate);
    loadJob();

    return () => {
      mounted = false;
      sweAgentService.stopMonitoring(jobId);
    };
  }, [jobId, onJobComplete]);

  const handleCancel = async () => {
    try {
      await sweAgentService.cancelJob(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'running':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-700">Loading job status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-600">Error</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <p className="text-gray-600">Job not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          🤖 SWE-Agent Job
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Job ID */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">Job ID</p>
        <p className="font-mono text-xs text-gray-700 bg-gray-100 p-2 rounded">
          {job.job_id}
        </p>
      </div>

      {/* Status */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getStatusIcon(job.status)}</span>
          <span className={`font-semibold capitalize ${getStatusColor(job.status)}`}>
            {job.status}
          </span>
        </div>
        
        {job.status === 'running' && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="mb-4 text-sm text-gray-600">
        <p>Created: {new Date(job.created_at).toLocaleString()}</p>
        {job.started_at && (
          <p>Started: {new Date(job.started_at).toLocaleString()}</p>
        )}
        {job.completed_at && (
          <p>Completed: {new Date(job.completed_at).toLocaleString()}</p>
        )}
      </div>

      {/* Error Message */}
      {job.error_message && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-700">
            <strong>Error:</strong> {job.error_message}
          </p>
        </div>
      )}

      {/* Progress Logs */}
      {job.progress_logs && job.progress_logs.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Progress Logs</p>
          <div className="bg-gray-50 border rounded p-3 max-h-32 overflow-y-auto">
            {job.progress_logs.slice(-5).map((log, index) => (
              <p key={index} className="text-xs text-gray-600 font-mono mb-1">
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {job.result && job.status === 'completed' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-700">
            <strong>✅ Success!</strong> SWE-agent has completed the task and created a pull request.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        {(job.status === 'pending' || job.status === 'running') && (
          <button
            onClick={handleCancel}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
          >
            Cancel Job
          </button>
        )}
        
        {job.status === 'completed' && job.result && (
          <button
            onClick={() => {
              // Try to open the PR or repo URL
              const repoUrl = job.result.repo_url || '#';
              window.open(repoUrl, '_blank');
            }}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
          >
            View Result
          </button>
        )}
        
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}; 