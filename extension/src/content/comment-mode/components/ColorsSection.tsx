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

// Extract styles to prevent recreation on every render
const styles = {
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600' as const,
    color: '#9ca3af',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const
  },
  label: {
    fontSize: '11px',
    color: '#9ca3af'
  },
  colorContainer: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '8px'
  },
  colorSwatch: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    flexShrink: 0
  },
  value: {
    fontSize: '11px',
    color: 'white',
    fontFamily: 'monospace'
  }
} as const

const ColorsSection: React.FC<ColorsSectionProps> = React.memo(({
  selectedElement,
  designProperties,
  isDesignMode,
  currentTextColor,
  currentBackgroundColor,
  hasTextContent,
  onTextColorChange,
  onBackgroundColorChange
}) => {
  // Memoize expensive variable display calculations
  const textColorDisplay = React.useMemo(() => 
    getColorVariableDisplayInfo(selectedElement.element as HTMLElement, 'color', designProperties.colors.color),
    [selectedElement.element, designProperties.colors.color]
  )

  const backgroundColorDisplay = React.useMemo(() => 
    getColorVariableDisplayInfo(selectedElement.element as HTMLElement, 'background-color', designProperties.colors.backgroundColor),
    [selectedElement.element, designProperties.colors.backgroundColor]
  )

  return (
    <div>
      <div style={styles.sectionTitle}>
        Colors
      </div>
      
      <div style={styles.container}>
        <div style={styles.row}>
          <span style={styles.label}>Text</span>
          <div style={styles.colorContainer}>
            {isDesignMode && hasTextContent ? (
              <input
                type="color"
                value={currentTextColor}
                onChange={(e) => onTextColorChange(e.target.value)}
                title="Change text color"
              />
            ) : (
              <div style={{ 
                ...styles.colorSwatch,
                backgroundColor: designProperties.colors.color
              }} />
            )}
            <span style={styles.value}>
              <VariableDisplay {...textColorDisplay} />
            </span>
          </div>
        </div>
        
        <div style={styles.row}>
          <span style={styles.label}>Background</span>
          <div style={styles.colorContainer}>
            {isDesignMode ? (
              <input
                type="color"
                value={currentBackgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                title="Change background color"
              />
            ) : (
              <div style={{ 
                ...styles.colorSwatch,
                backgroundColor: designProperties.colors.backgroundColor
              }} />
            )}
            <span style={styles.value}>
              <VariableDisplay {...backgroundColorDisplay} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

ColorsSection.displayName = 'ColorsSection'

export default ColorsSection 