import React, { useState, useEffect } from 'react'
import { X, Star, Lock, Globe, GitPullRequest, ArrowLeft, CircleDot, Bot } from 'lucide-react'
import type { GitHubUser, GitHubIssue, GitHubRepo } from './GitHubModeManager'
import type { Project } from '../IntegrationManager'
import { sweAgentService, type SWEAgentJob } from '../sweagent/SWEAgentService'

interface GitHubBubbleProps {
  isVisible: boolean
  isAuthenticated: boolean
  user: GitHubUser | null
  repos: Project[]
  onClose: () => void
  onAuthenticate: () => void
  onLogout: () => void
  onSelectRepo: (repo: Project) => Promise<GitHubIssue[]>
  onGetToken: () => Promise<string | null>
}

const GitHubBubble: React.FC<GitHubBubbleProps> = ({ 
  isVisible,
  isAuthenticated,
  user,
  repos,
  onClose,
  onAuthenticate,
  onLogout,
  onSelectRepo,
  onGetToken
}) => {
  const [selectedRepo, setSelectedRepo] = useState<Project | null>(null)
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false)
  const [activeJobs, setActiveJobs] = useState<Map<string, SWEAgentJob>>(new Map())

  // Type guard to check if a Project is a GitHubRepo
  const isGitHubRepo = (repo: Project): repo is GitHubRepo => {
    return 'private' in repo && 'language' in repo && 'stargazers_count' in repo
  }

  const handleRepoClick = async (repo: Project) => {
    setLoading(true)
    setSelectedRepo(repo)
    const fetchedIssues = await onSelectRepo(repo)
    setIssues(fetchedIssues)
    setLoading(false)
  }

  const handleBackClick = () => {
    setSelectedRepo(null)
    setIssues([])
  }

  const handleFixWithSWEAgent = async (issue: GitHubIssue) => {
    if (!selectedRepo) return
    
    try {
      const token = await onGetToken()
      if (!token) {
        alert('GitHub token not available. Please re-authenticate.')
        return
      }

      const repoUrl = `https://github.com/${selectedRepo.full_name || selectedRepo.name}`
      const issueUrl = issue.url

      console.log('🚀 Starting SWE-agent for:', { repoUrl, issueUrl })

      const jobResponse = await sweAgentService.startJob({
        repo_url: repoUrl,
        issue_url: issueUrl,
        github_token: token
      })

      console.log('✅ SWE-agent job started:', jobResponse.job_id)
      
      // Get the job details and add to active jobs
      const job = await sweAgentService.getJobStatus(jobResponse.job_id)
      setActiveJobs(prev => new Map(prev.set(issue.url, job)))
      
      // Set up monitoring for this specific job
      sweAgentService.monitorJob(jobResponse.job_id, (updatedJob) => {
        setActiveJobs(prev => new Map(prev.set(issue.url, updatedJob)))
      })

    } catch (error) {
      console.error('❌ Error starting SWE-agent:', error)
      alert(`Failed to start SWE-agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }



  if (!isVisible) return null

  const bubbleStyles = {
    position: 'fixed' as const,
    bottom: '72px',
    right: '20px',
    width: '360px',
    maxHeight: '400px',
    borderRadius: '24px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: 'white',
    padding: '10px',
    zIndex: 10000,
    animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    pointerEvents: 'auto' as const,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const
  }

  const headerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexShrink: 0
  }

  const titleStyles = {
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }

  const closeButtonStyles = {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
    transition: 'color 0.2s ease'
  }

  const contentStyles = {
    flex: 1,
    overflow: 'auto',
    maxHeight: '320px'
  }

  const userInfoStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    marginBottom: '8px'
  }

  const avatarStyles = {
    width: '24px',
    height: '24px',
    borderRadius: '50%'
  }

  const userNameStyles = {
    fontSize: '11px',
    fontWeight: '500',
    flex: 1
  }

  const logoutButtonStyles = {
    fontSize: '9px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer'
  }

  const authButtonStyles = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#238636',
    border: 'none',
    color: 'white',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  }

  const repoItemStyles = {
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    border: '1px solid transparent'
  }

  const repoNameStyles = {
    fontSize: '11px',
    fontWeight: '500',
    color: 'white',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }

  const repoDescStyles = {
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: '4px',
    lineHeight: '1.3'
  }

  const repoMetaStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.5)'
  }

  const languageStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  }

  const starsStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  }

  const prItemStyles = {
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    border: '1px solid transparent'
  }

  const prTitleStyles = {
    fontSize: '11px',
    fontWeight: '500' as const,
    color: 'white',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }

  const prMetaStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.5)'
  }

  return (
    <>
      <style>
        {`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .github-repo-item:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
          }

          .github-issue-item:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
          }
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        <div style={headerStyles}>
          <div style={titleStyles}>
            {isAuthenticated && user ? (
              <>
                <img 
                  src={user.avatar_url} 
                  alt={user.name || user.login} 
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    marginRight: '4px'
                  }} 
                />
                <span>{user.name || user.login}</span>
              </>
            ) : (
              <>🐙 GitHub</>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAuthenticated && (
              <button 
                onClick={onLogout} 
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            )}
            <button
              onClick={onClose}
              style={closeButtonStyles}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
            >
              <X size={12} />
            </button>
          </div>
        </div>
        
        <div style={contentStyles}>
          {!isAuthenticated ? (
            <button onClick={onAuthenticate} style={authButtonStyles}>
              Connect to GitHub
            </button>
          ) : selectedRepo ? (
            <>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                marginBottom: '12px',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer'
              }}
              onClick={handleBackClick}
              >
                <ArrowLeft size={12} />
                <span>Back to repositories</span>
              </div>

              <div style={{ 
                fontSize: '11px', 
                fontWeight: '600',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <CircleDot size={12} />
                Open Issues for {selectedRepo.name}
              </div>

              {loading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '10px' 
                }}>
                  Loading issues...
                </div>
              ) : issues.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '10px' 
                }}>
                  No open issues
                </div>
              ) : (
                issues.map((issue) => {
                  const activeJob = activeJobs.get(issue.url)
                  const isJobRunning = activeJob && (activeJob.status === 'pending' || activeJob.status === 'running')
                  
                  return (
                    <div
                      key={issue.number}
                      className="github-issue-item"
                      style={prItemStyles}
                    >
                      <div 
                        style={prTitleStyles}
                        onClick={() => window.open(issue.url, '_blank')}
                      >
                        #{issue.number} {issue.title}
                      </div>
                      <div style={prMetaStyles}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img 
                            src={issue.user.avatar_url} 
                            alt={issue.user.login}
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%'
                            }}
                          />
                          {issue.user.login}
                        </div>
                        <div>
                          {new Date(issue.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {/* SWE-agent Status - Inline */}
                      {activeJob ? (
                        <div style={{
                          marginTop: '6px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: activeJob.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' :
                                         activeJob.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' :
                                         'rgba(59, 130, 246, 0.1)',
                          border: `1px solid ${activeJob.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' :
                                              activeJob.status === 'failed' ? 'rgba(239, 68, 68, 0.2)' :
                                              'rgba(59, 130, 246, 0.2)'}`
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '4px'
                          }}>
                            <span style={{ fontSize: '12px' }}>
                              {activeJob.status === 'pending' ? '⏳' :
                               activeJob.status === 'running' ? '🔄' :
                               activeJob.status === 'completed' ? '✅' : '❌'}
                            </span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: '500',
                              color: activeJob.status === 'completed' ? '#059669' :
                                     activeJob.status === 'failed' ? '#dc2626' : '#2563eb'
                            }}>
                              SWE-agent {activeJob.status}
                            </span>
                          </div>
                          
                          {/* Progress bar for running jobs */}
                          {isJobRunning && (
                            <div style={{
                              width: '100%',
                              height: '2px',
                              backgroundColor: 'rgba(59, 130, 246, 0.2)',
                              borderRadius: '1px',
                              overflow: 'hidden',
                              marginBottom: '4px'
                            }}>
                              <div style={{
                                width: '60%',
                                height: '100%',
                                backgroundColor: '#3b82f6',
                                borderRadius: '1px',
                                animation: 'pulse 2s infinite'
                              }} />
                            </div>
                          )}
                          
                          {/* Latest log or result */}
                          {activeJob.progress_logs && activeJob.progress_logs.length > 0 && isJobRunning && (
                            <div style={{
                              fontSize: '8px',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontFamily: 'monospace',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {activeJob.progress_logs[activeJob.progress_logs.length - 1]}
                            </div>
                          )}
                          
                          {/* Success message */}
                          {activeJob.status === 'completed' && (
                            <div style={{
                              fontSize: '8px',
                              color: '#059669',
                              fontWeight: '500'
                            }}>
                              Pull request created! 🎉
                            </div>
                          )}
                          
                          {/* Error message */}
                          {activeJob.status === 'failed' && activeJob.error_message && (
                            <div style={{
                              fontSize: '8px',
                              color: '#dc2626',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {activeJob.error_message}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ 
                          marginTop: '6px', 
                          display: 'flex', 
                          gap: '4px',
                          alignItems: 'center'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFixWithSWEAgent(issue)
                            }}
                            style={{
                              fontSize: '9px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#7c3aed',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                          >
                            <Bot size={10} />
                            Fix with SWE-agent
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: '10px', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Your Repositories ({repos.length})
              </div>
              
              {repos.length === 0 ? (
                <div style={{ ...repoItemStyles, cursor: 'default' }}>
                  No repositories available
                </div>
              ) : (
                repos.map((repo) => {
                  const gitHubRepo = isGitHubRepo(repo) ? repo : null
                  return (
                    <div
                      key={repo.id}
                      className="github-repo-item"
                      style={repoItemStyles}
                      onClick={() => handleRepoClick(repo)}
                    >
                      <div style={repoNameStyles}>
                        {gitHubRepo?.private ? <Lock size={10} /> : <Globe size={10} />}
                        {repo.full_name || repo.name}
                      </div>
                      {repo.description && (
                        <div style={repoDescStyles}>
                          {repo.description.length > 80 
                            ? `${repo.description.substring(0, 80)}...` 
                            : repo.description
                          }
                        </div>
                      )}
                      <div style={repoMetaStyles}>
                        {gitHubRepo?.language && (
                          <div style={languageStyles}>
                            <div 
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#3178c6'
                              }}
                            />
                            {gitHubRepo.language}
                          </div>
                        )}
                        {gitHubRepo && (
                          <div style={starsStyles}>
                            <Star size={8} />
                            {gitHubRepo.stargazers_count}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>
      </div>
      

    </>
  )
}

export default GitHubBubble 