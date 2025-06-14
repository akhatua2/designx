import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Edit3, Github, MessageSquare, Slack, User } from 'lucide-react'
import { editModeManager } from './edit-mode'
import { commentModeManager, type SelectedRegion, CommentBubble, ToolBubble, XRayOverlay } from './comment-mode'
import { ScreenshotCapture } from './comment-mode/ScreenshotCapture'
import { gitHubModeManager, type GitHubUser, GitHubBubble } from './integrations/github'
import { slackModeManager, type SlackUser, type SlackMessage, SlackBubble } from './integrations/slack'
import { jiraModeManager, type JiraUser, type JiraIssue, JiraBubble } from './integrations/jira'
import { googleAuthManager, type GoogleUser } from './integrations/google/GoogleAuthManager'
import type { Project } from './integrations/IntegrationManager'
import UserBubble from './UserBubble'

interface DesignChange {
  property: string
  oldValue: string
  newValue: string
  timestamp: string
}

// Inline styles to ensure the component works exactly as before
const styles = {
  menuButton: {
    height: '44px',
    borderRadius: '22px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: 'auto' as const,
    overflow: 'hidden',
    position: 'relative' as const
  },
  menuButtonCollapsed: {
    width: '44px',
    borderRadius: '50%',
    justifyContent: 'center',
    padding: '0'
  },
  menuButtonExpanded: {
    width: '250px',
    borderRadius: '22px',
    justifyContent: 'space-between',
    padding: '0 8px'
  },
  iconsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 0,
    transform: 'scale(0.8)',
    pointerEvents: 'none' as const
  },
  iconsContainerVisible: {
    display: 'flex',
    opacity: 1,
    transform: 'scale(1)',
    pointerEvents: 'auto' as const
  },
  iconsContainerHidden: {
    display: 'none'
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  profileButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0px',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    flexShrink: 0
  },
  profilePicture: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover' as const
  },
  profilePlaceholder: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}

