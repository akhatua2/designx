import React from 'react'
import type { SelectedRegion } from '../CommentModeManager'
import { rgbToHex } from '../utils/cssVariables'

export const usePropertyHandlers = (
  selectedElement: SelectedRegion,
  logDesignChange: (property: string, currentValue: string, originalValue?: string) => void,
  isDesignMode: boolean = false
) => {
  const [currentFontSize, setCurrentFontSize] = React.useState<string>('')
  const [currentFontWeight, setCurrentFontWeight] = React.useState<string>('')
  const [currentTextAlign, setCurrentTextAlign] = React.useState<string>('')
  const [currentTextColor, setCurrentTextColor] = React.useState<string>('')
  const [currentBackgroundColor, setCurrentBackgroundColor] = React.useState<string>('')
  const [currentPadding, setCurrentPadding] = React.useState<string>('')
  const [currentBorderRadius, setCurrentBorderRadius] = React.useState<string>('')
  
  // Use refs instead of state for text editing to avoid unnecessary re-renders
  const currentlyEditingRef = React.useRef<HTMLElement | null>(null)
  const originalContentRef = React.useRef<string>('')
  const eventListenersRef = React.useRef<{
    keydown?: (e: KeyboardEvent) => void
    blur?: () => void
  }>({})

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
      if (currentlyEditingRef.current) {
        console.log('🔄 Element changed, finishing existing text edit')
        finishTextEdit(true)
      }
    }
  }, [selectedElement])

  const isTextElement = (element: HTMLElement): boolean => {
    const text = element.textContent || ''
    const hasChildElements = element.children.length > 0
    return text.trim().length > 0 && !hasChildElements
  }

  const cleanupEventListeners = (element: HTMLElement) => {
    const listeners = eventListenersRef.current
    if (listeners.keydown) {
      element.removeEventListener('keydown', listeners.keydown)
    }
    if (listeners.blur) {
      element.removeEventListener('blur', listeners.blur)
    }
    eventListenersRef.current = {}
  }

  const finishTextEdit = React.useCallback((save: boolean) => {
    const element = currentlyEditingRef.current
    if (!element) return

    try {
      const newContent = element.textContent || ''
      const originalContent = originalContentRef.current

      console.log(`🏁 Finishing text edit (save: ${save})`, { 
        original: originalContent, 
        new: newContent,
        element: element.tagName
      })

      // Remove editing styles and attributes
      element.contentEditable = 'false'
      element.style.removeProperty('cursor')
      element.style.removeProperty('outline')
      element.style.removeProperty('outline-offset')
      element.style.removeProperty('background-color')

      // Clean up event listeners
      cleanupEventListeners(element)

      // If not saving, restore original content
      if (!save) {
        element.textContent = originalContent
        console.log('📝 Text edit cancelled, restored original content:', originalContent)
      } else if (originalContent !== newContent) {
        // Log the change if saved and different
        logDesignChange('Text Content', newContent, originalContent)
        console.log('📝 ✅ Text edited and tracked as design change:')
        console.log('Element:', element.tagName)
        console.log('Original:', originalContent)
        console.log('New:', newContent)
        console.log('Change logged successfully!')
        console.log('---')
      } else {
        console.log('📝 No change detected, skipping design change log')
      }
    } catch (error) {
      console.error('Error finishing text edit:', error)
    }

    // Reset refs
    currentlyEditingRef.current = null
    originalContentRef.current = ''
  }, [logDesignChange])

  const makeElementEditable = React.useCallback((element: HTMLElement) => {
    if (!element || currentlyEditingRef.current || !isDesignMode) {
      console.log('❌ Cannot make element editable:', { 
        hasElement: !!element, 
        currentlyEditing: !!currentlyEditingRef.current, 
        isDesignMode 
      })
      return
    }
    
    console.log('✏️ Making element editable:', element.tagName, element.textContent)
    const textContent = element.textContent || ''
    currentlyEditingRef.current = element
    originalContentRef.current = textContent

    try {
      // Make element editable with visual feedback
      element.contentEditable = 'true'
      element.style.setProperty('cursor', 'text', 'important')
      element.style.setProperty('outline', '2px solid #3b82f6', 'important')
      element.style.setProperty('outline-offset', '2px', 'important')
      element.style.setProperty('background-color', 'rgba(59, 130, 246, 0.05)', 'important')
      element.focus()

      // Create event handlers
      const handleKeyDown = (e: KeyboardEvent) => {
        console.log('⌨️ Key pressed in text edit:', e.key)
        if (e.key === 'Escape') {
          console.log('❌ Escape pressed, cancelling edit')
          finishTextEdit(false)
          e.preventDefault()
          e.stopPropagation()
        } else if (e.key === 'Enter' && !e.shiftKey) {
          console.log('✅ Enter pressed, saving edit')
          finishTextEdit(true)
          e.preventDefault()
          e.stopPropagation()
        }
      }

      const handleBlur = () => {
        console.log('👁️ Element lost focus, saving edit')
        finishTextEdit(true)
      }

      // Store event listeners in ref for cleanup
      eventListenersRef.current = {
        keydown: handleKeyDown,
        blur: handleBlur
      }

      element.addEventListener('keydown', handleKeyDown)
      element.addEventListener('blur', handleBlur)

      console.log('✅ Element made editable successfully')
    } catch (error) {
      console.error('Error making element editable:', error)
      currentlyEditingRef.current = null
      originalContentRef.current = ''
    }
  }, [isDesignMode, finishTextEdit])

  // Single useEffect for all cleanup scenarios
  React.useEffect(() => {
    const cleanup = () => {
      if (currentlyEditingRef.current) {
        console.log('🧹 Cleaning up text edit state')
        finishTextEdit(false)
      }
    }

    // Cleanup when design mode is disabled
    if (!isDesignMode) {
      cleanup()
    }

    // Cleanup on unmount
    return cleanup
  }, [isDesignMode, finishTextEdit])

  // Single useEffect for click handler management
  React.useEffect(() => {
    if (!isDesignMode || selectedElement.type !== 'element' || !selectedElement.element) {
      return
    }

    const element = selectedElement.element as HTMLElement
    
    // Only add click handler if it's a text element
    if (!isTextElement(element)) {
      return
    }

    const handleElementClick = (e: Event) => {
      const mouseEvent = e as MouseEvent
      console.log('🖱️ Text element clicked, making editable')
      mouseEvent.preventDefault()
      mouseEvent.stopPropagation()
      makeElementEditable(element)
    }

    console.log('📝 Adding click listener to text element:', element.tagName)
    element.addEventListener('click', handleElementClick, { capture: true })
    
    return () => {
      console.log('🧹 Removing click listener from element')
      element.removeEventListener('click', handleElementClick, { capture: true })
    }
  }, [selectedElement, isDesignMode, makeElementEditable])

  // Force cleanup function that can be called externally
  const forceCleanupTextEdit = React.useCallback(() => {
    if (currentlyEditingRef.current) {
      console.log('🧹 Force cleaning up text edit state')
      finishTextEdit(false)
    }
  }, [finishTextEdit])

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
    isCurrentlyEditingText: !!currentlyEditingRef.current,
    forceCleanupTextEdit
  }
} 