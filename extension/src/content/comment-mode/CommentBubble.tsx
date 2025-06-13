import React, { useState, useRef, useEffect } from 'react'
import { X, Github, Slack } from 'lucide-react'
import type { SelectedElement } from './CommentModeManager'
import GitHubIssueForm from './GitHubIssueForm'
import SlackMessageForm from './SlackMessageForm'
import JiraIssueForm from './JiraIssueForm'

interface CommentBubbleProps {
  selectedElement: SelectedElement | null
  onClose: () => void
}

type Platform = 'github' | 'slack' | 'jira'

const CommentBubble: React.FC<CommentBubbleProps> = ({ 
  selectedElement, 
  onClose
}) => {
  const [comment, setComment] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('github')
  const [uploadedScreenshots, setUploadedScreenshots] = useState<string[]>([])

  // Clear comment and screenshots when element changes
  useEffect(() => {
    setComment('')
    setUploadedScreenshots([])
  }, [selectedElement])

  const handleScreenshotUploaded = (screenshotUrl: string) => {
    setUploadedScreenshots(prev => [...prev, screenshotUrl])
    console.log('📸 Screenshot uploaded and tracked:', screenshotUrl)
  }

  const handleCommentSubmit = async (submittedComment: string, platform: string) => {
    if (!selectedElement) return
    
    console.log('💬 Comment submitted:')
    console.log('Element:', selectedElement.elementInfo)
    console.log('DOM Path:', selectedElement.domPath)
    console.log('Comment:', submittedComment)
    console.log('Platform:', platform)
    console.log('Screenshots to link:', uploadedScreenshots.length)
    if (uploadedScreenshots.length > 0) {
      console.log('Screenshot URLs:', uploadedScreenshots)
    }
    console.log('---')
    
    // Save task to database if user is authenticated
    // Get stored auth token (adjust based on your auth implementation)
    const token = localStorage.getItem('google_token') || sessionStorage.getItem('google_token')
    
    if (token) {
      try {
        const response = await fetch('http://localhost:8000/api/tasks', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
                     body: JSON.stringify({
             comment_text: submittedComment,
             platform: platform,
             priority: 'medium',
             element_info: selectedElement.elementInfo,
             dom_path: selectedElement.domPath,
             page_url: window.location.href,
             screenshot_urls: uploadedScreenshots,
             metadata: {
               timestamp: new Date().toISOString(),
               user_agent: navigator.userAgent
             }
           })
        })

        if (response.ok) {
          const task = await response.json()
          console.log('✅ Task saved to database:', task)
        } else {
          console.error('❌ Failed to save task to database:', response.statusText)
        }
      } catch (error) {
        console.error('❌ Error saving task:', error)
      }
    }
  }

  const handleFormSubmit = (submittedComment: string) => {
    handleCommentSubmit(submittedComment, selectedPlatform)
    setComment('')
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform)
  }

  if (!selectedElement) return null

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



  const platformSelectorStyles = {
    display: 'flex',
    gap: '4px'
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

  const closeButtonStyles = {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
    transition: 'color 0.2s ease'
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
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        <div style={headerStyles}>
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {uploadedScreenshots.length > 0 && (
              <div style={{
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                📸 {uploadedScreenshots.length} screenshot{uploadedScreenshots.length > 1 ? 's' : ''}
              </div>
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
        
        {selectedPlatform === 'github' && (
          <GitHubIssueForm
            selectedElement={selectedElement}
            comment={comment}
            onCommentChange={setComment}
            onSubmit={handleFormSubmit}
            onKeyDown={handleKeyDown}
            onScreenshotUploaded={handleScreenshotUploaded}
          />
        )}
        
        {selectedPlatform === 'slack' && (
          <SlackMessageForm
            selectedElement={selectedElement}
            comment={comment}
            onCommentChange={setComment}
            onSubmit={handleFormSubmit}
            onKeyDown={handleKeyDown}
            onScreenshotUploaded={handleScreenshotUploaded}
          />
        )}
        
        {selectedPlatform === 'jira' && (
          <JiraIssueForm
            selectedElement={selectedElement}
            comment={comment}
            onCommentChange={setComment}
            onSubmit={handleFormSubmit}
            onKeyDown={handleKeyDown}
            onScreenshotUploaded={handleScreenshotUploaded}
          />
        )}
      </div>
    </>
  )
}

export default CommentBubble 