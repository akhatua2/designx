import React from 'react'
import type { SelectedRegion } from '../CommentModeManager'
import { rgbToHex } from '../utils/cssVariables'

export const usePropertyHandlers = (
  selectedElement: SelectedRegion,
  logDesignChange: (property: string, currentValue: string, originalValue?: string) => void
) => {
  const [currentFontSize, setCurrentFontSize] = React.useState<string>('')
  const [currentFontWeight, setCurrentFontWeight] = React.useState<string>('')
  const [currentTextAlign, setCurrentTextAlign] = React.useState<string>('')
  const [currentTextColor, setCurrentTextColor] = React.useState<string>('')
  const [currentBackgroundColor, setCurrentBackgroundColor] = React.useState<string>('')
  const [currentPadding, setCurrentPadding] = React.useState<string>('')
  const [currentBorderRadius, setCurrentBorderRadius] = React.useState<string>('')

  // Initialize state when element changes
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
    }
  }, [selectedElement])

  const handleFontSizeChange = (newSize: string) => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element as HTMLElement
      const fontSize = parseInt(newSize)
      
      if (!isNaN(fontSize) && fontSize > 0) {
        const originalValue = window.getComputedStyle(element).fontSize
        element.style.fontSize = `${fontSize}px`
        setCurrentFontSize(newSize)
        logDesignChange('Font Size', `${fontSize}px`, originalValue)
        console.log('🎨 Font size changed to:', `${fontSize}px`)
      }
    }
  }

  const handleFontWeightChange = (newWeight: string) => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element as HTMLElement
      const originalValue = window.getComputedStyle(element).fontWeight
      element.style.fontWeight = newWeight
      setCurrentFontWeight(newWeight)
      logDesignChange('Font Weight', newWeight, originalValue)
      console.log('🎨 Font weight changed to:', newWeight)
    }
  }

  const handleTextAlignChange = (newAlign: string) => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element as HTMLElement
      const originalValue = window.getComputedStyle(element).textAlign
      element.style.textAlign = newAlign
      setCurrentTextAlign(newAlign)
      logDesignChange('Text Align', newAlign, originalValue)
      console.log('🎨 Text align changed to:', newAlign)
    }
  }

  const handleTextColorChange = (newColor: string) => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element as HTMLElement
      const originalValue = window.getComputedStyle(element).color
      element.style.color = newColor
      setCurrentTextColor(newColor)
      logDesignChange('Text Color', newColor, originalValue)
      console.log('🎨 Text color changed to:', newColor)
    }
  }

  const handleBackgroundColorChange = (newColor: string) => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element as HTMLElement
      const originalValue = window.getComputedStyle(element).backgroundColor
      element.style.backgroundColor = newColor
      setCurrentBackgroundColor(newColor)
      logDesignChange('Background Color', newColor, originalValue)
      console.log('🎨 Background color changed to:', newColor)
    }
  }

  const handlePaddingChange = (newPadding: string) => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element as HTMLElement
      const paddingValue = parseInt(newPadding)
      
      if (!isNaN(paddingValue) && paddingValue >= 0) {
        const originalValue = window.getComputedStyle(element).paddingTop
        element.style.padding = `${paddingValue}px`
        setCurrentPadding(newPadding)
        logDesignChange('Padding', `${paddingValue}px`, originalValue)
        console.log('🎨 Padding changed to:', `${paddingValue}px`)
      }
    }
  }

  const handleBorderRadiusChange = (newRadius: string) => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element as HTMLElement
      const radiusValue = parseInt(newRadius)
      
      if (!isNaN(radiusValue) && radiusValue >= 0) {
        const originalValue = window.getComputedStyle(element).borderRadius
        element.style.borderRadius = `${radiusValue}px`
        setCurrentBorderRadius(newRadius)
        logDesignChange('Border Radius', `${radiusValue}px`, originalValue)
        console.log('🎨 Border radius changed to:', `${radiusValue}px`)
      }
    }
  }

  const hasTextContent = () => {
    if (selectedElement.type === 'element' && selectedElement.element) {
      const textContent = selectedElement.element.textContent?.trim()
      return textContent ? textContent.length > 0 : false
    }
    return false
  }

  return {
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
  }
} 