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
  private hoveredElement: Element | null = null
  private originalCursor = ''
  private onStateChangeCallback: ((isActive: boolean) => void) | null = null
  private onElementSelectedCallback: ((elementData: SelectedElement) => void) | null = null
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

  // Handle click to select element for commenting
  private handleElementClick = (e: MouseEvent) => {
    if (!this.isActive || this.isPaused) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const target = e.target as Element
    
    // Don't process clicks on the floating icon itself
    if (target.closest('[data-floating-icon]')) return
    
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
      this.onElementSelectedCallback({
        element: target,
        domPath,
        elementInfo,
        reactInfo
      })
    }

    // Pause highlighting when comment bubble opens
    this.pause()
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
    const padding = 8 // Add padding around the element for rounded effect
    const borderRadius = 12 // Rounded corners
    
    // Create the blurred background that covers everything
    const blurredBackground = document.createElement('div')
    blurredBackground.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(2px);
    `

    // Create a mask using radial-gradient for smooth rounded corners
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const maskWidth = rect.width + (padding * 2)
    const maskHeight = rect.height + (padding * 2)
    
    // Use CSS mask with rounded rectangle cutout
    const maskImage = `
      radial-gradient(
        ellipse ${maskWidth/2}px ${maskHeight/2}px at ${centerX}px ${centerY}px,
        transparent ${Math.min(maskWidth, maskHeight)/2 - borderRadius}px,
        transparent ${Math.min(maskWidth, maskHeight)/2}px,
        black ${Math.min(maskWidth, maskHeight)/2 + 1}px
      )
    `
    
    // Fallback to a simpler approach using mask-image with rounded rectangle
    blurredBackground.style.maskImage = `
      linear-gradient(black, black),
      radial-gradient(
        ${borderRadius}px at ${rect.left - padding + borderRadius}px ${rect.top - padding + borderRadius}px,
        transparent ${borderRadius - 1}px,
        black ${borderRadius}px
      ),
      radial-gradient(
        ${borderRadius}px at ${rect.right + padding - borderRadius}px ${rect.top - padding + borderRadius}px,
        transparent ${borderRadius - 1}px,
        black ${borderRadius}px
      ),
      radial-gradient(
        ${borderRadius}px at ${rect.right + padding - borderRadius}px ${rect.bottom + padding - borderRadius}px,
        transparent ${borderRadius - 1}px,
        black ${borderRadius}px
      ),
      radial-gradient(
        ${borderRadius}px at ${rect.left - padding + borderRadius}px ${rect.bottom + padding - borderRadius}px,
        transparent ${borderRadius - 1}px,
        black ${borderRadius}px
      )
    `
    
    blurredBackground.style.maskComposite = 'subtract'
    blurredBackground.style.webkitMaskComposite = 'source-out'
    
    // Simpler approach: use box-shadow with inset and border-radius on a pseudo-cutout
    blurredBackground.style.maskImage = 'none'
    
    // Create cutout using box-shadow technique
    const cutoutX = rect.left - padding
    const cutoutY = rect.top - padding
    const cutoutWidth = rect.width + (padding * 2)
    const cutoutHeight = rect.height + (padding * 2)
    
    blurredBackground.style.boxShadow = `
      0 0 0 ${cutoutY}px rgba(0, 0, 0, 0.3),
      0 0 0 ${cutoutX}px rgba(0, 0, 0, 0.3),
      ${cutoutWidth}px 0 0 ${cutoutX}px rgba(0, 0, 0, 0.3),
      0 ${cutoutHeight}px 0 ${cutoutY}px rgba(0, 0, 0, 0.3)
    `
    
    // Reset and use a clean approach with multiple divs
    blurredBackground.style.boxShadow = 'none'
    blurredBackground.style.background = 'none'
    
    // Top section
    const topSection = document.createElement('div')
    topSection.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: ${cutoutY}px;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(2px);
    `
    
    // Bottom section  
    const bottomSection = document.createElement('div')
    bottomSection.style.cssText = `
      position: absolute;
      top: ${cutoutY + cutoutHeight}px;
      left: 0;
      width: 100%;
      height: calc(100% - ${cutoutY + cutoutHeight}px);
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(2px);
    `
    
    // Left section
    const leftSection = document.createElement('div')
    leftSection.style.cssText = `
      position: absolute;
      top: ${cutoutY}px;
      left: 0;
      width: ${cutoutX}px;
      height: ${cutoutHeight}px;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(2px);
    `
    
    // Right section
    const rightSection = document.createElement('div')
    rightSection.style.cssText = `
      position: absolute;
      top: ${cutoutY}px;
      left: ${cutoutX + cutoutWidth}px;
      width: calc(100% - ${cutoutX + cutoutWidth}px);
      height: ${cutoutHeight}px;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(2px);
    `

    this.overlayElement.appendChild(topSection)
    this.overlayElement.appendChild(bottomSection)
    this.overlayElement.appendChild(leftSection)
    this.overlayElement.appendChild(rightSection)
    
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
}

// Create a singleton instance
export const commentModeManager = new CommentModeManager() 