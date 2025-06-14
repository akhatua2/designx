import React from 'react'
import { ArrowDownToLine, Eye, EyeOff, Paintbrush, Loader2, X } from 'lucide-react'
import type { SelectedRegion } from './CommentModeManager'

interface ToolBubbleProps {
  selectedElement: SelectedRegion | null
  onSave: () => void
  isSaving?: boolean
  onXRay?: () => void
  isXRayActive?: boolean
  onClose?: () => void
}

interface DesignProperties {
  typography: {
    fontFamily: string
    fontSize: string
    fontWeight: string
    lineHeight: string
    letterSpacing: string
    textAlign: string
    color: string
  }
  layout: {
    display: string
    position: string
    width: string
    height: string
    padding: { top: string, right: string, bottom: string, left: string }
    margin: { top: string, right: string, bottom: string, left: string }
    border: { width: string, style: string, color: string, radius: string }
  }
  colors: {
    color: string
    backgroundColor: string
    borderColor: string
  }
}

const ToolBubble: React.FC<ToolBubbleProps> = ({ selectedElement, onSave, isSaving = false, onXRay, isXRayActive = false, onClose }) => {
  if (!selectedElement) return null

  const [isDesignMode, setIsDesignMode] = React.useState(false)
  const [currentFontSize, setCurrentFontSize] = React.useState<string>('')

  // Initialize font size when element changes
  React.useEffect(() => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element as HTMLElement
      const computedStyle = window.getComputedStyle(element)
      const fontSize = computedStyle.fontSize.replace('px', '')
      setCurrentFontSize(fontSize)
    }
  }, [selectedElement])

  // Handle font size changes
  const handleFontSizeChange = (newSize: string) => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return
    
    const element = selectedElement.element as HTMLElement
    const sizeValue = parseInt(newSize)
    
    if (!isNaN(sizeValue) && sizeValue > 0) {
      element.style.fontSize = `${sizeValue}px`
      setCurrentFontSize(newSize)
      console.log('🎨 Font size changed to:', `${sizeValue}px`)
    }
  }

  // Check if element has text content
  const hasTextContent = () => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return false
    const element = selectedElement.element as HTMLElement
    const textContent = element.textContent?.trim()
    return textContent && textContent.length > 0
  }

  // Extract design properties from the selected element
  const getDesignProperties = (): DesignProperties | null => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return null
    
    const element = selectedElement.element as HTMLElement
    const computedStyle = window.getComputedStyle(element)
    
    return {
      typography: {
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight,
        lineHeight: computedStyle.lineHeight,
        letterSpacing: computedStyle.letterSpacing,
        textAlign: computedStyle.textAlign,
        color: computedStyle.color
      },
      layout: {
        display: computedStyle.display,
        position: computedStyle.position,
        width: computedStyle.width,
        height: computedStyle.height,
        padding: {
          top: computedStyle.paddingTop,
          right: computedStyle.paddingRight,
          bottom: computedStyle.paddingBottom,
          left: computedStyle.paddingLeft
        },
        margin: {
          top: computedStyle.marginTop,
          right: computedStyle.marginRight,
          bottom: computedStyle.marginBottom,
          left: computedStyle.marginLeft
        },
        border: {
          width: computedStyle.borderWidth,
          style: computedStyle.borderStyle,
          color: computedStyle.borderColor,
          radius: computedStyle.borderRadius
        }
      },
      colors: {
        color: computedStyle.color,
        backgroundColor: computedStyle.backgroundColor,
        borderColor: computedStyle.borderColor
      }
    }
  }

  const designProperties = getDesignProperties()

  // Helper functions for formatting design properties
  const formatValue = (value: string) => {
    if (!value || value === 'auto' || value === 'normal') return '—'
    return value
  }

  const formatColor = (color: string) => {
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return '—'
    return color
  }

  const formatFontFamily = (fontFamily: string) => {
    if (!fontFamily) return '—'
    // Extract first font name and clean it up
    const firstFont = fontFamily.split(',')[0].replace(/['"]/g, '').trim()
    return firstFont
  }

  // Smart positioning that avoids CommentBubble and stays in viewport
  const getPosition = () => {
    const bubbleWidth = 300
    const bubbleHeight = 500 // Estimated height for collision detection
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
  }

  const position = getPosition()

  const bubbleStyles = {
    position: 'fixed' as const,
    top: `${position.top}px`,
    left: `${position.left}px`,
    width: '300px',
    maxHeight: '500px', // Increased to fit all design properties without scrolling
    borderRadius: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: 'white',
    padding: '10px',
    zIndex: 10001, // Higher than CommentBubble (10000) and overlay
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
    cursor: isSaving ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.2s ease',
    opacity: isSaving ? 0.7 : 1,
    position: 'relative' as const,
    overflow: 'hidden'
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
                position.side === 'right' ? 'translateX(10px)' :
                position.side === 'left' ? 'translateX(-10px)' :
                position.side === 'top' ? 'translateY(-10px)' :
                position.side === 'bottom' ? 'translateY(10px)' :
                'scale(0.95)'
              };
            }
            to {
              opacity: 1;
              transform: ${
                position.side === 'right' || position.side === 'left' ? 'translateX(0)' :
                position.side === 'top' || position.side === 'bottom' ? 'translateY(0)' :
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
          
          /* Custom slider styling */
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #60a5fa;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #60a5fa;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        {/* Header with 3 action icons and close button */}
        <div style={headerStyles}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
        
        {/* Design Properties Content - always visible for elements */}
        {selectedElement.type === 'element' && designProperties && (
          <div style={{ overflow: 'visible' }}>
            {/* Typography Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#9ca3af', 
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Typography
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Font</span>
                  <span style={{ 
                    fontSize: '11px', 
                    color: 'white', 
                    maxWidth: '200px', 
                    textAlign: 'right', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatFontFamily(designProperties.typography.fontFamily)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Size</span>
                  {isDesignMode && hasTextContent() ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                      <input
                        type="range"
                        value={currentFontSize}
                        onChange={(e) => handleFontSizeChange(e.target.value)}
                        min="8"
                        max="72"
                        style={{
                          width: '80px',
                          height: '3px',
                          borderRadius: '2px',
                          background: 'rgba(255, 255, 255, 0.2)',
                          outline: 'none',
                          cursor: 'pointer',
                          appearance: 'none',
                          WebkitAppearance: 'none'
                        }}
                      />
                      <span style={{ fontSize: '11px', color: 'white', minWidth: '30px', textAlign: 'right' }}>
                        {currentFontSize}px
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'white' }}>
                      {formatValue(designProperties.typography.fontSize)}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Weight</span>
                  <span style={{ fontSize: '11px', color: 'white' }}>
                    {formatValue(designProperties.typography.fontWeight)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Line Height</span>
                  <span style={{ fontSize: '11px', color: 'white' }}>
                    {formatValue(designProperties.typography.lineHeight)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Align</span>
                  <span style={{ fontSize: '11px', color: 'white' }}>
                    {formatValue(designProperties.typography.textAlign)}
                  </span>
                </div>
              </div>
            </div>

            {/* Layout Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#9ca3af', 
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Layout
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Display</span>
                  <span style={{ fontSize: '11px', color: 'white' }}>
                    {formatValue(designProperties.layout.display)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Width</span>
                  <span style={{ fontSize: '11px', color: 'white' }}>
                    {formatValue(designProperties.layout.width)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Height</span>
                  <span style={{ fontSize: '11px', color: 'white' }}>
                    {formatValue(designProperties.layout.height)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Padding</span>
                  <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
                    {[
                      formatValue(designProperties.layout.padding.top),
                      formatValue(designProperties.layout.padding.right),
                      formatValue(designProperties.layout.padding.bottom),
                      formatValue(designProperties.layout.padding.left)
                    ].join(' ')}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Margin</span>
                  <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
                    {[
                      formatValue(designProperties.layout.margin.top),
                      formatValue(designProperties.layout.margin.right),
                      formatValue(designProperties.layout.margin.bottom),
                      formatValue(designProperties.layout.margin.left)
                    ].join(' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Colors Section */}
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#9ca3af', 
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Colors
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Text</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '3px', 
                      backgroundColor: designProperties.colors.color,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
                      {formatColor(designProperties.colors.color)}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Background</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '3px', 
                      backgroundColor: designProperties.colors.backgroundColor,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
                      {formatColor(designProperties.colors.backgroundColor)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* For area selections, show a simple message */}
        {selectedElement.type === 'area' && (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#9ca3af', 
            fontSize: '12px' 
          }}>
            Design properties are only available for individual elements
          </div>
        )}
      </div>
    </>
  )
}

export default ToolBubble 