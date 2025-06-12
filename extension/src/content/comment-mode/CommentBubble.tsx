import React, { useState, useRef, useEffect } from 'react'
import { Send, X, ChevronDown, Github } from 'lucide-react'
import type { SelectedElement } from './CommentModeManager'
import { gitHubModeManager, type GitHubRepo } from '../github-mode'

interface CommentBubbleProps {
  selectedElement: SelectedElement | null
  onClose: () => void
  onSubmit: (comment: string) => void
}

const CommentBubble: React.FC<CommentBubbleProps> = ({ 
  selectedElement, 
  onClose, 
  onSubmit 
}) => {
  const [comment, setComment] = useState('')
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [isCreatingIssue, setIsCreatingIssue] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load repositories when component mounts and when auth state changes
  useEffect(() => {
    // Initial load
    const initialRepos = gitHubModeManager.getRepositories()
    console.log('[CommentBubble] Initial mount. Authenticated:', gitHubModeManager.isUserAuthenticated(), 'Repos:', initialRepos)
    setRepos(initialRepos)

    // Set up auth state change listener
    const handleAuthStateChange = (isAuthenticated: boolean) => {
      console.log('[CommentBubble] Auth state changed. Authenticated:', isAuthenticated)
      if (isAuthenticated) {
        const repos = gitHubModeManager.getRepositories()
        console.log('[CommentBubble] Setting repos after auth:', repos)
        setRepos(repos)
      } else {
        console.log('[CommentBubble] Clearing repos after logout')
        setRepos([])
        setSelectedRepo(null)
      }
    }

    gitHubModeManager.onAuthStateChange(handleAuthStateChange)

    // Cleanup listener on unmount
    return () => {
      gitHubModeManager.onAuthStateChange(() => {})
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRepoDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus textarea when bubble opens
  useEffect(() => {
    if (selectedElement && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [selectedElement])

  // Clear comment when element changes
  useEffect(() => {
    console.log('[CommentBubble] selectedElement changed:', selectedElement)
    setComment('')
  }, [selectedElement])

  const handleSubmit = async () => {
    if (!comment.trim() || !selectedRepo) return

    setIsCreatingIssue(true)
    try {
      const title = `Feedback: ${getMinimalElementInfo(selectedElement!.elementInfo)}`
      const body = `${comment.trim()}\n\n---\n**Element Info:**\n\`${selectedElement!.elementInfo}\`\n\n**DOM Path:**\n\`${selectedElement!.domPath}\``
      console.log('[CommentBubble] Creating issue in repo:', selectedRepo.full_name, 'Title:', title)
      const issueUrl = await gitHubModeManager.createIssue(selectedRepo.full_name, title, body)
      console.log('[CommentBubble] Issue created. URL:', issueUrl)
      if (issueUrl) {
        onSubmit(comment.trim())
        setComment('')
        onClose()
        window.open(issueUrl, '_blank')
      }
    } finally {
      setIsCreatingIssue(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!selectedElement) return null

  // Extract just the tag name for minimal display
  const getMinimalElementInfo = (elementInfo: string): string => {
    const match = elementInfo.match(/^<([^>\s]+)/)
    return match ? `<${match[1]}>` : elementInfo.split(' ')[0] || elementInfo
  }

  const bubbleStyles = {
    position: 'fixed' as const,
    bottom: '72px',
    right: '20px',
    width: '360px',
    height: 'auto',
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
    pointerEvents: 'auto' as const
  }

  const headerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  }

  const elementTagStyles = {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: '2px 6px',
    borderRadius: '3px',
    fontWeight: '500'
  }

  const textareaStyles = {
    width: '100%',
    height: '35px',
    padding: '2px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    fontSize: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    resize: 'none' as const,
    outline: 'none',
    marginBottom: '6px'
  }

  const buttonContainerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px'
  }

  const repoSelectorStyles = {
    position: 'relative' as const,
    flex: 1
  }

  const repoButtonStyles = {
    width: '100%',
    padding: '4px 8px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '10px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: selectedRepo ? 'white' : 'rgba(255, 255, 255, 0.5)',
    transition: 'all 0.2s ease'
  }

  const dropdownStyles = {
    position: 'absolute' as const,
    bottom: '100%',
    left: '0',
    right: '0',
    marginBottom: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    maxHeight: '200px',
    overflowY: 'auto' as const,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
  }

  const repoItemStyles = {
    padding: '6px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    color: 'rgba(255, 255, 255, 0.9)'
  }

  const submitButtonStyles = {
    padding: '4px 12px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '10px',
    fontWeight: '500',
    cursor: comment.trim() && selectedRepo ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
    backgroundColor: comment.trim() && selectedRepo ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    opacity: comment.trim() && selectedRepo ? 1 : 0.5
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
          
          .comment-textarea::placeholder {
            color: rgba(255, 255, 255, 0.4);
          }

          .repo-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        <div style={headerStyles}>
          <div style={elementTagStyles}>
            {getMinimalElementInfo(selectedElement.elementInfo)}
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
        
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add comment..."
          style={textareaStyles}
          className="comment-textarea"
        />
        
        <div style={buttonContainerStyles}>
          <div style={repoSelectorStyles} ref={dropdownRef}>
            <button
              onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
              style={repoButtonStyles}
            >
              <Github size={12} />
              {selectedRepo ? selectedRepo.name : 'Select repository'}
              <ChevronDown size={12} />
            </button>

            {isRepoDropdownOpen && (
              <div style={dropdownStyles}>
                {repos.length === 0 ? (
                  <div style={{ ...repoItemStyles, cursor: 'default' }}>
                    No repositories available
                  </div>
                ) : (
                  repos.map((repo) => (
                    <div
                      key={repo.id}
                      className="repo-item"
                      style={repoItemStyles}
                      onClick={() => {
                        setSelectedRepo(repo)
                        setIsRepoDropdownOpen(false)
                      }}
                    >
                      {repo.full_name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!comment.trim() || !selectedRepo || isCreatingIssue}
            style={submitButtonStyles}
          >
            <Send size={12} />
            {isCreatingIssue ? 'Creating...' : 'Create Issue'}
          </button>
        </div>
      </div>
    </>
  )
}

export default CommentBubble 