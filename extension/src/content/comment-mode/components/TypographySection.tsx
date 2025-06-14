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
  value: {
    fontSize: '11px',
    color: 'white'
  },
  rangeContainer: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '8px',
    flex: 1,
    justifyContent: 'flex-end' as const
  },
  rangeInput: {
    width: '80px',
    height: '3px',
    borderRadius: '2px',
    background: 'rgba(255, 255, 255, 0.2)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const
  },
  rangeValue: {
    fontSize: '11px',
    color: 'white',
    minWidth: '30px',
    textAlign: 'right' as const
  },
  select: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    color: 'white',
    fontSize: '11px',
    padding: '2px 6px',
    cursor: 'pointer',
    outline: 'none'
  },
  option: {
    backgroundColor: '#1f2937',
    color: 'white'
  },
  buttonContainer: {
    display: 'flex',
    gap: '4px'
  },
  alignButton: {
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '3px',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    cursor: 'pointer',
    outline: 'none'
  }
} as const

// Memoized font weight options to prevent recreation
const fontWeightOptions = [
  { value: '100', label: 'Thin' },
  { value: '200', label: 'Extra Light' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' }
] as const

const textAlignOptions = ['left', 'center', 'right', 'justify'] as const

const TypographySection: React.FC<TypographySectionProps> = React.memo(({
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
  // Memoize expensive variable display calculations
  const fontSizeDisplay = React.useMemo(() => 
    getVariableDisplayInfo(selectedElement.element as HTMLElement, 'font-size', designProperties.typography.fontSize),
    [selectedElement.element, designProperties.typography.fontSize]
  )

  const fontWeightDisplay = React.useMemo(() => 
    getVariableDisplayInfo(selectedElement.element as HTMLElement, 'font-weight', designProperties.typography.fontWeight),
    [selectedElement.element, designProperties.typography.fontWeight]
  )

  const lineHeightDisplay = React.useMemo(() => 
    getVariableDisplayInfo(selectedElement.element as HTMLElement, 'line-height', designProperties.typography.lineHeight),
    [selectedElement.element, designProperties.typography.lineHeight]
  )

  return (
    <div>
      <div style={styles.sectionTitle}>
        Typography
      </div>
      
      <div style={styles.container}>
        <div style={styles.row}>
          <span style={styles.label}>Font Family</span>
          <span style={styles.value}>
            {formatFontFamily(designProperties.typography.fontFamily)}
          </span>
        </div>
        
        <div style={styles.row}>
          <span style={styles.label}>Font Size</span>
          {isDesignMode && hasTextContent ? (
            <div style={styles.rangeContainer}>
              <input
                type="range"
                value={currentFontSize}
                onChange={(e) => onFontSizeChange(e.target.value)}
                min="8"
                max="72"
                style={styles.rangeInput}
              />
              <span style={styles.rangeValue}>
                {currentFontSize}px
              </span>
            </div>
          ) : (
            <span style={styles.value}>
              <VariableDisplay {...fontSizeDisplay} />
            </span>
          )}
        </div>
        
        <div style={styles.row}>
          <span style={styles.label}>Font Weight</span>
          {isDesignMode && hasTextContent ? (
            <select
              value={currentFontWeight}
              onChange={(e) => onFontWeightChange(e.target.value)}
              style={styles.select}
            >
              {fontWeightOptions.map(({ value, label }) => (
                <option key={value} value={value} style={styles.option}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <span style={styles.value}>
              <VariableDisplay {...fontWeightDisplay} />
            </span>
          )}
        </div>
        
        <div style={styles.row}>
          <span style={styles.label}>Line Height</span>
          <span style={styles.value}>
            <VariableDisplay {...lineHeightDisplay} />
          </span>
        </div>
        
        <div style={styles.row}>
          <span style={styles.label}>Letter Spacing</span>
          <span style={styles.value}>
            {formatValue(designProperties.typography.letterSpacing)}
          </span>
        </div>
        
        <div style={styles.row}>
          <span style={styles.label}>Text Align</span>
          {isDesignMode && hasTextContent ? (
            <div style={styles.buttonContainer}>
              {textAlignOptions.map((align) => (
                <button
                  key={align}
                  onClick={() => onTextAlignChange(align)}
                  style={{
                    ...styles.alignButton,
                    backgroundColor: currentTextAlign === align ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255, 255, 255, 0.1)'
                  }}
                  title={`Align ${align}`}
                >
                  {align.charAt(0).toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <span style={styles.value}>
              {formatValue(designProperties.typography.textAlign)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

TypographySection.displayName = 'TypographySection'

export default TypographySection 