import React, { useState, useEffect } from 'react'
import { X, Star, Lock, Globe, GitPullRequest, ArrowLeft } from 'lucide-react'
import type { GitHubRepo, GitHubUser, GitHubPR } from './GitHubModeManager'

interface GitHubBubbleProps {
  isVisible: boolean
  isAuthenticated: boolean
  user: GitHubUser | null
  repos: GitHubRepo[]
  onClose: () => void
  onAuthenticate: () => void
  onLogout: () => void
  onSelectRepo: (repo: GitHubRepo) => Promise<GitHubPR[]>
}

const GitHubBubble: React.FC<GitHubBubbleProps> = ({ 
  isVisible,
  isAuthenticated,
  user,
  repos,
  onClose,
  onAuthenticate,
  onLogout,
  onSelectRepo
}) => {
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [pullRequests, setPullRequests] = useState<GitHubPR[]>([])
  const [loading, setLoading] = useState(false)

  const handleRepoClick = async (repo: GitHubRepo) => {
    setLoading(true)
    setSelectedRepo(repo)
    const prs = await onSelectRepo(repo)
    setPullRequests(prs)
    setLoading(false)
  }

  const handleBackClick = () => {
    setSelectedRepo(null)
    setPullRequests([])
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

          .github-pr-item:hover {
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
                <GitPullRequest size={12} />
                Pull Requests for {selectedRepo.name}
              </div>

              {loading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '10px' 
                }}>
                  Loading pull requests...
                </div>
              ) : pullRequests.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '10px' 
                }}>
                  No open pull requests
                </div>
              ) : (
                pullRequests.map((pr) => (
                  <div
                    key={pr.number}
                    className="github-pr-item"
                    style={prItemStyles}
                    onClick={() => window.open(pr.html_url, '_blank')}
                  >
                    <div style={prTitleStyles}>
                      #{pr.number} {pr.title}
                    </div>
                    <div style={prMetaStyles}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <img 
                          src={pr.user.avatar_url} 
                          alt={pr.user.login}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%'
                          }}
                        />
                        {pr.user.login}
                      </div>
                      <div>
                        {new Date(pr.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: '10px', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Your Repositories ({repos.length})
              </div>
              
              {repos.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '10px' 
                }}>
                  No repositories found
                </div>
              ) : (
                repos.map((repo) => (
                  <div
                    key={repo.id}
                    className="github-repo-item"
                    style={repoItemStyles}
                    onClick={() => handleRepoClick(repo)}
                  >
                    <div style={repoNameStyles}>
                      {repo.private ? <Lock size={10} /> : <Globe size={10} />}
                      {repo.name}
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
                      {repo.language && (
                        <div style={languageStyles}>
                          <div 
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#3178c6'
                            }}
                          />
                          {repo.language}
                        </div>
                      )}
                      <div style={starsStyles}>
                        <Star size={8} />
                        {repo.stargazers_count}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default GitHubBubble 