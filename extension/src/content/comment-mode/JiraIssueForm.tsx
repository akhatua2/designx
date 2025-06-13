import React, { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown } from 'lucide-react'
import type { SelectedElement } from './CommentModeManager'
import { jiraModeManager } from '../integrations/jira'
import type { JiraProject } from '../integrations/jira/JiraModeManager'

interface JiraIssueFormProps {
  selectedElement: SelectedElement
  comment: string
  onCommentChange: (comment: string) => void
  onSubmit: (comment: string, externalUrl?: string, externalId?: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onScreenshotUploaded: (screenshotUrl: string) => void
}

// Simple Jira icon component (inline SVG)
const JiraIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zm-.008 21.347c-5.157 0-9.36-4.202-9.36-9.36 0-5.157 4.203-9.36 9.36-9.36s9.36 4.203 9.36 9.36c0 5.158-4.203 9.36-9.36 9.36z"/>
    <path d="M12.017 4.422L8.78 7.659l3.237 3.237 3.237-3.237z" fill="#2684FF"/>
    <path d="M12.017 12.776l3.237 3.237-3.237 3.237-3.237-3.237z"/>
  </svg>
)

const JiraIssueForm: React.FC<JiraIssueFormProps> = ({
  selectedElement,
  comment,
  onCommentChange,
  onSubmit,
  onKeyDown
}) => {
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null)
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load projects when component mounts and when auth state changes
  useEffect(() => {
    const loadProjects = () => {
      if (jiraModeManager.isUserAuthenticated()) {
        const jiraProjects = jiraModeManager.getProjects() as JiraProject[]
        setProjects(jiraProjects)
      } else {
        setProjects([])
        setSelectedProject(null)
      }
    }

    loadProjects()
    jiraModeManager.onAuthStateChange(loadProjects)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus textarea
  useEffect(() => {
    if (textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [])

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'
      // Calculate the new height based on content
      const newHeight = Math.max(35, Math.min(textarea.scrollHeight, 120)) // Min 35px, max 120px
      textarea.style.height = `${newHeight}px`
    }
  }, [comment])

  const handleSubmit = async () => {
    if (!comment.trim() || !selectedProject) return

    setIsCreating(true)
    try {
      // Create a more professional title for Jira
      const title = `UI Feedback: ${comment.trim().substring(0, 50)}${comment.trim().length > 50 ? '...' : ''}`
      
      // Create a professional formatted body for Jira
      const body = `h2. User Feedback

${comment.trim()}

----

h3. Technical Details

*Element Information:*
{code}
${selectedElement.elementInfo}
{code}

*DOM Path:*
{code}
${selectedElement.domPath}
{code}

*Page URL:* ${window.location.href}

*Timestamp:* ${new Date().toISOString()}

----
_This issue was created automatically using DesignX feedback tool_`
      
      const issueUrl = await jiraModeManager.createIssue(selectedProject.key, title, body)
      if (issueUrl) {
        // Extract issue key from URL for external_id (e.g., "PROJ-123")
        const issueKey = issueUrl.split('/browse/')[1]
        onSubmit(comment.trim(), issueUrl, issueKey)
        window.open(issueUrl, '_blank')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const textareaStyles = {
    width: '100%',
    minHeight: '35px',
    maxHeight: '120px',
    height: '35px',
    padding: '2px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    fontSize: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    resize: 'none' as const,
    outline: 'none',
    marginBottom: '6px',
    overflowY: 'auto' as const
  }

  const buttonContainerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px'
  }

  const projectSelectorStyles = {
    position: 'relative' as const,
    flex: 1
  }

  const projectButtonStyles = {
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
    color: selectedProject ? 'white' : 'rgba(255, 255, 255, 0.5)',
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

  const projectItemStyles = {
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
    cursor: comment.trim() && selectedProject ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
    backgroundColor: comment.trim() && selectedProject ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    opacity: comment.trim() && selectedProject ? 1 : 0.5
  }

  const getAuthPrompt = () => {
    return jiraModeManager.isUserAuthenticated() ? 'Select project' : 'Sign in to Jira to create issues'
  }

  return (
    <>
      <style>
        {`
          .project-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        `}
      </style>
      
      <textarea
        ref={textareaRef}
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Describe the issue or feedback..."
        style={textareaStyles}
        className="comment-textarea"
      />
      
      <div style={buttonContainerStyles}>
        <div style={projectSelectorStyles} ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={projectButtonStyles}
          >
            <JiraIcon size={12} />
            {selectedProject ? `${selectedProject.key} - ${selectedProject.name}` : getAuthPrompt()}
            <ChevronDown size={12} />
          </button>

          {isDropdownOpen && (
            <div style={dropdownStyles}>
              {projects.length === 0 ? (
                <div style={{ ...projectItemStyles, cursor: 'default' }}>
                  No projects available
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.key}
                    className="project-item"
                    style={projectItemStyles}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedProject(project)
                      setIsDropdownOpen(false)
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    {project.key} - {project.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!comment.trim() || !selectedProject || isCreating}
          style={submitButtonStyles}
        >
          <Send size={12} />
          {isCreating ? 'Creating...' : 'Create Issue'}
        </button>
      </div>
    </>
  )
}

export default JiraIssueForm 