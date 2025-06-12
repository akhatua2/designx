import React, { useState, useRef, useEffect } from 'react'
import { Send, X, ChevronDown, Github, Slack } from 'lucide-react'
import type { SelectedElement } from './CommentModeManager'
import { gitHubModeManager } from '../integrations/github'
import { slackModeManager } from '../integrations/slack'
import { jiraModeManager } from '../integrations/jira'
import type { Project } from '../integrations/IntegrationManager'
import type { GitHubRepo } from '../integrations/github/GitHubModeManager'
import type { SlackChannel } from '../integrations/slack/SlackModeManager'
import type { JiraProject } from '../integrations/jira/JiraModeManager'

interface CommentBubbleProps {
  selectedElement: SelectedElement | null
  onClose: () => void
  onSubmit: (comment: string) => void
}

type Platform = 'github' | 'slack' | 'jira'

// Type guard for GitHub repos
function isGitHubRepo(project: Project): project is GitHubRepo {
  return 'full_name' in project
}

// Type guard for Slack channels
function isSlackChannel(project: Project): project is SlackChannel {
  return 'is_channel' in project
}

// Type guard for Jira projects
function isJiraProject(project: Project): project is JiraProject {
  return 'key' in project && 'projectTypeKey' in project
}

const CommentBubble: React.FC<CommentBubbleProps> = ({ 
  selectedElement, 
  onClose, 
  onSubmit 
}) => {
  const [comment, setComment] = useState('')
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Project | null>(null)
  const [channels, setChannels] = useState<Project[]>([])
  const [isCreatingMessage, setIsCreatingMessage] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('github')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load channels when component mounts and when auth state changes
  useEffect(() => {
    const loadChannels = () => {
      const isGitHubAuth = gitHubModeManager.isUserAuthenticated()
      const isSlackAuth = slackModeManager.isUserAuthenticated()
      const isJiraAuth = jiraModeManager.isUserAuthenticated()
      
      if (selectedPlatform === 'github' && isGitHubAuth) {
        const repos = gitHubModeManager.getProjects()
        setChannels(repos)
      } else if (selectedPlatform === 'slack' && isSlackAuth) {
        const slackChannels = slackModeManager.getProjects()
        setChannels(slackChannels)
      } else if (selectedPlatform === 'jira' && isJiraAuth) {
        const jiraProjects = jiraModeManager.getProjects()
        setChannels(jiraProjects)
      } else {
        setChannels([])
      }
      setSelectedChannel(null)
    }

    loadChannels()

    // Set up auth state change listeners
    const handleGitHubAuthChange = () => {
      if (selectedPlatform === 'github') loadChannels()
    }
    const handleSlackAuthChange = () => {
      if (selectedPlatform === 'slack') loadChannels()
    }
    const handleJiraAuthChange = () => {
      if (selectedPlatform === 'jira') loadChannels()
    }

    gitHubModeManager.onAuthStateChange(handleGitHubAuthChange)
    slackModeManager.onAuthStateChange(handleSlackAuthChange)
    jiraModeManager.onAuthStateChange(handleJiraAuthChange)

    return () => {
      gitHubModeManager.onAuthStateChange(() => {})
      slackModeManager.onAuthStateChange(() => {})
      jiraModeManager.onAuthStateChange(() => {})
    }
  }, [selectedPlatform])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsChannelDropdownOpen(false)
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
    setComment('')
  }, [selectedElement])

  const handleSubmit = async () => {
    if (!comment.trim() || !selectedChannel) return

    setIsCreatingMessage(true)
    try {
      if (selectedPlatform === 'github' && isGitHubRepo(selectedChannel)) {
        const title = `Feedback: ${getMinimalElementInfo(selectedElement!.elementInfo)}`
        const body = `${comment.trim()}\n\n---\n**Element Info:**\n\`${selectedElement!.elementInfo}\`\n\n**DOM Path:**\n\`${selectedElement!.domPath}\``
        const issueUrl = await gitHubModeManager.createIssue(selectedChannel.full_name, title, body)
        if (issueUrl) {
          // Get the GitHub token
          const token = await gitHubModeManager.getToken()
          if (!token) {
            console.error('No GitHub token available')
            return
          }

          // Call our backend to run SWE-agent
          const response = await fetch('https://designx-705035175306.us-central1.run.app/api/run-sweagent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              repo_url: `https://github.com/${selectedChannel.full_name}`,
              issue_url: issueUrl,
              github_token: token
            })
          });

          if (!response.ok) {
            console.error('Failed to trigger SWE-agent:', await response.text());
          }

          onSubmit(comment.trim())
          setComment('')
          onClose()
          window.open(issueUrl, '_blank')
        }
      } else if (selectedPlatform === 'slack' && isSlackChannel(selectedChannel)) {
        const messageText = `${comment.trim()}\n\n` +
          `*Element Info:* \`${selectedElement!.elementInfo}\`\n` +
          `*DOM Path:* \`${selectedElement!.domPath}\``
        
        const messageTs = await slackModeManager.createIssue(selectedChannel.id, messageText, '')
        if (messageTs) {
          onSubmit(comment.trim())
          setComment('')
          onClose()
        }
      } else if (selectedPlatform === 'jira' && isJiraProject(selectedChannel)) {
        const title = `Feedback: ${getMinimalElementInfo(selectedElement!.elementInfo)}`
        const body = `${comment.trim()}\n\n---\nElement Info: ${selectedElement!.elementInfo}\n\nDOM Path: ${selectedElement!.domPath}`
        const issueUrl = await jiraModeManager.createIssue(selectedChannel.key, title, body)
        if (issueUrl) {
          onSubmit(comment.trim())
          setComment('')
          onClose()
          window.open(issueUrl, '_blank')
        }
      }
    } finally {
      setIsCreatingMessage(false)
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

  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform)
    setSelectedChannel(null)
    setIsChannelDropdownOpen(false)
  }

  if (!selectedElement) return null

  // Extract just the tag name for minimal display
  const getMinimalElementInfo = (elementInfo: string): string => {
    const match = elementInfo.match(/^<([^>\s]+)/)
    return match ? `<${match[1]}>` : elementInfo.split(' ')[0] || elementInfo
  }

  const getChannelDisplayName = (channel: Project): string => {
    if (isGitHubRepo(channel)) {
      return channel.full_name
    } else if (isSlackChannel(channel)) {
      return `#${channel.name}`
    } else if (isJiraProject(channel)) {
      return `${channel.key} - ${channel.name}`
    }
    return channel.name || ''
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

  const platformSelectorStyles = {
    display: 'flex',
    gap: '4px',
    marginBottom: '6px'
  }

  const platformButtonStyles = (active: boolean) => ({
    padding: '4px 8px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '10px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: active ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
    color: active ? 'white' : 'rgba(255, 255, 255, 0.6)',
    transition: 'all 0.2s ease'
  })

  const channelSelectorStyles = {
    position: 'relative' as const,
    flex: 1
  }

  const channelButtonStyles = {
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
    color: selectedChannel ? 'white' : 'rgba(255, 255, 255, 0.5)',
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

  const channelItemStyles = {
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
    cursor: comment.trim() && selectedChannel ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
    backgroundColor: comment.trim() && selectedChannel ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    opacity: comment.trim() && selectedChannel ? 1 : 0.5
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

  const getAuthPrompt = () => {
    if (selectedPlatform === 'github' && !gitHubModeManager.isUserAuthenticated()) {
      return 'Sign in to GitHub to create issues'
    }
    if (selectedPlatform === 'slack' && !slackModeManager.isUserAuthenticated()) {
      return 'Sign in to Slack to send messages'
    }
    if (selectedPlatform === 'jira' && !jiraModeManager.isUserAuthenticated()) {
      return 'Sign in to Jira to create issues'
    }
    return selectedPlatform === 'github' ? 'Select repository' : selectedPlatform === 'slack' ? 'Select channel' : 'Select project'
  }

  // Simple Jira icon component (inline SVG)
  const JiraIcon = ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zm-.008 21.347c-5.157 0-9.36-4.202-9.36-9.36 0-5.157 4.203-9.36 9.36-9.36s9.36 4.203 9.36 9.36c0 5.158-4.203 9.36-9.36 9.36z"/>
      <path d="M12.017 4.422L8.78 7.659l3.237 3.237 3.237-3.237z" fill="#2684FF"/>
      <path d="M12.017 12.776l3.237 3.237-3.237 3.237-3.237-3.237z"/>
    </svg>
  )

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

          .channel-item:hover {
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

        <div style={platformSelectorStyles}>
          <button
            onClick={() => handlePlatformChange('github')}
            style={platformButtonStyles(selectedPlatform === 'github')}
          >
            <Github size={12} />
            GitHub
          </button>
          <button
            onClick={() => handlePlatformChange('slack')}
            style={platformButtonStyles(selectedPlatform === 'slack')}
          >
            <Slack size={12} />
            Slack
          </button>
          <button
            onClick={() => handlePlatformChange('jira')}
            style={platformButtonStyles(selectedPlatform === 'jira')}
          >
            <JiraIcon size={12} />
            Jira
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
          <div style={channelSelectorStyles} ref={dropdownRef}>
            <button
              onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
              style={channelButtonStyles}
            >
              {selectedPlatform === 'github' ? <Github size={12} /> : 
               selectedPlatform === 'slack' ? <Slack size={12} /> : 
               <JiraIcon size={12} />}
              {selectedChannel ? getChannelDisplayName(selectedChannel) : getAuthPrompt()}
              <ChevronDown size={12} />
            </button>

            {isChannelDropdownOpen && (
              <div style={dropdownStyles}>
                {channels.length === 0 ? (
                  <div style={{ ...channelItemStyles, cursor: 'default' }}>
                    {selectedPlatform === 'github' 
                      ? 'No repositories available' 
                      : selectedPlatform === 'slack' 
                        ? 'No channels available' 
                        : 'No projects available'}
                  </div>
                ) : (
                  channels.map((channel) => (
                    <div
                      key={String(channel.id)}
                      className="channel-item"
                      style={channelItemStyles}
                      onClick={() => {
                        setSelectedChannel(channel)
                        setIsChannelDropdownOpen(false)
                      }}
                    >
                      {getChannelDisplayName(channel)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!comment.trim() || !selectedChannel || isCreatingMessage}
            style={submitButtonStyles}
          >
            <Send size={12} />
            {isCreatingMessage 
              ? 'Sending...' 
              : selectedPlatform === 'github' 
                ? 'Create Issue' 
                : selectedPlatform === 'slack' 
                  ? 'Send Message' 
                  : 'Create Issue'}
          </button>
        </div>
      </div>
    </>
  )
}

export default CommentBubble 