const FloatingIcon: React.FC = () => {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [selectedElement, setSelectedElement] = useState<SelectedRegion | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [showUserBubble, setShowUserBubble] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isXRayActive, setIsXRayActive] = useState(false)
  const [designChanges, setDesignChanges] = useState<DesignChange[]>([])
  
  // Google Auth state
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false)
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null)
  const [googleToken, setGoogleToken] = useState<string | null>(null)
  
  // GitHub state
  const [isGitHubAuthenticated, setIsGitHubAuthenticated] = useState(false)
  const [gitHubUser, setGitHubUser] = useState<GitHubUser | null>(null)
  const [gitHubRepos, setGitHubRepos] = useState<Project[]>([])
  
  // Slack state
  const [isSlackAuthenticated, setIsSlackAuthenticated] = useState(false)
  const [slackUser, setSlackUser] = useState<SlackUser | null>(null)
  const [slackChannels, setSlackChannels] = useState<Project[]>([])
  
  // Jira state
  const [isJiraAuthenticated, setIsJiraAuthenticated] = useState(false)
  const [jiraUser, setJiraUser] = useState<JiraUser | null>(null)
  const [jiraProjects, setJiraProjects] = useState<Project[]>([])
  
  const selectedIconRef = useRef<string | null>(null)

  // Keep ref in sync with state
  selectedIconRef.current = selectedIcon

  const handleDesignChanges = (changes: DesignChange[]) => {
    console.log('🎨 Design changes received in FloatingIcon:', changes)
    setDesignChanges(changes)
  }

  // Clear design changes when element changes
  useEffect(() => {
    setDesignChanges([])
  }, [selectedElement])

  const handleGoogleAuth = async () => {
    if (isGoogleAuthenticated) {
      // If already authenticated, show user bubble
      setShowUserBubble(true)
      return
    }

    const success = await googleAuthManager.authenticate()
    if (!success) {
      alert('Authentication failed. Please try again.')
    }
  }

  // Function to get Google token for SWE-agent
  const getGoogleToken = async () => {
    return googleAuthManager.getToken()
  }

  // Function to get GitHub token for SWE-agent
  const getGitHubToken = async () => {
    return gitHubModeManager.getToken()
  }

  // Set up mode state synchronization and cleanup on unmount
  useEffect(() => {
    // Register callback to sync UI state with edit mode state
    editModeManager.onStateChange((isActive) => {
      if (isActive) {
        // Deactivate other modes if edit mode is activated
        commentModeManager.deactivate()
        gitHubModeManager.deactivate()
        slackModeManager.deactivate()
        jiraModeManager.deactivate()
        setSelectedIcon('edit')
        setSelectedElement(null) // Clear comment bubble
      } else if (selectedIconRef.current === 'edit') {
        setSelectedIcon(null)
      }
    })

    // Register callback to sync UI state with comment mode state
    commentModeManager.onStateChange((isActive) => {
      if (isActive) {
        // Deactivate other modes if comment mode is activated
        editModeManager.deactivate()
        gitHubModeManager.deactivate()
        slackModeManager.deactivate()
        jiraModeManager.deactivate()
        setSelectedIcon('comment')
      } else if (selectedIconRef.current === 'comment') {
        setSelectedIcon(null)
        setSelectedElement(null) // Clear comment bubble when comment mode deactivates
      }
    })

    // Register callback to sync UI state with GitHub mode state
    gitHubModeManager.onStateChange((isActive) => {
      if (isActive) {
        // Deactivate other modes if GitHub mode is activated
        editModeManager.deactivate()
        commentModeManager.deactivate()
        slackModeManager.deactivate()
        jiraModeManager.deactivate()
        setSelectedIcon('github')
        setSelectedElement(null) // Clear comment bubble
      } else if (selectedIconRef.current === 'github') {
        setSelectedIcon(null)
      }
    })

    // Register callback to sync UI state with Slack mode state
    slackModeManager.onStateChange((isActive: boolean) => {
      if (isActive) {
        // Deactivate other modes if Slack mode is activated
        editModeManager.deactivate()
        commentModeManager.deactivate()
        gitHubModeManager.deactivate()
        jiraModeManager.deactivate()
        setSelectedIcon('slack')
        setSelectedElement(null) // Clear comment bubble
      } else if (selectedIconRef.current === 'slack') {
        setSelectedIcon(null)
      }
    })

    // Register callback to sync UI state with Jira mode state
    jiraModeManager.onStateChange((isActive: boolean) => {
      if (isActive) {
        // Deactivate other modes if Jira mode is activated
        editModeManager.deactivate()
        commentModeManager.deactivate()
        gitHubModeManager.deactivate()
        slackModeManager.deactivate()
        setSelectedIcon('jira')
        setSelectedElement(null) // Clear comment bubble
      } else if (selectedIconRef.current === 'jira') {
        setSelectedIcon(null)
      }
    })

    // Register callback for element selection in comment mode
    commentModeManager.onElementSelected((elementData) => {
      setSelectedElement(elementData)
    })

    // Register callback for tool actions
    commentModeManager.onToolAction((action, elementData) => {
      console.log('🔧 Tool action triggered:', action, elementData)
      if (action === 'save') {
        // Handle save action - for now just log
        console.log('💾 Saving selection:', elementData)
      }
    })

    // Register callback for GitHub authentication state
    gitHubModeManager.onAuthStateChange((isAuthenticated, user) => {
      setIsGitHubAuthenticated(isAuthenticated)
      setGitHubUser(user || null)
      if (isAuthenticated) {
        setGitHubRepos(gitHubModeManager.getProjects())
      } else {
        setGitHubRepos([])
      }
    })

    // Register callback for Slack authentication state
    slackModeManager.onAuthStateChange((isAuthenticated: boolean, user?: SlackUser) => {
      setIsSlackAuthenticated(isAuthenticated)
      setSlackUser(user || null)
      if (isAuthenticated) {
        setSlackChannels(slackModeManager.getProjects())
      } else {
        setSlackChannels([])
      }
    })

    // Register callback for Jira authentication state
    jiraModeManager.onAuthStateChange((isAuthenticated: boolean, user?: JiraUser) => {
      setIsJiraAuthenticated(isAuthenticated)
      setJiraUser(user || null)
      if (isAuthenticated) {
        setJiraProjects(jiraModeManager.getProjects())
      } else {
        setJiraProjects([])
      }
    })

    // Register callback for Google authentication state
    googleAuthManager.onAuthStateChange((isAuthenticated: boolean, user?: GoogleUser) => {
      setIsGoogleAuthenticated(isAuthenticated)
      setGoogleUser(user || null)
      setGoogleToken(googleAuthManager.getToken())
    })

    // Check for existing authentication on load
    gitHubModeManager.checkExistingAuth()
    slackModeManager.checkExistingAuth()
    jiraModeManager.checkExistingAuth()
    googleAuthManager.checkExistingAuth()

    return () => {
      editModeManager.cleanup()
      commentModeManager.cleanup()
      gitHubModeManager.cleanup()
      slackModeManager.cleanup()
      jiraModeManager.cleanup()
      googleAuthManager.cleanup()
    }
  }, [])

  const handleGitHub = () => {
    console.log('Github feature activated!')
    gitHubModeManager.toggle()
    // Note: selectedIcon state will be updated via the onStateChange callback
  }

  const handleSlack = () => {
    console.log('Slack feature activated!')
    slackModeManager.toggle()
    // Note: selectedIcon state will be updated via the onStateChange callback
  }

  const handleComment = () => {
    console.log('Comment feature activated!')
    commentModeManager.toggle()
    // Note: selectedIcon state will be updated via the onStateChange callback
  }

  const handleEdit = () => {
    console.log('Edit feature activated!')
    editModeManager.toggle()
    // Note: selectedIcon state will be updated via the onStateChange callback
  }

  const handleCommentClose = () => {
    setSelectedElement(null)
    // Resume comment mode highlighting when bubble is closed
    if (commentModeManager.isCommentModeActive()) {
      commentModeManager.resume()
    }
  }

  const handleGitHubAuthenticate = async () => {
    const success = await gitHubModeManager.authenticate()
    if (success) {
      setGitHubRepos(gitHubModeManager.getProjects())
    }
  }

  const handleGitHubLogout = async () => {
    await gitHubModeManager.logout()
  }

  const handleGitHubClose = () => {
    gitHubModeManager.deactivate()
  }

  const handleGitHubRepoSelect = async (repo: Project) => {
    if (!repo.full_name) {
      console.error('Repository full_name is required for GitHub operations')
      return []
    }
    console.log('🐙 Repository selected:', repo.full_name)
    return gitHubModeManager.fetchIssues(repo.full_name)
  }

  const handleSlackAuthenticate = async () => {
    const success = await slackModeManager.authenticate()
    if (success) {
      setSlackChannels(slackModeManager.getProjects())
    }
  }

  const handleSlackLogout = async () => {
    await slackModeManager.logout()
  }

  const handleSlackClose = () => {
    slackModeManager.deactivate()
  }

  const handleSlackChannelSelect = async (channel: Project): Promise<SlackMessage[]> => {
    if (!channel.id) {
      console.error('Channel ID is required for Slack operations')
      return []
    }
    console.log('💬 Channel selected:', channel.name)
    const issues = await slackModeManager.fetchIssues(String(channel.id))
    return issues.map(issue => ({
      ...issue,
      channel_id: String(channel.id),
      timestamp: String(issue.id) // Slack uses timestamps as IDs
    }))
  }

  const handleJira = () => {
    console.log('Jira feature activated!')
    jiraModeManager.toggle()
    // Note: selectedIcon state will be updated via the onStateChange callback
  }

  const handleJiraAuthenticate = async () => {
    const success = await jiraModeManager.authenticate()
    if (success) {
      setJiraProjects(jiraModeManager.getProjects())
    }
  }

  const handleJiraLogout = async () => {
    await jiraModeManager.logout()
  }

  const handleJiraClose = () => {
    jiraModeManager.deactivate()
  }

  const handleJiraProjectSelect = async (project: Project) => {
    if (!project.id) {
      console.error('Project ID is required for Jira operations')
      return []
    }
    console.log('🎫 Jira project selected:', project.name)
    return jiraModeManager.fetchIssues(String(project.id))
  }

  const handleUserBubbleClose = () => {
    setShowUserBubble(false)
  }

  const handleToolSave = async () => {
    if (!selectedElement || isSaving) return
    
    setIsSaving(true)
    
    try {
      console.log('💾 Starting screenshot capture for save...')
      
      let result
      if (selectedElement.type === 'element' && selectedElement.element) {
        result = await ScreenshotCapture.captureElement({
          element: selectedElement.element
        })
      } else if (selectedElement.type === 'area' && selectedElement.area) {
        result = await ScreenshotCapture.captureElement({
          area: selectedElement.area
        })
      }
      
      if (result?.success && result.imageUrl) {
        // Download the image to desktop
        const response = await fetch(result.imageUrl)
        const blob = await response.blob()
        
        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // Generate a user-friendly filename
        const date = new Date().toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).toLowerCase().replace(/,/g, '')
        const time = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }).toLowerCase().replace(/:/g, '-')
        const filename = `screenshot-${date}-${time}.png`
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        console.log('✅ Screenshot saved to desktop:', filename)
      } else {
        console.error('❌ Failed to capture screenshot:', result?.error)
        alert('Failed to capture screenshot. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error saving screenshot:', error)
      alert('Error saving screenshot. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToolXRay = () => {
    setIsXRayActive(!isXRayActive)
    console.log('🔍 X-ray toggled:', !isXRayActive)
  }

  return (
    <>
      {selectedIcon === 'comment' && selectedElement && (
        <ToolBubble
          selectedElement={selectedElement}
          onSave={handleToolSave}
          isSaving={isSaving}
          onXRay={handleToolXRay}
          isXRayActive={isXRayActive}
          onDesignChange={handleDesignChanges}
          onClose={() => {
            setSelectedElement(null)
            setIsXRayActive(false) // Also turn off X-ray when closing
            setDesignChanges([]) // Clear design changes when closing
            // Resume comment mode highlighting so user can select something else
            if (commentModeManager.isCommentModeActive()) {
              commentModeManager.resume()
            }
          }}
        />
      )}
      
      <XRayOverlay
        selectedElement={selectedElement}
        isVisible={isXRayActive}
      />
      
      {selectedElement && (
        <CommentBubble
          selectedElement={selectedElement}
          designChanges={designChanges}
          onClose={handleCommentClose}
        />
      )}
      
      <GitHubBubble
        isVisible={selectedIcon === 'github'}
        isAuthenticated={isGitHubAuthenticated}
        user={gitHubUser}
        repos={gitHubRepos}
        onClose={handleGitHubClose}
        onAuthenticate={handleGitHubAuthenticate}
        onLogout={handleGitHubLogout}
        onSelectRepo={handleGitHubRepoSelect}
        onGetToken={getGitHubToken}
      />

      <SlackBubble
        isVisible={selectedIcon === 'slack'}
        isAuthenticated={isSlackAuthenticated}
        user={slackUser}
        channels={slackChannels}
        onClose={handleSlackClose}
        onAuthenticate={handleSlackAuthenticate}
        onLogout={handleSlackLogout}
        onSelectChannel={handleSlackChannelSelect}
      />

      {selectedIcon === 'jira' && (
        <div style={{
          position: 'fixed',
          bottom: '72px',
          right: '20px',
          zIndex: 10000
        }}>
          <JiraBubble 
            selectedText=""
            onClose={handleJiraClose}
          />
        </div>
      )}

      <UserBubble
        isVisible={showUserBubble}
        user={googleUser}
        onClose={handleUserBubbleClose}
      />
      
      <div 
        style={{
          ...styles.menuButton,
          ...(isHovered ? styles.menuButtonExpanded : styles.menuButtonCollapsed)
        }}
        className="relative"
        data-floating-icon="true"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Icons Container - Only visible when expanded */}
        <div style={{
          ...styles.iconsContainer,
          ...(isHovered ? styles.iconsContainerVisible : styles.iconsContainerHidden)
        }}>
          <button
            onClick={handleGitHub}
            style={styles.iconButton}
          >
            <Github 
              style={{ 
                width: '18px', 
                height: '18px', 
                color: 'white',
                opacity: 0.9,
                strokeWidth: 2.5,
                fill: selectedIcon === 'github' ? 'currentColor' : 'none',
                stroke: 'currentColor'
              }} 
            />
          </button>

          <button
            onClick={handleSlack}
            style={styles.iconButton}
          >
            <Slack 
              style={{ 
                width: '18px', 
                height: '18px', 
                color: 'white',
                opacity: 0.9,
                strokeWidth: 2.5,
                fill: selectedIcon === 'slack' ? 'currentColor' : 'none',
                stroke: 'currentColor'
              }} 
            />
          </button>

          <button
            onClick={handleJira}
            style={styles.iconButton}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill={selectedIcon === 'jira' ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ 
                color: 'white',
                opacity: 0.9
              }}
            >
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zm-.008 21.347c-5.157 0-9.36-4.202-9.36-9.36 0-5.157 4.203-9.36 9.36-9.36s9.36 4.203 9.36 9.36c0 5.158-4.203 9.36-9.36 9.36z"/>
              <path d="M12.017 4.422L8.78 7.659l3.237 3.237 3.237-3.237z" fill="#2684FF"/>
              <path d="M12.017 12.776l3.237 3.237-3.237 3.237-3.237-3.237z"/>
            </svg>
          </button>
          
          <button
            onClick={handleComment}
            style={styles.iconButton}
          >
            <MessageCircle 
              style={{ 
                width: '18px', 
                height: '18px', 
                color: 'white',
                opacity: 0.9,
                strokeWidth: 2.5,
                fill: selectedIcon === 'comment' ? 'currentColor' : 'none',
                stroke: 'currentColor'
              }} 
            />
          </button>
          
          <button
            onClick={handleEdit}
            style={styles.iconButton}
          >
            <Edit3 
              style={{ 
                width: '18px', 
                height: '18px', 
                color: 'white',
                opacity: 0.9,
                strokeWidth: 2.5,
                fill: selectedIcon === 'edit' ? 'currentColor' : 'none',
                stroke: 'currentColor'
              }} 
            />
          </button>
        </div>

        {/* Profile Picture / Google Auth Button - Always visible */}
        <button
          onClick={handleGoogleAuth}
          style={styles.profileButton}
          title={isGoogleAuthenticated ? `${googleUser?.name} (${googleUser?.email})` : 'Sign in with Google'}
        >
          {isGoogleAuthenticated && googleUser?.picture ? (
            <img 
              src={googleUser.picture} 
              alt={googleUser.name}
              style={styles.profilePicture}
            />
          ) : (
            <div style={styles.profilePlaceholder}>
              <User 
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  color: 'white',
                  opacity: 0.7
                }} 
              />
            </div>
          )}
        </button>
      </div>
    </>
  )
}

export default FloatingIcon 