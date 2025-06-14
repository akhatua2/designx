import React, { useState, useRef, useEffect } from 'react'
import { Send, Github, ChevronDown, Camera, X } from 'lucide-react'
import type { SelectedElement } from './CommentModeManager'
import { ScreenshotCapture } from './ScreenshotCapture'
import { gitHubModeManager } from '../integrations/github'
import type { GitHubRepo } from '../integrations/github/GitHubModeManager'
import { commentModeManager } from './CommentModeManager'

interface GitHubIssueFormProps {
  selectedElement: SelectedElement
  comment: string
  onCommentChange: (comment: string) => void
  onSubmit: (comment: string, externalUrl?: string, externalId?: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onScreenshotUploaded: (screenshotUrl: string) => void
}

const GitHubIssueForm: React.FC<GitHubIssueFormProps> = ({
  selectedElement,
  comment,
  onCommentChange,
  onSubmit,
  onKeyDown,
  onScreenshotUploaded
}) => {
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium')
  const [figmaLink, setFigmaLink] = useState('')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [additionalScreenshots, setAdditionalScreenshots] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const priorityDropdownRef = useRef<HTMLDivElement>(null)

  // Load repos when component mounts and when auth state changes
  useEffect(() => {
    const loadRepos = () => {
      if (gitHubModeManager.isUserAuthenticated()) {
        const githubRepos = gitHubModeManager.getProjects() as GitHubRepo[]
        setRepos(githubRepos)
      } else {
        setRepos([])
        setSelectedRepo(null)
      }
    }

    loadRepos()
    gitHubModeManager.onAuthStateChange(loadRepos)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setIsPriorityDropdownOpen(false)
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

  // Set up element capture callback for selection mode
  useEffect(() => {
    const handleElementCapture = async (elementData: SelectedElement) => {
      try {
        console.log('📸 Capturing screenshot for selected element...')
        const result = await ScreenshotCapture.captureElement({
          element: elementData.element
        })
        if (result.success && result.imageUrl) {
          console.log('✅ Additional screenshot captured:', result.imageUrl)
          setAdditionalScreenshots(prev => [...prev, result.imageUrl!])
          onScreenshotUploaded(result.imageUrl)
        } else {
          console.warn('⚠️ Screenshot capture failed:', result.error)
        }
      } catch (error) {
        console.warn('⚠️ Failed to capture screenshot:', error)
      }
    }

    commentModeManager.onElementCaptured(handleElementCapture)
    
    return () => {
      // Clean up callback on unmount
      commentModeManager.onElementCaptured(() => {})
    }
  }, [onScreenshotUploaded])

  const handleStartSelection = () => {
    setIsSelectionMode(true)
    commentModeManager.enterSelectionMode()
  }

  const handleStopSelection = () => {
    console.log('🛑 Stopping selection mode...')
    setIsSelectionMode(false)
    commentModeManager.exitSelectionMode()
  }

  const handleRemoveScreenshot = (index: number) => {
    setAdditionalScreenshots(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!comment.trim() || !selectedRepo) return

    setIsCreating(true)
    try {
      // Automatically capture screenshot for GitHub issues
      let screenshotUrl: string | null = null
      try {
        console.log('📸 Automatically capturing screenshot for GitHub issue...')
        const result = await ScreenshotCapture.captureElement({
          element: selectedElement.element
        })
        if (result.success && result.imageUrl) {
          screenshotUrl = result.imageUrl
          console.log('✅ Screenshot captured:', screenshotUrl)
          // Track this screenshot for task linking
          onScreenshotUploaded(screenshotUrl)
        } else {
          console.warn('⚠️ Screenshot capture failed:', result.error)
        }
      } catch (error) {
        console.warn('⚠️ Failed to capture screenshot, continuing without it:', error)
      }
      
      // Create a more professional title with priority
      const title = `[${priority}] UI Feedback: ${comment.trim().substring(0, 50)}${comment.trim().length > 50 ? '...' : ''}`
      
      // Create a professional formatted body with React info
      const reactSection = selectedElement.reactInfo?.isReactElement ? `

**React Component:**
\`\`\`
${selectedElement.reactInfo.componentName || 'Anonymous Component'}
${selectedElement.reactInfo.displayName ? `Display Name: ${selectedElement.reactInfo.displayName}` : ''}
${selectedElement.reactInfo.filePath ? `File: ${selectedElement.reactInfo.filePath}${selectedElement.reactInfo.lineNumber ? `:${selectedElement.reactInfo.lineNumber}` : ''}` : ''}
${selectedElement.reactInfo.reactVersion ? `React Version: ${selectedElement.reactInfo.reactVersion}` : ''}
\`\`\`

${selectedElement.reactInfo.props && Object.keys(selectedElement.reactInfo.props).length > 0 ? `**Props:**
\`\`\`json
${JSON.stringify(selectedElement.reactInfo.props, null, 2)}
\`\`\`` : ''}

${selectedElement.reactInfo.state && Object.keys(selectedElement.reactInfo.state).length > 0 ? `**State:**
\`\`\`json
${JSON.stringify(selectedElement.reactInfo.state, null, 2)}
\`\`\`` : ''}

${selectedElement.reactInfo.hooks && selectedElement.reactInfo.hooks.length > 0 ? `**Hooks:**
\`\`\`json
${JSON.stringify(selectedElement.reactInfo.hooks, null, 2)}
\`\`\`` : ''}
` : ''

      const screenshotSection = screenshotUrl ? `

## Screenshot

![Element Screenshot](${screenshotUrl})

*Screenshot of the selected element automatically captured by DesignX*

---` : ''

      const figmaSection = figmaLink.trim() ? `

## Design Reference

**Figma Link:** ${figmaLink.trim()}

---` : ''

      const body = `## User Feedback

${comment.trim()}

**Priority:** ${priority}
${figmaSection}${screenshotSection}

### Technical Details
<details>
<summary>Click to view technical information</summary>

**Element Information:**
\`\`\`
${selectedElement.elementInfo}
\`\`\`

**DOM Path:**
\`\`\`
${selectedElement.domPath}
\`\`\`
${reactSection}
**Page URL:** ${window.location.href}

**Timestamp:** ${new Date().toISOString()}
</details>

---
*This issue was created automatically using DesignX feedback tool*`
      
      const issueUrl = await gitHubModeManager.createIssue(selectedRepo.full_name, title, body)
      if (issueUrl) {
        // Extract issue number from URL for external_id
        const issueNumber = issueUrl.split('/issues/')[1]
        onSubmit(comment.trim(), issueUrl, issueNumber)
        window.open(issueUrl, '_blank')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const fieldContainerStyles = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    marginBottom: '10px'
  }

  const rowStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: '24px'
  }

  const labelStyles = {
    fontSize: '10px',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    minWidth: '50px'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return '#ef4444' // red
      case 'High': return '#f97316' // orange
      case 'Medium': return '#eab308' // yellow
      case 'Low': return '#22c55e' // green
      default: return '#6b7280' // gray
    }
  }

  const priorityContainerStyles = {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center'
  }

  const priorityTagStyles = {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '9px',
    fontWeight: '600',
    backgroundColor: getPriorityColor(priority),
    color: 'white',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }

  const priorityDropdownStyles = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    marginTop: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    minWidth: '80px'
  }

  const priorityOptionStyles = (optionPriority: string) => ({
    padding: '6px 12px',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    color: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: optionPriority === priority ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
  })

  const figmaInputStyles = {
    padding: '4px 8px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '10px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    outline: 'none',
    flex: 1,
    transition: 'background-color 0.2s ease'
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

  const getAuthPrompt = () => {
    return gitHubModeManager.isUserAuthenticated() ? 'Select repository' : 'Sign in to GitHub to create issues'
  }

  const screenshotSectionStyles = {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }

  const screenshotHeaderStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px'
  }

  const screenshotButtonStyles = {
    padding: '4px 8px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '10px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
    backgroundColor: isSelectionMode ? '#ef4444' : 'rgba(34, 197, 94, 0.8)',
    color: 'white'
  }

  const thumbnailGridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
    gap: '4px',
    marginTop: '6px'
  }

