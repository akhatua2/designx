import React, { useState, useRef, useEffect } from 'react'
import { Send, X } from 'lucide-react'
import type { SelectedElement } from './CommentModeManager'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleSubmit = () => {
    if (comment.trim()) {
      onSubmit(comment.trim())
      setComment('')
      onClose()
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
    bottom: '72px', // 20px (container bottom) + 44px (pill height) + 8px (gap) = 72px
    right: '20px', // Match the floating pill's right position
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
    justifyContent: 'flex-end'
  }

  const submitButtonStyles = {
    padding: '4px 8px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '10px',
    fontWeight: '500',
    cursor: comment.trim() ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    transition: 'all 0.2s ease',
    backgroundColor: comment.trim() ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    opacity: comment.trim() ? 1 : 0.5
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
          <button
            onClick={handleSubmit}
            disabled={!comment.trim()}
            style={submitButtonStyles}
          >
            <Send size={10} />
            Send
          </button>
        </div>
      </div>
    </>
  )
}

export default CommentBubble 