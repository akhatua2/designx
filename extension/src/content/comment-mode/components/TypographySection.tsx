import React from 'react'
import type { SelectedRegion } from '../CommentModeManager'
import { formatValue, getVariableDisplayInfo, formatFontFamily } from '../utils/cssVariables'
import VariableDisplay from './VariableDisplay'

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
}

interface TypographySectionProps {
  selectedElement: SelectedRegion
  designProperties: DesignProperties
  isDesignMode: boolean
  currentFontSize: string
  currentFontWeight: string
  currentTextAlign: string
  hasTextContent: boolean
  onFontSizeChange: (size: string) => void
  onFontWeightChange: (weight: string) => void
  onTextAlignChange: (align: string) => void
}

const TypographySection: React.FC<TypographySectionProps> = ({
  selectedElement,
  designProperties,
  isDesignMode,
  currentFontSize,
  currentFontWeight,
  currentTextAlign,
  hasTextContent,
  onFontSizeChange,
  onFontWeightChange,
  onTextAlignChange
}) => {
  return (
    <div>
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
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Font Family</span>
          <span style={{ fontSize: '11px', color: 'white' }}>
            {formatFontFamily(designProperties.typography.fontFamily)}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Font Size</span>
          {isDesignMode && hasTextContent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
              <input
                type="range"
                value={currentFontSize}
                onChange={(e) => onFontSizeChange(e.target.value)}
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
              <VariableDisplay {...getVariableDisplayInfo(selectedElement.element as HTMLElement, 'font-size', designProperties.typography.fontSize)} />
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Font Weight</span>
          {isDesignMode && hasTextContent ? (
            <select
              value={currentFontWeight}
              onChange={(e) => onFontWeightChange(e.target.value)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                color: 'white',
                fontSize: '11px',
                padding: '2px 6px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="100" style={{ backgroundColor: '#1f2937', color: 'white' }}>Thin</option>
              <option value="200" style={{ backgroundColor: '#1f2937', color: 'white' }}>Extra Light</option>
              <option value="300" style={{ backgroundColor: '#1f2937', color: 'white' }}>Light</option>
              <option value="400" style={{ backgroundColor: '#1f2937', color: 'white' }}>Normal</option>
              <option value="500" style={{ backgroundColor: '#1f2937', color: 'white' }}>Medium</option>
              <option value="600" style={{ backgroundColor: '#1f2937', color: 'white' }}>Semi Bold</option>
              <option value="700" style={{ backgroundColor: '#1f2937', color: 'white' }}>Bold</option>
              <option value="800" style={{ backgroundColor: '#1f2937', color: 'white' }}>Extra Bold</option>
              <option value="900" style={{ backgroundColor: '#1f2937', color: 'white' }}>Black</option>
            </select>
          ) : (
            <span style={{ fontSize: '11px', color: 'white' }}>
              <VariableDisplay {...getVariableDisplayInfo(selectedElement.element as HTMLElement, 'font-weight', designProperties.typography.fontWeight)} />
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Line Height</span>
          <span style={{ fontSize: '11px', color: 'white' }}>
            <VariableDisplay {...getVariableDisplayInfo(selectedElement.element as HTMLElement, 'line-height', designProperties.typography.lineHeight)} />
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Letter Spacing</span>
          <span style={{ fontSize: '11px', color: 'white' }}>
            {formatValue(designProperties.typography.letterSpacing)}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Text Align</span>
          {isDesignMode && hasTextContent ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              {['left', 'center', 'right', 'justify'].map((align) => (
                <button
                  key={align}
                  onClick={() => onTextAlignChange(align)}
                  style={{
                    backgroundColor: currentTextAlign === align ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '3px',
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                  title={`Align ${align}`}
                >
                  {align.charAt(0).toUpperCase()}
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
  )
}

export default TypographySection 