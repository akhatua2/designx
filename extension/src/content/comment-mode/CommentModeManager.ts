// Function to generate a unique DOM path for an element
import { ReactComponentDetector, type ReactComponentInfo } from './ReactComponentDetector'

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

export interface SelectedElement {
  element: Element
  domPath: string
  elementInfo: string
  reactInfo?: ReactComponentInfo
}

export class CommentModeManager {
  private isActive = false
  private isPaused = false // New flag for pausing highlighting
  private isSelectionMode = false // New flag for screenshot selection mode
  private allowNextClick = false // Flag to allow specific clicks to pass through
  private hoveredElement: Element | null = null
  private originalCursor = ''
  private onStateChangeCallback: ((isActive: boolean) => void) | null = null
  private onElementSelectedCallback: ((elementData: SelectedElement) => void) | null = null
  private onElementCapturedCallback: ((elementData: SelectedElement) => void) | null = null // New callback for selection mode
  private overlayElement: HTMLElement | null = null
  private selectedElement: Element | null = null

  private readonly highlightStyles = {
    // No styles applied to selected element - keep it completely clean
  }

  // Handle mouse move for highlighting elements
  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isActive || this.isPaused) return
    
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

  // Handle click to select element for commenting or screenshot capture
  private handleElementClick = (e: MouseEvent) => {
    if (!this.isActive || this.isPaused) return
    
    const target = e.target as Element
    
    // Don't process clicks on the floating icon itself
    if (target.closest('[data-floating-icon]')) return
    
    // In selection mode, allow clicks on CommentBubble to pass through
    if (this.isSelectionMode && target.closest('[data-comment-bubble]')) {
      console.log('🖱️ Click on CommentBubble allowed to pass through')
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    const domPath = generateDOMPath(target)
    const elementInfo = this.getElementInfo(target)
    
    // Extract React component information if available
    let reactInfo: ReactComponentInfo | undefined
    console.log('🔍 Checking if React is available...')
    const isReactAvailable = ReactComponentDetector.isReactAvailable()
    console.log('React available:', isReactAvailable)
    
    if (isReactAvailable) {
      console.log('🔍 Extracting React info from element...')
      reactInfo = ReactComponentDetector.extractReactInfo(target)
      console.log('React detection result:', reactInfo)
    } else {
      console.log('❌ React not detected on this page')
    }

    const elementData = {
      element: target,
      domPath,
      elementInfo,
      reactInfo
    }

    if (this.isSelectionMode) {
      // In selection mode, capture screenshot instead of opening comment bubble
      console.log('📸 Element clicked in selection mode for screenshot capture:')
      console.log('DOM Path:', domPath)
      console.log('Element:', target)
      console.log('---')

      if (this.onElementCapturedCallback) {
        this.onElementCapturedCallback(elementData)
      }
    } else {
      // Normal comment mode behavior
      console.log('💬 Element clicked in comment mode:')
      console.log('DOM Path:', domPath)
      console.log('Element:', target)
      if (reactInfo?.isReactElement) {
        console.log('⚛️ React Component:', reactInfo.componentName || 'Anonymous')
        console.log('React Info:', ReactComponentDetector.formatComponentInfo(reactInfo))
      }
      console.log('Ready to add comment to this element!')
      console.log('---')

      // Notify UI to show comment bubble
      if (this.onElementSelectedCallback) {
        this.onElementSelectedCallback(elementData)
      }

      // Pause highlighting when comment bubble opens
      this.pause()
    }
  }

  // Handle click specifically for selection mode - only captures page elements, not UI
  private handleSelectionClick = (e: MouseEvent) => {
    if (!this.isActive || this.isPaused || !this.isSelectionMode) return
    
    // Check if this click should be allowed to pass through
    if (this.allowNextClick) {
      console.log('🖱️ Allowing click to pass through due to allowNextClick flag')
      this.allowNextClick = false
      return
    }
    
    const target = e.target as Element
    
    // Don't process clicks on the floating icon or CommentBubble
    if (target.closest('[data-floating-icon]') || target.closest('[data-comment-bubble]')) {
      console.log('🖱️ Click on UI element - allowing to pass through')
      return
    }
    
    // Only capture clicks on page elements
    e.preventDefault()
    e.stopPropagation()
    
    const domPath = generateDOMPath(target)
    const elementInfo = this.getElementInfo(target)
    
    // Extract React component information if available
    let reactInfo: ReactComponentInfo | undefined
    console.log('🔍 Checking if React is available...')
    const isReactAvailable = ReactComponentDetector.isReactAvailable()
    console.log('React available:', isReactAvailable)
    
    if (isReactAvailable) {
      console.log('🔍 Extracting React info from element...')
      reactInfo = ReactComponentDetector.extractReactInfo(target)
      console.log('React detection result:', reactInfo)
    } else {
      console.log('❌ React not detected on this page')
    }

    const elementData = {
      element: target,
      domPath,
      elementInfo,
      reactInfo
    }

    console.log('📸 Element clicked in selection mode for screenshot capture:')
    console.log('DOM Path:', domPath)
    console.log('Element:', target)
    console.log('---')

    if (this.onElementCapturedCallback) {
      this.onElementCapturedCallback(elementData)
    }
  }

  private getElementInfo(element: Element): string {
    const tagName = element.tagName.toLowerCase()
    const id = element.id ? `#${element.id}` : ''
    const classes = element.className && typeof element.className === 'string' 
      ? `.${element.className.trim().split(/\s+/).slice(0, 2).join('.')}` 
      : ''
    
    let info = `<${tagName}${id}${classes}>`
    
    // Add text content if it's short and meaningful
    const textContent = element.textContent?.trim()
    if (textContent && textContent.length > 0 && textContent.length < 50) {
      info += ` "${textContent}"`
    }
    
    return info
  }

  // Handle ESC key to exit comment mode
  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return
    
    if (e.key === 'Escape') {
      e.preventDefault()
      this.deactivate()
      console.log('🔑 Comment mode exited with ESC key')
    }
  }

  private addHighlight(element: Element) {
    // Remove existing overlay
    this.removeOverlay()
    
    // Keep element completely clean - no styles applied
    const htmlElement = element as HTMLElement
    Object.assign(htmlElement.style, this.highlightStyles)
    
    // Create overlay that blurs everything except the highlighted element
    this.createOverlay(element)
  }

  private removeHighlight(element: Element) {
    const htmlElement = element as HTMLElement
    Object.keys(this.highlightStyles).forEach(key => {
      htmlElement.style.removeProperty(key.replace(/([A-Z])/g, '-$1').toLowerCase())
    })
    this.removeOverlay()
  }

  private createOverlay(selectedElement: Element) {
    const rect = selectedElement.getBoundingClientRect()
    
    // Create main overlay container
    this.overlayElement = document.createElement('div')
    this.overlayElement.setAttribute('data-floating-icon', 'true') // Exclude from screenshots
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 10000;
      pointer-events: none;
      transition: all 0.2s ease;
    `

    // Create a rounded cutout area for the selected element
    const padding = 8 // Add padding around the element
    const borderRadius = 12 // Rounded corners
    
    // Create the blurred background that covers everything
    const blurredBackground = document.createElement('div')
    // Use different colors for selection mode vs normal mode
    const backgroundColor = this.isSelectionMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 0, 0, 0.3)'
    blurredBackground.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${backgroundColor};
      backdrop-filter: blur(2px);
    `

    // Calculate cutout dimensions
    const cutoutX = rect.left - padding
    const cutoutY = rect.top - padding
    const cutoutWidth = rect.width + (padding * 2)
    const cutoutHeight = rect.height + (padding * 2)

    // Use CSS mask to create rounded cutout
    const maskSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <defs>
          <mask id="cutout">
            <rect width="100%" height="100%" fill="white"/>
            <rect x="${cutoutX}" y="${cutoutY}" width="${cutoutWidth}" height="${cutoutHeight}" 
                  rx="${borderRadius}" ry="${borderRadius}" fill="black"/>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="white" mask="url(#cutout)"/>
      </svg>
    `
    
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(maskSVG)}`
    blurredBackground.style.maskImage = `url("${svgDataUrl}")`
    blurredBackground.style.webkitMaskImage = `url("${svgDataUrl}")`
    blurredBackground.style.maskSize = '100% 100%'
    blurredBackground.style.webkitMaskSize = '100% 100%'

    this.overlayElement.appendChild(blurredBackground)

    // Add instruction text for selection mode
    if (this.isSelectionMode) {
      const instructionText = document.createElement('div')
      instructionText.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(34, 197, 94, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        pointer-events: none;
      `
      instructionText.textContent = '📸 Click elements to capture screenshots'
      this.overlayElement.appendChild(instructionText)
    }

    document.body.appendChild(this.overlayElement)
  }

  private removeOverlay() {
    if (this.overlayElement) {
      this.overlayElement.remove()
      this.overlayElement = null
    }
  }

  private cleanupHighlights() {
    if (this.hoveredElement) {
      this.removeHighlight(this.hoveredElement)
      this.hoveredElement = null
    }
    this.removeOverlay()
  }

  private notifyStateChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.isActive)
    }
  }

  public activate() {
    if (this.isActive) return
    
    this.isActive = true
    this.isPaused = false
    this.originalCursor = document.body.style.cursor
    
    document.addEventListener('mousemove', this.handleMouseMove, true)
    document.addEventListener('click', this.handleElementClick, true)
    document.addEventListener('keydown', this.handleKeyDown, true)
    document.body.style.cursor = 'crosshair'
    
    this.notifyStateChange()
    console.log('💬 Comment mode activated - hover over elements to highlight, click to add comment, press ESC to exit')
  }

  public deactivate() {
    if (!this.isActive) return
    
    this.isActive = false
    this.isPaused = false
    
    document.removeEventListener('mousemove', this.handleMouseMove, true)
    document.removeEventListener('click', this.handleElementClick, true)
    document.removeEventListener('keydown', this.handleKeyDown, true)
    document.body.style.cursor = this.originalCursor
    
    this.cleanupHighlights()
    this.notifyStateChange()
    
    console.log('💬 Comment mode deactivated')
  }

  public pause() {
    if (!this.isActive) return
    
    this.isPaused = true
    document.body.style.cursor = this.originalCursor
    // Don't clear highlights when pausing - keep the selected element highlighted
    console.log('💬 Comment mode paused for text input')
  }

  public resume() {
    if (!this.isActive) return
    
    this.isPaused = false
    document.body.style.cursor = 'crosshair'
    console.log('💬 Comment mode resumed')
  }

  public toggle() {
    if (this.isActive) {
      this.deactivate()
    } else {
      this.activate()
    }
  }

  public isCommentModeActive(): boolean {
    return this.isActive
  }

  public isCommentModePaused(): boolean {
    return this.isPaused
  }

  public onStateChange(callback: (isActive: boolean) => void) {
    this.onStateChangeCallback = callback
  }

  public onElementSelected(callback: (elementData: SelectedElement) => void) {
    this.onElementSelectedCallback = callback
  }

  public cleanup() {
    this.deactivate()
    this.onStateChangeCallback = null
    this.onElementSelectedCallback = null
  }

  public enterSelectionMode() {
    if (!this.isActive) return
    
    this.isSelectionMode = true
    this.isPaused = false // Resume highlighting for selection
    document.body.style.cursor = 'crosshair'
    
    // Remove the global click listener and add a more specific one
    document.removeEventListener('click', this.handleElementClick, true)
    document.addEventListener('click', this.handleSelectionClick, true)
    
    // Refresh overlay to show selection mode styling
    if (this.hoveredElement) {
      this.addHighlight(this.hoveredElement)
    }
    
    console.log('📸 Entered screenshot selection mode - highlighting resumed')
  }

  public exitSelectionMode() {
    if (!this.isActive) return
    
    this.isSelectionMode = false
    this.isPaused = true // Pause highlighting again
    document.body.style.cursor = this.originalCursor
    
    // Restore the original click listener
    document.removeEventListener('click', this.handleSelectionClick, true)
    document.addEventListener('click', this.handleElementClick, true)
    
    // Refresh overlay to show normal mode styling
    if (this.hoveredElement) {
      this.addHighlight(this.hoveredElement)
    }
    
    console.log('📸 Exited screenshot selection mode - highlighting paused')
  }

  public isInSelectionMode(): boolean {
    return this.isSelectionMode
  }

  public onElementCaptured(callback: (elementData: SelectedElement) => void) {
    this.onElementCapturedCallback = callback
  }

  public allowNextClickToPassThrough() {
    this.allowNextClick = true
    console.log('🖱️ Next click will be allowed to pass through')
  }
}

// Create a singleton instance
export const commentModeManager = new CommentModeManager() 