import React from 'react'
import type { SelectedRegion } from './CommentModeManager'
import { useDesignChanges, type DesignChange } from './hooks/useDesignChanges'
import { usePropertyHandlers } from './hooks/usePropertyHandlers'
import TypographySection from './components/TypographySection'
import LayoutSection from './components/LayoutSection'
import ColorsSection from './components/ColorsSection'
import DesignChangesSummary from './components/DesignChangesSummary'

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
  const { designChanges, logDesignChange } = useDesignChanges(onDesignChange)
  
  const {
    currentFontSize,
    currentFontWeight,
    currentTextAlign,
    currentTextColor,
    currentBackgroundColor,
    currentPadding,
    currentBorderRadius,
    handleFontSizeChange,
    handleFontWeightChange,
    handleTextAlignChange,
    handleTextColorChange,
    handleBackgroundColorChange,
    handlePaddingChange,
    handleBorderRadiusChange,
    hasTextContent
  } = usePropertyHandlers(selectedElement, logDesignChange)

  const getDesignProperties = (): DesignProperties | null => {
    if (selectedElement.type === 'element' && selectedElement.element) {
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
    return null
  }

  const designProperties = getDesignProperties()
  
  if (!designProperties) {
    return (
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '12px'
      }}>
        No element selected
      </div>
    )
  }

  return (
    <>
      <style>
        {`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 14px;
            width: 14px;
            border-radius: 50%;
            background: #60a5fa;
            cursor: pointer;
            border: 2px solid #1e40af;
          }
          
          input[type="range"]::-moz-range-thumb {
            height: 14px;
            width: 14px;
            border-radius: 50%;
            background: #60a5fa;
            cursor: pointer;
            border: 2px solid #1e40af;
            box-sizing: border-box;
          }
          
          input[type="color"] {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: none;
            cursor: pointer;
            outline: none;
            padding: 0;
          }
          
          input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
            border-radius: 3px;
          }
          
          input[type="color"]::-webkit-color-swatch {
            border: none;
            border-radius: 3px;
          }
          
          input[type="color"]::-moz-color-swatch {
            border: none;
            border-radius: 3px;
          }
        `}
      </style>
      
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <TypographySection
          selectedElement={selectedElement}
          designProperties={designProperties}
          isDesignMode={isDesignMode}
          currentFontSize={currentFontSize}
          currentFontWeight={currentFontWeight}
          currentTextAlign={currentTextAlign}
          hasTextContent={hasTextContent()}
          onFontSizeChange={handleFontSizeChange}
          onFontWeightChange={handleFontWeightChange}
          onTextAlignChange={handleTextAlignChange}
        />

        <LayoutSection
          selectedElement={selectedElement}
          designProperties={designProperties}
          isDesignMode={isDesignMode}
          currentPadding={currentPadding}
          currentBorderRadius={currentBorderRadius}
          onPaddingChange={handlePaddingChange}
          onBorderRadiusChange={handleBorderRadiusChange}
        />

        <ColorsSection
          selectedElement={selectedElement}
          designProperties={designProperties}
          isDesignMode={isDesignMode}
          currentTextColor={currentTextColor}
          currentBackgroundColor={currentBackgroundColor}
          hasTextContent={hasTextContent()}
          onTextColorChange={handleTextColorChange}
          onBackgroundColorChange={handleBackgroundColorChange}
        />

        <DesignChangesSummary designChanges={designChanges} />
      </div>
    </>
  )
}

export default DesignPropertiesPanel 