import React from 'react'
import type { SelectedRegion } from '../CommentModeManager'
import { formatValue, getVariableDisplayInfo, getCSSVariableInfo } from '../utils/cssVariables'
import VariableDisplay from './VariableDisplay'

interface DesignProperties {
  layout: {
    display: string
    position: string
    width: string
    height: string
    padding: { top: string, right: string, bottom: string, left: string }
    margin: { top: string, right: string, bottom: string, left: string }
    border: { width: string, style: string, color: string, radius: string }
  }
}

interface LayoutSectionProps {
  selectedElement: SelectedRegion
  designProperties: DesignProperties
  isDesignMode: boolean
  currentPadding: string
  currentBorderRadius: string
  onPaddingChange: (padding: string) => void
  onBorderRadiusChange: (radius: string) => void
}

const LayoutSection: React.FC<LayoutSectionProps> = ({
  selectedElement,
  designProperties,
  isDesignMode,
  currentPadding,
  currentBorderRadius,
  onPaddingChange,
  onBorderRadiusChange
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
        Layout
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Display</span>
          <span style={{ fontSize: '11px', color: 'white' }}>
            <VariableDisplay {...getVariableDisplayInfo(selectedElement.element as HTMLElement, 'display', designProperties.layout.display)} />
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Width</span>
          <span style={{ fontSize: '11px', color: 'white' }}>
            <VariableDisplay {...getVariableDisplayInfo(selectedElement.element as HTMLElement, 'width', designProperties.layout.width)} />
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Height</span>
          <span style={{ fontSize: '11px', color: 'white' }}>
            <VariableDisplay {...getVariableDisplayInfo(selectedElement.element as HTMLElement, 'height', designProperties.layout.height)} />
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Padding</span>
          {isDesignMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
              <input
                type="range"
                value={currentPadding}
                onChange={(e) => onPaddingChange(e.target.value)}
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
              {(() => {
                const element = selectedElement.element as HTMLElement
                const paddingInfo = getCSSVariableInfo(element, 'padding')
                if (paddingInfo.variable) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: '#60a5fa', fontFamily: 'monospace' }}>
                        {paddingInfo.variable}
                      </span>
                      <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        ({[
                          formatValue(designProperties.layout.padding.top),
                          formatValue(designProperties.layout.padding.right),
                          formatValue(designProperties.layout.padding.bottom),
                          formatValue(designProperties.layout.padding.left)
                        ].join(' ')})
                      </span>
                    </div>
                  )
                }
                return [
                  formatValue(designProperties.layout.padding.top),
                  formatValue(designProperties.layout.padding.right),
                  formatValue(designProperties.layout.padding.bottom),
                  formatValue(designProperties.layout.padding.left)
                ].join(' ')
              })()}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Margin</span>
          <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
            {(() => {
              const element = selectedElement.element as HTMLElement
              const marginInfo = getCSSVariableInfo(element, 'margin')
              if (marginInfo.variable) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#60a5fa', fontFamily: 'monospace' }}>
                      {marginInfo.variable}
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)' }}>
                      ({[
                        formatValue(designProperties.layout.margin.top),
                        formatValue(designProperties.layout.margin.right),
                        formatValue(designProperties.layout.margin.bottom),
                        formatValue(designProperties.layout.margin.left)
                      ].join(' ')})
                    </span>
                  </div>
                )
              }
              return [
                formatValue(designProperties.layout.margin.top),
                formatValue(designProperties.layout.margin.right),
                formatValue(designProperties.layout.margin.bottom),
                formatValue(designProperties.layout.margin.left)
              ].join(' ')
            })()}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Radius</span>
          {isDesignMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
              <input
                type="range"
                value={currentBorderRadius}
                onChange={(e) => onBorderRadiusChange(e.target.value)}
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
              <VariableDisplay {...getVariableDisplayInfo(selectedElement.element as HTMLElement, 'border-radius', designProperties.layout.border.radius)} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default LayoutSection 