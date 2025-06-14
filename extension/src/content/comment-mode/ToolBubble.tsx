import React from 'react'
import { ArrowDownToLine, Eye, EyeOff, Paintbrush, Loader2 } from 'lucide-react'
import type { SelectedRegion } from './CommentModeManager'

interface ToolBubbleProps {
  selectedElement: SelectedRegion | null
  onSave: () => void
  isSaving?: boolean
  onXRay?: () => void
  isXRayActive?: boolean
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

const ToolBubble: React.FC<ToolBubbleProps> = ({ selectedElement, onSave, isSaving = false, onXRay, isXRayActive = false }) => {
  if (!selectedElement) return null

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

  // Calculate position based on selection type - position to the right or left
  const getPosition = () => {
    const bubbleWidth = 320 // Wider to accommodate design properties
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
    top: `${Math.max(10, Math.min(window.innerHeight - 400, position.top))}px`, // Keep within viewport vertically
    left: `${position.left}px`,
    width: '300px',
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
    console.log('🎨 Design icon clicked (placeholder)')
    // This is just a placeholder for now
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
        {/* Header with 3 action icons */}
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

            {/* Design Icon (placeholder) */}
            <button
              className="tool-button"
              onClick={handleDesign}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease'
              }}
              title="Design (placeholder)"
            >
              <Paintbrush size={16} fill="none" />
            </button>
          </div>
        </div>
        
        {/* Design Properties Content - always visible for elements */}
        {selectedElement.type === 'element' && designProperties && (
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
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
                  <span style={{ fontSize: '11px', color: 'white' }}>
                    {formatValue(designProperties.typography.fontSize)}
                  </span>
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