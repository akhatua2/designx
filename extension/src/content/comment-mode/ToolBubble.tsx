import React from 'react'
import type { SelectedRegion } from './CommentModeManager'

interface ToolBubbleProps {
  selectedElement: SelectedRegion | null
  onSave: () => void
}

const ToolBubble: React.FC<ToolBubbleProps> = ({ selectedElement, onSave }) => {
  if (!selectedElement) return null

  // Calculate position based on selection type - position to the right or left
  const getPosition = () => {
    const bubbleWidth = 200
    const spacing = 20 // Space between selected element and bubble
    
    if (selectedElement.type === 'element' && selectedElement.element) {
      const rect = selectedElement.element.getBoundingClientRect()
      const spaceOnRight = window.innerWidth - (rect.right + spacing + bubbleWidth)
      const spaceOnLeft = rect.left - spacing - bubbleWidth
      
      // Prefer right side, fall back to left if not enough space
      if (spaceOnRight >= 0) {
        return {
          top: rect.top + (rect.height / 2) - 50, // Center vertically on element
          left: rect.right + spacing, // Position to the right with spacing
          side: 'right' as const
        }
      } else if (spaceOnLeft >= 0) {
        return {
          top: rect.top + (rect.height / 2) - 50, // Center vertically on element
          left: rect.left - spacing - bubbleWidth, // Position to the left with spacing
          side: 'left' as const
        }
      } else {
        // Fallback: position on right but constrain to viewport
        return {
          top: rect.top + (rect.height / 2) - 50,
          left: Math.max(10, window.innerWidth - bubbleWidth - 20),
          side: 'right' as const
        }
      }
    } else if (selectedElement.type === 'area' && selectedElement.area) {
      const area = selectedElement.area
      const spaceOnRight = window.innerWidth - (area.x + area.width + spacing + bubbleWidth)
      const spaceOnLeft = area.x - spacing - bubbleWidth
      
      // Prefer right side, fall back to left if not enough space
      if (spaceOnRight >= 0) {
        return {
          top: area.y + (area.height / 2) - 50, // Center vertically on area
          left: area.x + area.width + spacing, // Position to the right with spacing
          side: 'right' as const
        }
      } else if (spaceOnLeft >= 0) {
        return {
          top: area.y + (area.height / 2) - 50, // Center vertically on area
          left: area.x - spacing - bubbleWidth, // Position to the left with spacing
          side: 'left' as const
        }
      } else {
        // Fallback: position on right but constrain to viewport
        return {
          top: area.y + (area.height / 2) - 50,
          left: Math.max(10, window.innerWidth - bubbleWidth - 20),
          side: 'right' as const
        }
      }
    }
    return { top: 100, left: 100, side: 'right' as const } // Fallback position
  }

  const position = getPosition()

  const bubbleStyles = {
    position: 'fixed' as const,
    top: `${Math.max(10, Math.min(window.innerHeight - 150, position.top))}px`, // Keep within viewport vertically
    left: `${position.left}px`,
    width: '160px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: 'white',
    padding: '10px',
    zIndex: 10001, // Higher than overlay
    animation: 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
    color: 'white'
  }

  const buttonStyles = {
    width: '100%',
    padding: '8px 0px', // Remove horizontal padding to align with header
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.2s ease'
  }

  const handleSave = () => {
    console.log('💾 Save clicked for:', selectedElement.type)
    onSave()
  }

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(${position.side === 'right' ? '10px' : '-10px'});
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          .tool-button:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        <div style={headerStyles}>
          <div style={titleStyles}>
            Tools
          </div>
        </div>
        
        <div style={{ maxHeight: '280px', overflow: 'auto' }}>
          <button
            className="tool-button"
            onClick={handleSave}
            style={buttonStyles}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
            </svg>
            Save Selection
          </button>
        </div>
      </div>
    </>
  )
}

export default ToolBubble 