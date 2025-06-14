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

export interface SelectedArea {
  x: number
  y: number
  width: number
  height: number
  elementsInArea: Element[]
}

export interface SelectedRegion {
  type: 'element' | 'area'
  element?: Element
  area?: SelectedArea
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
  private onElementSelectedCallback: ((elementData: SelectedRegion) => void) | null = null
  private overlayElement: HTMLElement | null = null
  private selectedElement: Element | null = null

  // Rectangular selection state
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private dragCurrentX = 0
  private dragCurrentY = 0
  private selectionRectangle: HTMLElement | null = null
  private dragThreshold = 5 // Minimum pixels to start drag selection

  private readonly highlightStyles = {
    // No styles applied to selected element - keep it completely clean
  }

  // Handle mouse down for starting rectangular selection
  private handleMouseDown = (e: MouseEvent) => {
    if (!this.isActive || this.isPaused) return
    
    const target = e.target as Element
    
    // Don't process clicks on the floating icon itself
    if (target.closest('[data-floating-icon]')) return
    
    // Store initial mouse position for potential drag
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.dragCurrentX = e.clientX
    this.dragCurrentY = e.clientY
    
    // Don't start dragging immediately - wait for mouse move
  }

  // Handle mouse move for highlighting elements and drag selection
  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isActive || this.isPaused) return
    
    const target = e.target as Element
    
    // Don't highlight the floating icon itself or its children
    if (target.closest('[data-floating-icon]')) return
    
    // Check if we should start dragging
    if (!this.isDragging && e.buttons === 1) { // Left mouse button is pressed
      const deltaX = Math.abs(e.clientX - this.dragStartX)
      const deltaY = Math.abs(e.clientY - this.dragStartY)
      
      if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
        this.startDragSelection()
      }
    }
    
    // Handle drag selection
    if (this.isDragging) {
      this.updateDragSelection(e.clientX, e.clientY)
      return // Skip hover highlighting during drag
    }
    
    // Regular hover highlighting (only when not dragging)
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

  // Handle mouse up for completing selection
  private handleMouseUp = (e: MouseEvent) => {
    if (!this.isActive || this.isPaused) return
    
    if (this.isDragging) {
      this.completeDragSelection()
      return
    }
    
    // Handle regular element click (existing functionality)
    this.handleElementClick(e)
  }

  // Handle click to select element for commenting (now only called for non-drag clicks)
  private handleElementClick = (e: MouseEvent) => {
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
        type: 'element',
        element: target,
        domPath,
        elementInfo,
        reactInfo
      })
    }

    // Pause highlighting when comment bubble opens
    this.pause()
  }

  private startDragSelection() {
    this.isDragging = true
    
    // Remove any existing hover highlights
    if (this.hoveredElement) {
      this.removeHighlight(this.hoveredElement)
      this.hoveredElement = null
    }
    
    // Create selection rectangle
    this.createSelectionRectangle()
    
    console.log('🖱️ Started drag selection')
  }

  private updateDragSelection(currentX: number, currentY: number) {
    this.dragCurrentX = currentX
    this.dragCurrentY = currentY
    
    if (this.selectionRectangle) {
      const left = Math.min(this.dragStartX, currentX)
      const top = Math.min(this.dragStartY, currentY)
      const width = Math.abs(currentX - this.dragStartX)
      const height = Math.abs(currentY - this.dragStartY)
      
      this.selectionRectangle.style.left = `${left}px`
      this.selectionRectangle.style.top = `${top}px`
      this.selectionRectangle.style.width = `${width}px`
      this.selectionRectangle.style.height = `${height}px`
    }
  }

  private completeDragSelection() {
    if (!this.selectionRectangle) return
    
    const left = Math.min(this.dragStartX, this.dragCurrentX)
    const top = Math.min(this.dragStartY, this.dragCurrentY)
    const width = Math.abs(this.dragCurrentX - this.dragStartX)
    const height = Math.abs(this.dragCurrentY - this.dragStartY)
    
    // Find elements within the selected area
    const elementsInArea = this.getElementsInArea(left, top, width, height)
    
    console.log('🎯 Drag selection completed:')
    console.log('Area:', { x: left, y: top, width, height })
    console.log('Elements in area:', elementsInArea.length)
    
    const selectedArea: SelectedArea = {
      x: left,
      y: top,
      width,
      height,
      elementsInArea
    }
    
    // Create a descriptive path for the area
    const domPath = `area(${left},${top},${width}x${height})`
    const elementInfo = `Selected area: ${width}×${height}px (${elementsInArea.length} elements)`
    
    // Replace blue drag rectangle with blur overlay highlighting the selected area
    this.cleanupDragSelection()
    this.createOverlay({ x: left, y: top, width, height })
    
    // Notify UI to show comment bubble
    if (this.onElementSelectedCallback) {
      this.onElementSelectedCallback({
        type: 'area',
        area: selectedArea,
        domPath,
        elementInfo
      })
    }
    
    // Pause highlighting when comment bubble opens
    this.pause()
  }

  private createSelectionRectangle() {
    this.selectionRectangle = document.createElement('div')
    this.selectionRectangle.setAttribute('data-floating-icon', 'true')
    this.selectionRectangle.style.cssText = `
      position: fixed;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      z-index: 10001;
      pointer-events: none;
      border-radius: 4px;
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
    `
    
    document.body.appendChild(this.selectionRectangle)
  }

  private cleanupDragSelection() {
    this.isDragging = false
    
    if (this.selectionRectangle) {
      this.selectionRectangle.remove()
      this.selectionRectangle = null
    }
  }

  private getElementsInArea(x: number, y: number, width: number, height: number): Element[] {
    const elements: Element[] = []
    const allElements = document.querySelectorAll('*')
    
    for (const element of allElements) {
      // Skip floating UI elements
      if (element.closest('[data-floating-icon]')) continue
      
      const rect = element.getBoundingClientRect()
      
      // Check if element overlaps with selection area
      const overlaps = !(
        rect.right < x ||
        rect.left > x + width ||
        rect.bottom < y ||
        rect.top > y + height
      )
      
      if (overlaps) {
        elements.push(element)
      }
    }
    
    return elements
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
      
      // If dragging, cancel the drag first
      if (this.isDragging) {
        this.cleanupDragSelection()
        return
      }
      
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

  private createOverlay(target: Element | { x: number, y: number, width: number, height: number }) {
    // Get bounds - either from element or from coordinates
    const bounds = target instanceof Element 
      ? target.getBoundingClientRect()
      : { left: target.x, top: target.y, width: target.width, height: target.height }
    
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

    // Create a rounded cutout area for the selected element/area
    const padding = 8 // Add padding around the element/area
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

    // Calculate cutout dimensions
    const cutoutX = bounds.left - padding
    const cutoutY = bounds.top - padding
    const cutoutWidth = bounds.width + (padding * 2)
    const cutoutHeight = bounds.height + (padding * 2)

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
    this.cleanupDragSelection()
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
    
    document.addEventListener('mousedown', this.handleMouseDown, true)
    document.addEventListener('mousemove', this.handleMouseMove, true)
    document.addEventListener('mouseup', this.handleMouseUp, true)
    document.addEventListener('keydown', this.handleKeyDown, true)
    document.body.style.cursor = 'crosshair'
    
    this.notifyStateChange()
    console.log('💬 Comment mode activated - hover over elements to highlight, click to select element, or drag to select area. Press ESC to exit')
  }

  public deactivate() {
    if (!this.isActive) return
    
    this.isActive = false
    this.isPaused = false
    
    document.removeEventListener('mousedown', this.handleMouseDown, true)
    document.removeEventListener('mousemove', this.handleMouseMove, true)
    document.removeEventListener('mouseup', this.handleMouseUp, true)
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

  public onElementSelected(callback: (elementData: SelectedRegion) => void) {
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