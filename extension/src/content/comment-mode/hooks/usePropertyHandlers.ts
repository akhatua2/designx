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
  const [currentlyEditing, setCurrentlyEditing] = React.useState<HTMLElement | null>(null)
  const [originalContent, setOriginalContent] = React.useState<string>('')

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
      
      // Stop any existing editing when element changes
      if (currentlyEditing) {
        finishTextEdit(true)
      }
    }
  }, [selectedElement])

  const isTextElement = (element: HTMLElement): boolean => {
    const text = element.textContent || ''
    const hasChildElements = element.children.length > 0
    return text.trim().length > 0 && !hasChildElements
  }

  const makeElementEditable = (element: HTMLElement) => {
    if (!element || currentlyEditing) return
    
    setCurrentlyEditing(element)
    setOriginalContent(element.textContent || '')

    try {
      // Make element editable with visual feedback
      element.contentEditable = 'true'
      element.style.setProperty('cursor', 'text', 'important')
      element.style.setProperty('outline', '2px solid #3b82f6', 'important')
      element.style.setProperty('outline-offset', '2px', 'important')
      element.style.setProperty('background-color', 'rgba(59, 130, 246, 0.05)', 'important')
      element.focus()

      // Handle keyboard events
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          finishTextEdit(false)
          e.preventDefault()
          e.stopPropagation()
        } else if (e.key === 'Enter' && !e.shiftKey) {
          finishTextEdit(true)
          e.preventDefault()
          e.stopPropagation()
        }
      }

      // Handle blur
      const handleBlur = () => finishTextEdit(true)

      element.addEventListener('keydown', handleKeyDown)
      element.addEventListener('blur', handleBlur, { once: true })

      // Store event listeners for cleanup
      element.setAttribute('data-editing-listeners', 'true')
      ;(element as any).__keydownHandler = handleKeyDown
    } catch (error) {
      console.error('Error making element editable:', error)
      setCurrentlyEditing(null)
      setOriginalContent('')
    }
  }

  const finishTextEdit = (save: boolean) => {
    if (!currentlyEditing) return

    try {
      const element = currentlyEditing
      const newContent = element.textContent || ''

      // Remove editing styles and attributes
      element.contentEditable = 'false'
      element.style.removeProperty('cursor')
      element.style.removeProperty('outline')
      element.style.removeProperty('outline-offset')
      element.style.removeProperty('background-color')

      // Remove event listeners
      if ((element as any).__keydownHandler) {
        element.removeEventListener('keydown', (element as any).__keydownHandler)
        delete (element as any).__keydownHandler
      }
      element.removeAttribute('data-editing-listeners')

      // If not saving, restore original content
      if (!save) {
        element.textContent = originalContent
      } else if (originalContent !== newContent) {
        // Log the change if saved and different
        logDesignChange('Text Content', newContent, originalContent)
        console.log('📝 Text edited in comment mode:')
        console.log('Element:', element)
        console.log('Original:', originalContent)
        console.log('New:', newContent)
        console.log('---')
      }
    } catch (error) {
      console.error('Error finishing text edit:', error)
    }

    setCurrentlyEditing(null)
    setOriginalContent('')
  }

  // Add click handler for text elements when design mode is active
  React.useEffect(() => {
    const handleElementClick = (e: Event) => {
      const mouseEvent = e as MouseEvent
      // Only handle clicks on the selected element when it's a text element
      if (selectedElement.type === 'element' && selectedElement.element && 
          mouseEvent.target === selectedElement.element && 
          isTextElement(selectedElement.element as HTMLElement) &&
          !currentlyEditing) {
        
        mouseEvent.preventDefault()
        mouseEvent.stopPropagation()
        makeElementEditable(selectedElement.element as HTMLElement)
      }
    }

    if (selectedElement.type === 'element' && selectedElement.element) {
      const element = selectedElement.element
      element.addEventListener('click', handleElementClick, { capture: true })
      
      return () => {
        element.removeEventListener('click', handleElementClick, { capture: true })
      }
    }
  }, [selectedElement, currentlyEditing])

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
    hasTextContent,
    isCurrentlyEditingText: !!currentlyEditing
  }
} 