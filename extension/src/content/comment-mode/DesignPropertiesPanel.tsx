import React from 'react'
import type { SelectedRegion } from './CommentModeManager'

interface DesignChange {
  property: string
  oldValue: string
  newValue: string
  timestamp: string
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

interface DesignPropertiesPanelProps {
  selectedElement: SelectedRegion
  isDesignMode: boolean
  onDesignChange?: (changes: DesignChange[]) => void
}

const DesignPropertiesPanel: React.FC<DesignPropertiesPanelProps> = ({ 
  selectedElement, 
  isDesignMode,
  onDesignChange
}) => {
  const [currentFontSize, setCurrentFontSize] = React.useState<string>('')
  const [currentFontWeight, setCurrentFontWeight] = React.useState<string>('')
  const [currentTextAlign, setCurrentTextAlign] = React.useState<string>('')
  const [currentTextColor, setCurrentTextColor] = React.useState<string>('')
  const [currentBackgroundColor, setCurrentBackgroundColor] = React.useState<string>('')
  const [currentPadding, setCurrentPadding] = React.useState<string>('')
  const [currentBorderRadius, setCurrentBorderRadius] = React.useState<string>('')
  const [designChanges, setDesignChanges] = React.useState<DesignChange[]>([])

  // Initialize properties when element changes
  React.useEffect(() => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element as HTMLElement
      const computedStyle = window.getComputedStyle(element)
      
      setCurrentFontSize(computedStyle.fontSize.replace('px', ''))
      setCurrentFontWeight(computedStyle.fontWeight)
      setCurrentTextAlign(computedStyle.textAlign)
      setCurrentTextColor(rgbToHex(computedStyle.color))
      setCurrentBackgroundColor(rgbToHex(computedStyle.backgroundColor))
      setCurrentPadding(computedStyle.paddingTop.replace('px', ''))
      setCurrentBorderRadius(computedStyle.borderRadius.replace('px', ''))
      
      // Reset design changes when element changes
      setDesignChanges([])
    }
  }, [selectedElement])

  // Pass design changes to parent when they change
  React.useEffect(() => {
    if (onDesignChange && designChanges.length > 0) {
      onDesignChange(designChanges)
    }
  }, [designChanges, onDesignChange])

  // Helper function to log design changes
  const logDesignChange = (property: string, oldValue: string, newValue: string) => {
    const change: DesignChange = {
      property,
      oldValue,
      newValue,
      timestamp: new Date().toISOString()
    }
    
    setDesignChanges(prev => [...prev, change])
    console.log('🎨 Design change logged:', change)
  }

  // Convert RGB to Hex for color inputs
  const rgbToHex = (rgb: string): string => {
    if (rgb.startsWith('#')) return rgb
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#000000'
    
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
    if (match) {
      const [, r, g, b] = match
      return '#' + [r, g, b].map(x => {
        const hex = parseInt(x, 10).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }).join('')
    }
    
    const rgbaMatch = rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)$/)
    if (rgbaMatch) {
      const [, r, g, b] = rgbaMatch
      return '#' + [r, g, b].map(x => {
        const hex = parseInt(x, 10).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }).join('')
    }
    
    return '#000000'
  }

  // Handle property changes
  const handleFontSizeChange = (newSize: string) => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return
    
    const element = selectedElement.element as HTMLElement
    const sizeValue = parseInt(newSize)
    
    if (!isNaN(sizeValue) && sizeValue > 0) {
      const oldValue = element.style.fontSize || window.getComputedStyle(element).fontSize
      element.style.fontSize = `${sizeValue}px`
      setCurrentFontSize(newSize)
      logDesignChange('Font Size', oldValue, `${sizeValue}px`)
      console.log('🎨 Font size changed to:', `${sizeValue}px`)
    }
  }

  const handleFontWeightChange = (newWeight: string) => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return
    
    const element = selectedElement.element as HTMLElement
    const oldValue = element.style.fontWeight || window.getComputedStyle(element).fontWeight
    element.style.fontWeight = newWeight
    setCurrentFontWeight(newWeight)
    logDesignChange('Font Weight', oldValue, newWeight)
    console.log('🎨 Font weight changed to:', newWeight)
  }

  const handleTextAlignChange = (newAlign: string) => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return
    
    const element = selectedElement.element as HTMLElement
    const oldValue = element.style.textAlign || window.getComputedStyle(element).textAlign
    element.style.textAlign = newAlign
    setCurrentTextAlign(newAlign)
    logDesignChange('Text Alignment', oldValue, newAlign)
    console.log('🎨 Text align changed to:', newAlign)
  }

  const handleTextColorChange = (newColor: string) => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return
    
    const element = selectedElement.element as HTMLElement
    const oldValue = element.style.color || rgbToHex(window.getComputedStyle(element).color)
    element.style.color = newColor
    setCurrentTextColor(newColor)
    logDesignChange('Text Color', oldValue, newColor)
    console.log('🎨 Text color changed to:', newColor)
  }

  const handleBackgroundColorChange = (newColor: string) => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return
    
    const element = selectedElement.element as HTMLElement
    const oldValue = element.style.backgroundColor || rgbToHex(window.getComputedStyle(element).backgroundColor)
    element.style.backgroundColor = newColor
    setCurrentBackgroundColor(newColor)
    logDesignChange('Background Color', oldValue, newColor)
    console.log('🎨 Background color changed to:', newColor)
  }

  const handlePaddingChange = (newPadding: string) => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return
    
    const element = selectedElement.element as HTMLElement
    const paddingValue = parseInt(newPadding)
    
    if (!isNaN(paddingValue) && paddingValue >= 0) {
      const oldValue = element.style.padding || window.getComputedStyle(element).paddingTop
      element.style.padding = `${paddingValue}px`
      setCurrentPadding(newPadding)
      logDesignChange('Padding', oldValue, `${paddingValue}px`)
      console.log('🎨 Padding changed to:', `${paddingValue}px`)
    }
  }

  const handleBorderRadiusChange = (newRadius: string) => {
    if (selectedElement.type !== 'element' || !selectedElement.element) return
    
    const element = selectedElement.element as HTMLElement
    const radiusValue = parseInt(newRadius)
    
    if (!isNaN(radiusValue) && radiusValue >= 0) {
      const oldValue = element.style.borderRadius || window.getComputedStyle(element).borderRadius
      element.style.borderRadius = `${radiusValue}px`
      setCurrentBorderRadius(newRadius)
      logDesignChange('Border Radius', oldValue, `${radiusValue}px`)
      console.log('🎨 Border radius changed to:', `${radiusValue}px`)
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

  const designProperties = getDesignProperties()

  if (selectedElement.type === 'area') {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#9ca3af', 
        fontSize: '12px' 
      }}>
        Design properties are only available for individual elements
      </div>
    )
  }

  if (!designProperties) return null

  // Text alignment options
  const textAlignOptions = [
    { value: 'left', label: 'L', title: 'Left' },
    { value: 'center', label: 'C', title: 'Center' },
    { value: 'right', label: 'R', title: 'Right' },
    { value: 'justify', label: 'J', title: 'Justify' }
  ]

  return (
    <>
      <style>
        {`
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
          
          /* Custom color input styling */
          input[type="color"] {
            width: 24px;
            height: 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background: none;
          }
          
          input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
          }
          
          input[type="color"]::-webkit-color-swatch {
            border: none;
            border-radius: 3px;
          }
          
          /* Alignment button styling */
          .align-button {
            width: 24px;
            height: 24px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: white;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          
          .align-button:hover {
            background: rgba(255, 255, 255, 0.2);
          }
          
          .align-button.active {
            background: #60a5fa;
            border-color: #60a5fa;
          }
        `}
      </style>
      <div style={{ overflow: 'visible' }}>
        {/* Show design changes summary if any changes were made */}
        {designChanges.length > 0 && (
          <div style={{
            marginBottom: '16px',
            padding: '8px',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: '600',
              color: '#60a5fa',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Design Changes ({designChanges.length})
            </div>
            <div style={{
              fontSize: '9px',
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: '1.3'
            }}>
              {designChanges.slice(-3).map((change, index) => (
                <div key={index}>
                  • {change.property}: {change.oldValue} → {change.newValue}
                </div>
              ))}
              {designChanges.length > 3 && (
                <div style={{ fontStyle: 'italic', opacity: 0.8 }}>
                  ... and {designChanges.length - 3} more changes
                </div>
              )}
            </div>
          </div>
        )}

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
              {isDesignMode && hasTextContent() ? (
                <select
                  value={currentFontWeight}
                  onChange={(e) => handleFontWeightChange(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '11px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="100" style={{ background: '#1f2937', color: 'white' }}>Thin</option>
                  <option value="200" style={{ background: '#1f2937', color: 'white' }}>Light</option>
                  <option value="300" style={{ background: '#1f2937', color: 'white' }}>Light</option>
                  <option value="400" style={{ background: '#1f2937', color: 'white' }}>Normal</option>
                  <option value="500" style={{ background: '#1f2937', color: 'white' }}>Medium</option>
                  <option value="600" style={{ background: '#1f2937', color: 'white' }}>Semibold</option>
                  <option value="700" style={{ background: '#1f2937', color: 'white' }}>Bold</option>
                  <option value="800" style={{ background: '#1f2937', color: 'white' }}>Extrabold</option>
                  <option value="900" style={{ background: '#1f2937', color: 'white' }}>Black</option>
                </select>
              ) : (
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {formatValue(designProperties.typography.fontWeight)}
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Line Height</span>
              <span style={{ fontSize: '11px', color: 'white' }}>
                {formatValue(designProperties.typography.lineHeight)}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Align</span>
              {isDesignMode && hasTextContent() ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  {textAlignOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`align-button ${currentTextAlign === option.value ? 'active' : ''}`}
                      onClick={() => handleTextAlignChange(option.value)}
                      title={option.title}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {formatValue(designProperties.typography.textAlign)}
                </span>
              )}
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
              {isDesignMode ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                  <input
                    type="range"
                    value={currentPadding}
                    onChange={(e) => handlePaddingChange(e.target.value)}
                    min="0"
                    max="50"
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
                    {currentPadding}px
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
                  {[
                    formatValue(designProperties.layout.padding.top),
                    formatValue(designProperties.layout.padding.right),
                    formatValue(designProperties.layout.padding.bottom),
                    formatValue(designProperties.layout.padding.left)
                  ].join(' ')}
                </span>
              )}
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
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Radius</span>
              {isDesignMode ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                  <input
                    type="range"
                    value={currentBorderRadius}
                    onChange={(e) => handleBorderRadiusChange(e.target.value)}
                    min="0"
                    max="50"
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
                    {currentBorderRadius}px
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {formatValue(designProperties.layout.border.radius)}
                </span>
              )}
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
                {isDesignMode && hasTextContent() ? (
                  <input
                    type="color"
                    value={currentTextColor}
                    onChange={(e) => handleTextColorChange(e.target.value)}
                    title="Change text color"
                  />
                ) : (
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '3px', 
                    backgroundColor: designProperties.colors.color,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    flexShrink: 0
                  }} />
                )}
                <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
                  {formatColor(designProperties.colors.color)}
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Background</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isDesignMode ? (
                  <input
                    type="color"
                    value={currentBackgroundColor}
                    onChange={(e) => handleBackgroundColorChange(e.target.value)}
                    title="Change background color"
                  />
                ) : (
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '3px', 
                    backgroundColor: designProperties.colors.backgroundColor,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    flexShrink: 0
                  }} />
                )}
                <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
                  {formatColor(designProperties.colors.backgroundColor)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DesignPropertiesPanel 