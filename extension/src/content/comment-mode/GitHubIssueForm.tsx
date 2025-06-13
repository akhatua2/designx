import React, { useState, useRef, useEffect } from 'react'
import { Send, Github, ChevronDown } from 'lucide-react'
import type { SelectedElement } from './CommentModeManager'
import { ScreenshotCapture } from './ScreenshotCapture'
import { gitHubModeManager } from '../integrations/github'
import type { GitHubRepo } from '../integrations/github/GitHubModeManager'

interface GitHubIssueFormProps {
  selectedElement: SelectedElement
  comment: string
  onCommentChange: (comment: string) => void
  onSubmit: (comment: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

const GitHubIssueForm: React.FC<GitHubIssueFormProps> = ({
  selectedElement,
  comment,
  onCommentChange,
  onSubmit,
  onKeyDown
}) => {
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
        } else {
          console.warn('⚠️ Screenshot capture failed:', result.error)
        }
      } catch (error) {
        console.warn('⚠️ Failed to capture screenshot, continuing without it:', error)
      }
      
      // Create a more professional title
      const title = `UI Feedback: ${comment.trim().substring(0, 50)}${comment.trim().length > 50 ? '...' : ''}`
      
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

      const body = `## User Feedback

${comment.trim()}
${screenshotSection}

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
        onSubmit(comment.trim())
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

  return (
    <>
      <style>
        {`
          .repo-item:hover {
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
        <div style={repoSelectorStyles} ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={repoButtonStyles}
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
                    key={repo.full_name}
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
        >
          <Send size={12} />
          {isCreating ? 'Creating...' : 'Create Issue'}
        </button>
      </div>
    </>
  )
}

export default GitHubIssueForm 