  const thumbnailStyles = {
    position: 'relative' as const,
    width: '60px',
    height: '40px',
    borderRadius: '4px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  }

  const thumbnailImageStyles = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    cursor: 'pointer'
  }

  const removeButtonStyles = {
    position: 'absolute' as const,
    top: '2px',
    right: '2px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '8px'
  }

  return (
    <>
      <style>
        {`
          .repo-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
          .github-select:focus {
            border-color: rgba(255, 255, 255, 0.25);
            background-color: rgba(255, 255, 255, 0.08);
          }
          .github-figma-input:focus {
            background-color: rgba(255, 255, 255, 0.08);
          }
          .github-figma-input::placeholder {
            color: rgba(255, 255, 255, 0.3);
          }
          .priority-tag:hover {
            transform: scale(1.05);
          }
          .priority-option:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
        `}
      </style>
      
      <div style={fieldContainerStyles}>
        <div style={rowStyles}>
          <span style={labelStyles}>PRIORITY</span>
          <div style={priorityContainerStyles} ref={priorityDropdownRef}>
            <div
              className="priority-tag"
              style={priorityTagStyles}
              onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
            >
              {priority}
            </div>

            {isPriorityDropdownOpen && (
              <div style={priorityDropdownStyles}>
                {(['Low', 'Medium', 'High', 'Critical'] as const).map((p) => (
                  <div
                    key={p}
                    className="priority-option"
                    style={priorityOptionStyles(p)}
                    onClick={() => {
                      setPriority(p)
                      setIsPriorityDropdownOpen(false)
                    }}
                  >
                    {p}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div style={rowStyles}>
          <span style={labelStyles}>FIGMA</span>
          <input
            type="text"
            value={figmaLink}
            onChange={(e) => setFigmaLink(e.target.value)}
            placeholder="Paste Figma link (optional)"
            style={{
              flex: 1,
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '10px',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            className="github-figma-input"
          />
        </div>
      </div>

      {/* Screenshot Section */}
      <div style={screenshotSectionStyles}>
        <div style={screenshotHeaderStyles}>
          <span style={{ fontSize: '10px', fontWeight: '500', color: 'rgba(255, 255, 255, 0.7)' }}>
            SCREENSHOTS
          </span>
          <button
            onMouseDown={() => {
              if (isSelectionMode) {
                console.log('🖱️ Done button mousedown - setting allow flag')
                commentModeManager.allowNextClickToPassThrough()
              }
            }}
            onClick={() => {
              console.log('🖱️ Done button clicked')
              if (isSelectionMode) {
                handleStopSelection()
              } else {
                handleStartSelection()
              }
            }}
            style={screenshotButtonStyles}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Camera size={12} />
            {isSelectionMode ? 'Done' : 'Add More'}
          </button>
        </div>
        
        {additionalScreenshots.length > 0 && (
          <div style={thumbnailGridStyles}>
            {additionalScreenshots.map((url, index) => (
              <div key={index} style={thumbnailStyles}>
                <img
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  style={thumbnailImageStyles}
                  onClick={() => window.open(url, '_blank')}
                />
                <button
                  onClick={() => handleRemoveScreenshot(index)}
                  style={removeButtonStyles}
                  title="Remove screenshot"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {additionalScreenshots.length === 0 && (
          <div style={{ 
            fontSize: '9px', 
            color: 'rgba(255, 255, 255, 0.4)', 
            textAlign: 'center' as const,
            padding: '8px 0'
          }}>
            Click "Add More" to capture additional screenshots
          </div>
        )}
      </div>

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
        <div style={repoSelectorStyles} ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={repoButtonStyles}
            className="github-select"
          >
            <Github size={12} />
            {selectedRepo ? selectedRepo.full_name : getAuthPrompt()}
            <ChevronDown size={12} />
          </button>

          {isDropdownOpen && (
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
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedRepo(repo)
                      setIsDropdownOpen(false)
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
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
          disabled={!comment.trim() || !selectedRepo || isCreating}
          style={submitButtonStyles}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.9)'
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.8)'
            }
          }}
        >
          {isCreating ? 'Creating...' : 'Create Issue'}
        </button>
      </div>
    </>
  )
}

export default GitHubIssueForm 