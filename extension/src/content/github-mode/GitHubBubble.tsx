import React, { useState, useEffect } from 'react'
import { X, Star, Lock, Globe } from 'lucide-react'
import type { GitHubRepo, GitHubUser } from './GitHubModeManager'

interface GitHubBubbleProps {
  isVisible: boolean
  isAuthenticated: boolean
  user: GitHubUser | null
  repos: GitHubRepo[]
  onClose: () => void
  onAuthenticate: () => void
  onLogout: () => void
  onSelectRepo: (repo: GitHubRepo) => void
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
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        <div style={headerStyles}>
          <div style={titleStyles}>
            🐙 GitHub
          </div>
          <button
            onClick={onClose}
            style={closeButtonStyles}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
          >
            <X size={12} />
          </button>
        </div>
        
        <div style={contentStyles}>
          {!isAuthenticated ? (
            <button onClick={onAuthenticate} style={authButtonStyles}>
              Connect to GitHub
            </button>
          ) : (
            <>
              {user && (
                <div style={userInfoStyles}>
                  <img src={user.avatar_url} alt={user.name} style={avatarStyles} />
                  <div style={userNameStyles}>{user.name || user.login}</div>
                  <button onClick={onLogout} style={logoutButtonStyles}>
                    Logout
                  </button>
                </div>
              )}
              
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
                    onClick={() => onSelectRepo(repo)}
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
                              backgroundColor: '#3178c6' // Default language color
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