// Function to generate a unique DOM path for an element
const generateDOMPath = (element: Element): string => {
  const path: string[] = []
  let current = element

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()
    
    // Add ID if available
    if (current.id) {
      selector += `#${current.id}`
    }
    
    // Add classes if available
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(cls => cls.length > 0)
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`
      }
    }
    
    // Add nth-child if there are siblings with the same tag
    const siblings = Array.from(current.parentElement?.children || [])
    const sameTagSiblings = siblings.filter(sibling => sibling.tagName === current.tagName)
    if (sameTagSiblings.length > 1) {
      const index = sameTagSiblings.indexOf(current) + 1
      selector += `:nth-child(${index})`
    }
    
    path.unshift(selector)
    current = current.parentElement as Element
  }
  
  return path.join(' > ')
}

export class EditModeManager {
  private isActive = false
  private hoveredElement: Element | null = null
  private originalCursor = ''
  private onStateChangeCallback: ((isActive: boolean) => void) | null = null
  private currentlyEditing: HTMLElement | null = null
  private originalContent: string | null = null

  private readonly highlightStyles = {
    outline: '2px solid #3b82f6',
    outlineOffset: '2px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    transition: 'all 0.2s ease'
  }

  // Handle mouse move for highlighting elements
  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isActive || this.currentlyEditing) return
    
    const target = e.target as Element
    
    // Don't highlight the floating icon itself or its children
    if (target.closest('[data-floating-icon]')) return
    
    // Remove previous highlight
    if (this.hoveredElement && this.hoveredElement !== target) {
      this.removeHighlight(this.hoveredElement)
    }
    
    // Add highlight to current element
    if (target && target !== this.hoveredElement) {
      this.addHighlight(target)
      this.hoveredElement = target
    }
  }

  private isTextElement(element: Element): boolean {
    // Check if element contains primarily text content
    const text = element.textContent || ''
    const hasChildElements = element.children.length > 0
    return text.trim().length > 0 && !hasChildElements
  }

  private makeElementEditable(element: HTMLElement) {
    if (!element) return;
    
    this.currentlyEditing = element
    this.originalContent = element.textContent

    try {
      // Store original attributes
      const originalAttributes = {
        contentEditable: element.contentEditable,
        style: element.getAttribute('style')
      }

      // Make element editable
      element.contentEditable = 'true'
      element.style.setProperty('cursor', 'text')
      element.focus()

      // Handle finishing edit
      const finishEdit = (save: boolean) => {
        if (!this.currentlyEditing) return

        try {
          // Restore original attributes
          this.currentlyEditing.contentEditable = originalAttributes.contentEditable
          if (originalAttributes.style) {
            this.currentlyEditing.setAttribute('style', originalAttributes.style)
          } else {
            // Only remove style if it exists to avoid null reference
            if (this.currentlyEditing.hasAttribute('style')) {
              this.currentlyEditing.removeAttribute('style')
            }
          }

          // If not saving, restore original content
          if (!save && this.originalContent !== null) {
            this.currentlyEditing.textContent = this.originalContent
          }

          // Log the changes if saved
          if (save && this.originalContent !== this.currentlyEditing.textContent) {
            console.log('📝 Text edited:')
            console.log('Element:', this.currentlyEditing)
            console.log('Original:', this.originalContent)
            console.log('New:', this.currentlyEditing.textContent)
            console.log('DOM Path:', generateDOMPath(this.currentlyEditing))
            console.log('---')
          }
        } catch (error) {
          console.error('Error while finishing edit:', error)
        }

        this.currentlyEditing = null
        this.originalContent = null
      }

      // Handle blur and keyboard events
      const handleBlur = () => finishEdit(true)
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          finishEdit(false)
          e.preventDefault()
        } else if (e.key === 'Enter' && !e.shiftKey) {
          finishEdit(true)
          e.preventDefault()
        }
      }

      element.addEventListener('blur', handleBlur)
      element.addEventListener('keydown', handleKeyDown)

      // Cleanup event listeners when done
      const cleanup = () => {
        if (element) {
          element.removeEventListener('blur', handleBlur)
          element.removeEventListener('keydown', handleKeyDown)
        }
      }

      element.addEventListener('blur', cleanup, { once: true })
    } catch (error) {
      console.error('Error while making element editable:', error)
      this.currentlyEditing = null
      this.originalContent = null
    }
  }

  // Handle click to edit text or log DOM path
  private handleElementClick = (e: MouseEvent) => {
    if (!this.isActive) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const target = e.target as HTMLElement
    
    // Don't process clicks on the floating icon itself
    if (target.closest('[data-floating-icon]')) return

    // If element is text-based, make it editable
    if (this.isTextElement(target)) {
      this.makeElementEditable(target)
    } else {
      // For non-text elements, just log the DOM path as before
      const domPath = generateDOMPath(target)
      console.log('🎯 Element clicked in edit mode:')
      console.log('DOM Path:', domPath)
      console.log('Element:', target)
      console.log('---')
    }
  }

  // Handle ESC key to exit edit mode
  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return
    
    if (e.key === 'Escape' && !this.currentlyEditing) {
      e.preventDefault()
      this.deactivate()
      console.log('🔑 Edit mode exited with ESC key')
    }
  }

  private addHighlight(element: Element) {
    const htmlElement = element as HTMLElement
    Object.assign(htmlElement.style, this.highlightStyles)
  }

  private removeHighlight(element: Element) {
    const htmlElement = element as HTMLElement
    Object.keys(this.highlightStyles).forEach(key => {
      htmlElement.style.removeProperty(key.replace(/([A-Z])/g, '-$1').toLowerCase())
    })
  }

  private cleanupHighlights() {
    if (this.hoveredElement) {
      this.removeHighlight(this.hoveredElement)
      this.hoveredElement = null
    }
  }

  private notifyStateChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.isActive)
    }
  }

  public activate() {
    if (this.isActive) return
    
    this.isActive = true
    this.originalCursor = document.body.style.cursor
    
    document.addEventListener('mousemove', this.handleMouseMove, true)
    document.addEventListener('click', this.handleElementClick, true)
    document.addEventListener('keydown', this.handleKeyDown, true)
    document.body.style.cursor = 'crosshair'
    
    this.notifyStateChange()
    console.log('✏️ Edit mode activated - hover over elements to highlight, click to get DOM path, press ESC to exit')
  }

  public deactivate() {
    if (!this.isActive) return
    
    this.isActive = false
    
    // If currently editing, finish the edit with save
    if (this.currentlyEditing) {
      const event = new Event('blur')
      this.currentlyEditing.dispatchEvent(event)
    }
    
    document.removeEventListener('mousemove', this.handleMouseMove, true)
    document.removeEventListener('click', this.handleElementClick, true)
    document.removeEventListener('keydown', this.handleKeyDown, true)
    document.body.style.cursor = this.originalCursor
    
    this.cleanupHighlights()
    this.notifyStateChange()
    
    console.log('✏️ Edit mode deactivated')
  }

  public toggle() {
    if (this.isActive) {
      this.deactivate()
    } else {
      this.activate()
    }
  }

  public isEditModeActive(): boolean {
    return this.isActive
  }

  public onStateChange(callback: (isActive: boolean) => void) {
    this.onStateChangeCallback = callback
  }

  public cleanup() {
    this.deactivate()
    this.onStateChangeCallback = null
  }
}

// Create a singleton instance
export const editModeManager = new EditModeManager() 