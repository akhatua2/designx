import React, { useState, useEffect } from 'react'
import { X, ArrowLeft, CircleDot, Plus } from 'lucide-react'
import { jiraModeManager, type JiraUser, type JiraProject, type JiraIssue } from './JiraModeManager'

interface JiraBubbleProps {
  selectedText?: string
  onClose?: () => void
}

const JiraBubble: React.FC<JiraBubbleProps> = ({ selectedText, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<JiraUser | null>(null)
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null)
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState<'auth' | 'projects' | 'issues' | 'create'>('auth')
  const [issueTitle, setIssueTitle] = useState('')
  const [issueDescription, setIssueDescription] = useState('')

  // Type guard to check if a project is a JiraProject
  const isJiraProject = (project: any): project is JiraProject => {
    return 'key' in project && 'projectTypeKey' in project
  }

  useEffect(() => {
    // Initialize authentication state
    const initializeAuth = async () => {
      const authenticated = await jiraModeManager.checkExistingAuth()
      if (authenticated) {
        setIsAuthenticated(true)
        setUser(jiraModeManager.getUser())
        setProjects(jiraModeManager.getProjects() as JiraProject[])
        setView('projects')
      }
    }

    initializeAuth()

    // Listen for auth state changes
    jiraModeManager.onAuthStateChange((authenticated, userData) => {
      setIsAuthenticated(authenticated)
      setUser(userData || null)
      if (authenticated) {
        setProjects(jiraModeManager.getProjects() as JiraProject[])
        setView('projects')
      } else {
        setView('auth')
        setProjects([])
        setIssues([])
      }
    })

    // Pre-fill form with selected text if available
    if (selectedText) {
      setIssueDescription(selectedText)
      if (selectedText.length < 100) {
        setIssueTitle(selectedText)
        setIssueDescription('')
      }
    }
  }, [selectedText])

  const handleAuth = async () => {
    setIsLoading(true)
    try {
      const success = await jiraModeManager.authenticate()
      if (success) {
        setIsAuthenticated(true)
        setUser(jiraModeManager.getUser())
        setProjects(jiraModeManager.getProjects() as JiraProject[])
        setView('projects')
      }
    } catch (error) {
      console.error('Authentication failed:', error)
      alert('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await jiraModeManager.logout()
    setIsAuthenticated(false)
    setUser(null)
    setProjects([])
    setIssues([])
    setView('auth')
  }

  const handleProjectSelect = async (project: JiraProject) => {
    setSelectedProject(project)
    setIsLoading(true)
    
    try {
      const projectIssues = await jiraModeManager.fetchIssues(project.key)
      setIssues(projectIssues)
      setView('issues')
    } catch (error) {
      console.error('Failed to fetch issues:', error)
      alert('Failed to fetch issues. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateIssue = async () => {
    if (!selectedProject || !issueTitle.trim()) {
      alert('Please enter a title for the issue')
      return
    }

    setIsLoading(true)
    try {
      const issueUrl = await jiraModeManager.createIssue(
        selectedProject.key,
        issueTitle.trim(),
        issueDescription.trim()
      )
      
      if (issueUrl) {
        alert(`Issue created successfully! Opening: ${issueUrl}`)
        window.open(issueUrl, '_blank')
        
        // Refresh issues list
        const projectIssues = await jiraModeManager.fetchIssues(selectedProject.key)
        setIssues(projectIssues)
        
        // Reset form
        setIssueTitle('')
        setIssueDescription('')
        setView('issues')
      }
    } catch (error) {
      console.error('Failed to create issue:', error)
      alert('Failed to create issue. Please check the console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackClick = () => {
    if (view === 'issues') {
      setView('projects')
      setSelectedProject(null)
      setIssues([])
    } else if (view === 'create') {
      setView('issues')
    }
  }

  // Consistent styling with Slack and GitHub bubbles
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

  const contentStyles = {
    flex: 1,
    overflow: 'auto',
    maxHeight: '320px'
  }

  const authButtonStyles = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#0052CC', // Jira blue
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

  const projectItemStyles = {
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    border: '1px solid transparent'
  }

  const projectNameStyles = {
    fontSize: '11px',
    fontWeight: '500',
    color: 'white',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }

  const projectMetaStyles = {
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  const issueItemStyles = {
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    border: '1px solid transparent'
  }

  const issueTitleStyles = {
    fontSize: '11px',
    fontWeight: '500' as const,
    color: 'white',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }

  const issueMetaStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.5)'
  }

  const formStyles = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  }

  const inputStyles = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    fontSize: '11px',
    boxSizing: 'border-box' as const
  }

  const textareaStyles = {
    ...inputStyles,
    resize: 'vertical' as const,
    minHeight: '80px',
    fontFamily: 'inherit'
  }

  const buttonStyles = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  }

  const primaryButtonStyles = {
    ...buttonStyles,
    backgroundColor: '#0052CC',
    color: 'white'
  }

  const secondaryButtonStyles = {
    ...buttonStyles,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white'
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
          
          .jira-project-item:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
          }

          .jira-issue-item:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
          }

          .jira-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        <div style={headerStyles}>
          <div style={titleStyles}>
            {isAuthenticated && user ? (
              <>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ color: '#0052CC' }}
                >
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zm-.008 21.347c-5.157 0-9.36-4.202-9.36-9.36 0-5.157 4.203-9.36 9.36-9.36s9.36 4.203 9.36 9.36c0 5.158-4.203 9.36-9.36 9.36z"/>
                  <path d="M12.017 4.422L8.78 7.659l3.237 3.237 3.237-3.237z" fill="#2684FF"/>
                  <path d="M12.017 12.776l3.237 3.237-3.237 3.237-3.237-3.237z"/>
                </svg>
                <span>{user.displayName}</span>
              </>
            ) : (
              <>🎫 Jira</>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAuthenticated && (
              <button 
                onClick={handleLogout}
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
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={12} />
            </button>
          </div>
        </div>

        <div style={contentStyles}>
          {!isAuthenticated ? (
            <button onClick={handleAuth} style={authButtonStyles} disabled={isLoading}>
              {isLoading ? 'Connecting...' : 'Connect to Jira'}
            </button>
          ) : view === 'projects' ? (
            <>
              <div style={{ fontSize: '10px', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Your Projects ({projects.length})
              </div>
              
              {projects.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '10px' 
                }}>
                  No projects available
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className="jira-project-item"
                    style={projectItemStyles}
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div style={projectNameStyles}>
                      <CircleDot size={10} />
                      {project.name}
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '9px',
                        marginLeft: '4px'
                      }}>
                        {project.key}
                      </span>
                    </div>
                    {project.description && (
                      <div style={{
                        fontSize: '9px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginBottom: '4px',
                        lineHeight: '1.3'
                      }}>
                        {project.description.length > 80 
                          ? `${project.description.substring(0, 80)}...` 
                          : project.description
                        }
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          ) : view === 'issues' ? (
            <>
              <div 
                style={{ 
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
                <span>Back to projects</span>
              </div>

              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <CircleDot size={12} />
                  Issues in {selectedProject?.name}
                </div>
                <button 
                  onClick={() => setView('create')}
                  style={{
                    ...primaryButtonStyles,
                    padding: '4px 8px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={10} />
                  Create
                </button>
              </div>

              {isLoading ? (
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
                  No issues found
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="jira-issue-item"
                    style={issueItemStyles}
                    onClick={() => window.open(issue.url, '_blank')}
                  >
                    <div style={issueTitleStyles}>
                      {issue.key} {issue.title}
                    </div>
                    <div style={issueMetaStyles}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '9px',
                        fontWeight: '500',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}>
                        {issue.fields.status.name}
                      </span>
                      <span>Reporter: {issue.fields.reporter.displayName}</span>
                      {issue.fields.assignee && (
                        <span>Assignee: {issue.fields.assignee.displayName}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : view === 'create' ? (
            <>
              <div 
                style={{ 
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
                <span>Back to issues</span>
              </div>

              <div style={{ 
                fontSize: '11px', 
                fontWeight: '600',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Plus size={12} />
                Create Issue in {selectedProject?.name}
              </div>

              <div style={formStyles}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="Enter issue title..."
                    className="jira-input"
                    style={inputStyles}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Description
                  </label>
                  <textarea
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Enter issue description..."
                    className="jira-input"
                    style={textareaStyles}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleCreateIssue}
                    disabled={isLoading || !issueTitle.trim()}
                    style={{
                      ...primaryButtonStyles,
                      flex: 1,
                      opacity: (isLoading || !issueTitle.trim()) ? 0.6 : 1,
                      cursor: (isLoading || !issueTitle.trim()) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isLoading ? 'Creating...' : 'Create Issue'}
                  </button>
                  <button 
                    onClick={handleBackClick}
                    style={secondaryButtonStyles}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}

export default JiraBubble 