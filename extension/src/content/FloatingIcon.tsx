import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Edit3, Github } from 'lucide-react'
import { editModeManager } from './edit-mode'
import { commentModeManager, type SelectedElement, CommentBubble } from './comment-mode'

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
  const selectedIconRef = useRef<string | null>(null)

  // Keep ref in sync with state
  selectedIconRef.current = selectedIcon

  // Set up mode state synchronization and cleanup on unmount
  useEffect(() => {
    // Register callback to sync UI state with edit mode state
    editModeManager.onStateChange((isActive) => {
      if (isActive) {
        // Deactivate comment mode if edit mode is activated
        commentModeManager.deactivate()
        setSelectedIcon('edit')
        setSelectedElement(null) // Clear comment bubble
      } else if (selectedIconRef.current === 'edit') {
        setSelectedIcon(null)
      }
    })

    // Register callback to sync UI state with comment mode state
    commentModeManager.onStateChange((isActive) => {
      if (isActive) {
        // Deactivate edit mode if comment mode is activated
        editModeManager.deactivate()
        setSelectedIcon('comment')
      } else if (selectedIconRef.current === 'comment') {
        setSelectedIcon(null)
        setSelectedElement(null) // Clear comment bubble when comment mode deactivates
      }
    })

    // Register callback for element selection in comment mode
    commentModeManager.onElementSelected((elementData) => {
      setSelectedElement(elementData)
    })

    return () => {
      editModeManager.cleanup()
      commentModeManager.cleanup()
    }
  }, []) // Remove selectedIcon dependency

  const handleGitHub = () => {
    console.log('Github feature activated!')
    // Deactivate other modes when switching to GitHub
    editModeManager.deactivate()
    commentModeManager.deactivate()
    setSelectedElement(null)
    setSelectedIcon(selectedIcon === 'github' ? null : 'github')
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

  return (
    <>
      <CommentBubble
        selectedElement={selectedElement}
        onClose={handleCommentClose}
        onSubmit={handleCommentSubmit}
      />
      
      <div 
        style={styles.menuButton}
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