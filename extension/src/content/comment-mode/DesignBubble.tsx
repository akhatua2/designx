import React from 'react'
import type { SelectedRegion } from './CommentModeManager'

interface DesignBubbleProps {
  selectedElement: SelectedRegion | null
  isVisible: boolean
  onClose: () => void
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

const DesignBubble: React.FC<DesignBubbleProps> = ({ selectedElement, isVisible, onClose }) => {
  if (!isVisible || !selectedElement || selectedElement.type !== 'element') return null

  // Extract design properties from the selected element
  const getDesignProperties = (): DesignProperties | null => {
    if (!selectedElement.element) return null
    
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
  if (!designProperties) return null

  // Calculate position - position to the right of the element with some spacing
  const getPosition = () => {
    const bubbleWidth = 320
    const spacing = 20
    
    if (!selectedElement.element) return { top: 100, left: 100, side: 'right' as const }
    
    const rect = selectedElement.element.getBoundingClientRect()
    const spaceOnRight = window.innerWidth - (rect.right + spacing + bubbleWidth)
    const spaceOnLeft = rect.left - spacing - bubbleWidth
    
    // Prefer right side, fall back to left if not enough space
    if (spaceOnRight >= 0) {
      return {
        top: rect.top,
        left: rect.right + spacing,
        side: 'right' as const
      }
    } else if (spaceOnLeft >= 0) {
      return {
        top: rect.top,
        left: rect.left - spacing - bubbleWidth,
        side: 'left' as const
      }
    } else {
      // Fallback: position on right but constrain to viewport
      return {
        top: rect.top,
        left: Math.max(10, window.innerWidth - bubbleWidth - 20),
        side: 'right' as const
      }
    }
  }

  const position = getPosition()

  // Helper functions
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

  const bubbleStyles = {
    position: 'fixed' as const,
    top: `${Math.max(10, Math.min(window.innerHeight - 500, position.top))}px`,
    left: `${position.left}px`,
    width: '300px',
    maxHeight: '480px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: 'white',
    padding: '16px',
    zIndex: 10002, // Higher than ToolBubble
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
    marginBottom: '16px',
    flexShrink: 0
  }

  const titleStyles = {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white'
  }

  const closeButtonStyles = {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease'
  }

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(${position.side === 'right' ? '20px' : '-20px'});
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          .design-close-button:hover {
            color: white !important;
          }
        `}
      </style>
      <div style={bubbleStyles} data-floating-icon="true">
        <div style={headerStyles}>
          <div style={titleStyles}>
            Design
          </div>
          <button
            className="design-close-button"
            onClick={onClose}
            style={closeButtonStyles}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div style={{ overflow: 'auto', flex: 1 }}>
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
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Font family</span>
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
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Font size</span>
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {formatValue(designProperties.typography.fontSize)}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Font weight</span>
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {formatValue(designProperties.typography.fontWeight)}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Line height</span>
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {formatValue(designProperties.typography.lineHeight)}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Letter spacing</span>
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {formatValue(designProperties.typography.letterSpacing)}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Text align</span>
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
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Position</span>
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {formatValue(designProperties.layout.position)}
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
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Border radius</span>
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {formatValue(designProperties.layout.border.radius)}
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
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Text color</span>
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
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Border color</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '3px', 
                    backgroundColor: designProperties.colors.borderColor,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    flexShrink: 0
                  }} />
                  <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
                    {formatColor(designProperties.colors.borderColor)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DesignBubble 