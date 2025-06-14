import React from 'react'
import type { SelectedRegion } from '../CommentModeManager'
import { getColorVariableDisplayInfo } from '../utils/cssVariables'
import VariableDisplay from './VariableDisplay'

interface DesignProperties {
  colors: {
    color: string
    backgroundColor: string
    borderColor: string
  }
}

interface ColorsSectionProps {
  selectedElement: SelectedRegion
  designProperties: DesignProperties
  isDesignMode: boolean
  currentTextColor: string
  currentBackgroundColor: string
  hasTextContent: boolean
  onTextColorChange: (color: string) => void
  onBackgroundColorChange: (color: string) => void
}

const ColorsSection: React.FC<ColorsSectionProps> = ({
  selectedElement,
  designProperties,
  isDesignMode,
  currentTextColor,
  currentBackgroundColor,
  hasTextContent,
  onTextColorChange,
  onBackgroundColorChange
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
        Colors
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Text</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDesignMode && hasTextContent ? (
              <input
                type="color"
                value={currentTextColor}
                onChange={(e) => onTextColorChange(e.target.value)}
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
              <VariableDisplay {...getColorVariableDisplayInfo(selectedElement.element as HTMLElement, 'color', designProperties.colors.color)} />
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
                onChange={(e) => onBackgroundColorChange(e.target.value)}
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
              <VariableDisplay {...getColorVariableDisplayInfo(selectedElement.element as HTMLElement, 'background-color', designProperties.colors.backgroundColor)} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ColorsSection 