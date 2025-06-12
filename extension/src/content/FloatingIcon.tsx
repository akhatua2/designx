import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Edit3, Github, MessageSquare, Slack } from 'lucide-react'
import { editModeManager } from './edit-mode'
import { commentModeManager, type SelectedElement, CommentBubble } from './comment-mode'
import { gitHubModeManager, type GitHubUser, GitHubBubble } from './integrations/github'
import { slackModeManager, type SlackUser, type SlackMessage, SlackBubble } from './integrations/slack'
import { jiraModeManager, type JiraUser, type JiraIssue, JiraBubble } from './integrations/jira'
import type { Project } from './integrations/IntegrationManager'

// Inline styles to ensure the component works even if Tailwind doesn't load
const styles = {
  menuButton: {
    width: '160px',
    height: '44px',
    borderRadius: '22px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease',
    pointerEvents: 'auto' as const
  }
}

const FloatingIcon: React.FC = () => {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  
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

    // Check for existing authentication on load
    gitHubModeManager.checkExistingAuth()
    slackModeManager.checkExistingAuth()
    jiraModeManager.checkExistingAuth()

    return () => {
      editModeManager.cleanup()
      commentModeManager.cleanup()
      gitHubModeManager.cleanup()
      slackModeManager.cleanup()
      jiraModeManager.cleanup()
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

  const handleCommentSubmit = (comment: string) => {
    if (!selectedElement) return
    
    console.log('💬 Comment submitted:')
    console.log('Element:', selectedElement.elementInfo)
    console.log('DOM Path:', selectedElement.domPath)
    console.log('Comment:', comment)
    console.log('---')
    
    // Here you would typically send the comment to your backend
    // For now, we'll just log it
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

  return (
    <>
      <CommentBubble
        selectedElement={selectedElement}
        onClose={handleCommentClose}
        onSubmit={handleCommentSubmit}
      />
      
      <GitHubBubble
        isVisible={selectedIcon === 'github'}
        isAuthenticated={isGitHubAuthenticated}
        user={gitHubUser}
        repos={gitHubRepos}
        onClose={handleGitHubClose}
        onAuthenticate={handleGitHubAuthenticate}
        onLogout={handleGitHubLogout}
        onSelectRepo={handleGitHubRepoSelect}
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
      
      <div 
        style={{
          ...styles.menuButton,
          width: '200px' // Increase width to accommodate Jira button
        }}
        className="relative"
        data-floating-icon="true"
      >
        <button
          onClick={handleGitHub}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px'
          }}
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
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px'
          }}
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
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px'
          }}
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
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px'
          }}
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
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px'
          }}
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
    </>
  )
}

export default FloatingIcon 