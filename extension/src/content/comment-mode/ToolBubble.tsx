import React from 'react'
import { ArrowDownToLine, Eye, EyeOff, Paintbrush, Loader2, X, GripVertical, Minus, Plus } from 'lucide-react'
import type { SelectedRegion } from './CommentModeManager'
import type { DesignChange } from './hooks/useDesignChanges'
import DesignPropertiesPanel from './DesignPropertiesPanel'

interface ToolBubbleProps {
  selectedElement: SelectedRegion | null
  onSave: () => void
  isSaving?: boolean
  onXRay?: () => void
  isXRayActive?: boolean
  onClose?: () => void
  onDesignChange?: (changes: DesignChange[]) => void
}

const ToolBubble: React.FC<ToolBubbleProps> = ({ selectedElement, onSave, isSaving = false, onXRay, isXRayActive = false, onClose, onDesignChange }) => {
  if (!selectedElement) return null

  const [isDesignMode, setIsDesignMode] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [isMinimized, setIsMinimized] = React.useState(false)

  const handleDesignChanges = (changes: DesignChange[]) => {
    console.log('🔄 Design changes received in ToolBubble:', changes)
    if (onDesignChange) {
      onDesignChange(changes)
    }
  }

  // Smart positioning that avoids CommentBubble and stays in viewport
  const getPosition = React.useCallback(() => {
    const bubbleWidth = 300
    const bubbleHeight = 500 // Use full height for collision detection, regardless of minimize state
    const spacing = 20
    const viewportPadding = 10
    
    // CommentBubble position (fixed at bottom-right)
    const commentBubbleRect = {
      left: window.innerWidth - 360 - 20, // 360px width + 20px right margin
      top: window.innerHeight - 400 - 72, // Estimated height + 72px bottom margin
      width: 360,
      height: 400
    }
    
    const getElementRect = () => {
      if (selectedElement.type === 'element' && selectedElement.element) {
        return selectedElement.element.getBoundingClientRect()
      } else if (selectedElement.type === 'area' && selectedElement.area) {
        const area = selectedElement.area
        return { left: area.x, top: area.y, right: area.x + area.width, bottom: area.y + area.height, width: area.width, height: area.height }
      }
      return { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 }
    }
    
    const elementRect = getElementRect()
    
    // Check if two rectangles overlap
    const rectsOverlap = (rect1: any, rect2: any) => {
      return !(rect1.right < rect2.left || 
               rect1.left > rect2.right || 
               rect1.bottom < rect2.top || 
               rect1.top > rect2.bottom)
    }
    
    // Try different positions in order of preference
    const positions = [
      // Right side of element
      {
        top: elementRect.top + (elementRect.height / 2) - (bubbleHeight / 2),
        left: elementRect.right + spacing,
        side: 'right' as const
      },
      // Left side of element
      {
        top: elementRect.top + (elementRect.height / 2) - (bubbleHeight / 2),
        left: elementRect.left - spacing - bubbleWidth,
        side: 'left' as const
      },
      // Above element
      {
        top: elementRect.top - spacing - bubbleHeight,
        left: elementRect.left + (elementRect.width / 2) - (bubbleWidth / 2),
        side: 'top' as const
      },
      // Below element
      {
        top: elementRect.bottom + spacing,
        left: elementRect.left + (elementRect.width / 2) - (bubbleWidth / 2),
        side: 'bottom' as const
      }
    ]
    
    // Find the first position that fits in viewport and doesn't overlap CommentBubble
    for (const pos of positions) {
      // Check viewport bounds
      const fitsInViewport = 
        pos.left >= viewportPadding &&
        pos.left + bubbleWidth <= window.innerWidth - viewportPadding &&
        pos.top >= viewportPadding &&
        pos.top + bubbleHeight <= window.innerHeight - viewportPadding
      
      if (fitsInViewport) {
        // Check if it overlaps with CommentBubble
        const toolBubbleRect = {
          left: pos.left,
          top: pos.top,
          right: pos.left + bubbleWidth,
          bottom: pos.top + bubbleHeight
        }
        
        if (!rectsOverlap(toolBubbleRect, commentBubbleRect)) {
          return pos
        }
      }
    }
    
    // Fallback: position in top-left area, away from CommentBubble
    return {
      top: viewportPadding,
      left: viewportPadding,
      side: 'fallback' as const
    }
  }, [selectedElement])

  // Memoize position to prevent recalculation during design changes
  const basePosition = React.useMemo(() => getPosition(), [getPosition])
  
  // Apply drag offset to base position
  const position = {
    ...basePosition,
    top: basePosition.top + dragOffset.y,
    left: basePosition.left + dragOffset.x
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent text selection
    e.stopPropagation() // Prevent other handlers
    setIsDragging(true)
    
    const startX = e.clientX - dragOffset.x
    const startY = e.clientY - dragOffset.y
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      setDragOffset({
        x: e.clientX - startX,
        y: e.clientY - startY
      })
    }
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault()
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const bubbleStyles = {
    position: 'fixed' as const,
    top: `${position.top}px`,
    left: `${position.left}px`,
    width: '300px',
    maxHeight: isMinimized ? '60px' : '500px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: 'white',
    padding: isMinimized ? '10px 10px 0px 10px' : '10px',
    zIndex: 10001, // Higher than CommentBubble (10000) and overlay
    animation: isDragging ? 'none' : 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    pointerEvents: 'auto' as const,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isMinimized ? 'scale(0.98)' : 'scale(1)',
    ...(isDragging && { userSelect: 'none' as const }) // Prevent text selection while dragging
  }

  const headerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isMinimized ? '0' : '8px',
    flexShrink: 0
  }

  const dragHandleStyles = {
    cursor: isDragging ? 'grabbing' : 'grab',
    padding: '4px',
    color: 'rgba(255, 255, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '4px',
    transition: 'color 0.2s ease',
    userSelect: 'none' as const // Prevent text selection
  }

  const handleSave = () => {
    if (isSaving) return // Prevent multiple clicks while saving
    console.log('💾 Save clicked for:', selectedElement.type)
    onSave()
  }

  const handleXRay = () => {
    console.log('🔍 X-ray clicked for:', selectedElement.type)
    if (onXRay) {
      onXRay()
    }
  }

  const handleDesign = () => {
    console.log('🎨 Design mode toggled:', !isDesignMode)
    setIsDesignMode(!isDesignMode)
  }

  const handleMinimize = () => {
    console.log('📦 Minimize toggled:', !isMinimized)
    setIsMinimized(!isMinimized)
  }

  const handleClose = () => {
    console.log('❌ Close selection clicked')
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: ${
                basePosition.side === 'right' ? 'translateX(10px)' :
                basePosition.side === 'left' ? 'translateX(-10px)' :
                basePosition.side === 'top' ? 'translateY(-10px)' :
                basePosition.side === 'bottom' ? 'translateY(10px)' :
                'scale(0.95)'
              };
            }
            to {
              opacity: 1;
              transform: ${
                basePosition.side === 'right' || basePosition.side === 'left' ? 'translateX(0)' :
                basePosition.side === 'top' || basePosition.side === 'bottom' ? 'translateY(0)' :
                'scale(1)'
              };
            }
          }
          
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          
          .tool-button:hover:not(.saving) {
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
          
          .shimmer-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.2),
              transparent
            );
            animation: shimmer 1.5s infinite;
            pointer-events: none;
          }
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        {/* Header with drag handle, action icons and close button */}
        <div style={headerStyles}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Drag Handle */}
            <div
              onMouseDown={handleMouseDown}
              style={dragHandleStyles}
              title="Drag to move"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
              }}
            >
              <GripVertical size={14} />
            </div>

            {/* Save Icon */}
            <button
              className={`tool-button ${isSaving ? 'saving' : ''}`}
              onClick={handleSave}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: isSaving ? 'default' : 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease',
                opacity: isSaving ? 0.7 : 1,
                position: 'relative' as const,
                overflow: 'hidden'
              }}
              disabled={isSaving}
              title={isSaving ? 'Saving...' : 'Save'}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" fill="none" /> : <ArrowDownToLine size={16} fill="none" />}
            </button>

            {/* X-ray Icon */}
            {onXRay && (
              <button
                className="tool-button"
                onClick={handleXRay}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isXRayActive ? '#60a5fa' : 'white',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: isXRayActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                }}
                title={isXRayActive ? 'Hide X-ray' : 'Show X-ray'}
              >
                {isXRayActive ? <Eye size={16} fill="none" /> : <EyeOff size={16} fill="none" />}
              </button>
            )}

            {/* Design Icon */}
            <button
              className="tool-button"
              onClick={handleDesign}
              style={{
                background: 'none',
                border: 'none',
                color: isDesignMode ? '#60a5fa' : '#9ca3af',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease',
                backgroundColor: isDesignMode ? 'rgba(96, 165, 250, 0.2)' : 'transparent'
              }}
              title={isDesignMode ? 'Exit design mode' : 'Enter design mode'}
            >
              <Paintbrush size={16} fill="none" />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Minimize/Maximize Button */}
            <button
              className="tool-button"
              onClick={handleMinimize}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title={isMinimized ? 'Expand' : 'Minimize'}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {isMinimized ? <Plus size={14} fill="none" /> : <Minus size={14} fill="none" />}
            </button>

            {/* Close Button */}
            <button
              className="tool-button"
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Close selection"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <X size={14} fill="none" />
            </button>
          </div>
        </div>
        
        {/* Design Properties Panel - Always render but animate visibility */}
        <div style={{
          opacity: isMinimized ? 0 : 1,
          transform: isMinimized ? 'translateY(-10px)' : 'translateY(0)',
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: isMinimized ? 'none' : 'auto',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column' as const
        }}>
          <DesignPropertiesPanel 
            selectedElement={selectedElement}
            isDesignMode={isDesignMode}
            onDesignChange={handleDesignChanges}
          />
        </div>
      </div>
    </>
  )
}

export default ToolBubble 