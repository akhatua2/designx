// React component detection and extraction utility

export interface ReactComponentInfo {
  componentName?: string
  displayName?: string
  props?: Record<string, any>
  state?: Record<string, any>
  hooks?: any[]
  filePath?: string
  lineNumber?: number
  isReactElement: boolean
  reactVersion?: string
  fiberNode?: any
}

export class ReactComponentDetector {
  private static readonly REACT_FIBER_KEYS = [
    '__reactFiber$',
    '__reactInternalFiber$',
    '__reactInternalInstance$'
  ]

  private static readonly REACT_PROPS_KEYS = [
    '__reactProps$',
    '__reactEventHandlers$'
  ]

  /**
   * Attempts to extract React component information from a DOM element
   */
  public static extractReactInfo(element: Element): ReactComponentInfo {
    const result: ReactComponentInfo = {
      isReactElement: false
    }

    try {
      // Try to find React Fiber node
      const fiberNode = this.findReactFiberNode(element)
      if (fiberNode) {
        result.isReactElement = true
        result.fiberNode = fiberNode
        
        // Extract component information from fiber
        this.extractFromFiber(fiberNode, result)
      }

      // Try alternative methods if fiber not found
      if (!result.isReactElement) {
        this.tryAlternativeDetection(element, result)
      }

      // Get React version if possible
      result.reactVersion = this.getReactVersion()

    } catch (error) {
      console.warn('Error extracting React info:', error)
    }

    return result
  }

  /**
   * Find React Fiber node associated with the DOM element
   */
  private static findReactFiberNode(element: Element): any {
    const elementAny = element as any

    // Check for React 16+ fiber keys
    for (const key of this.REACT_FIBER_KEYS) {
      const fiberKey = Object.keys(elementAny).find(k => k.startsWith(key))
      if (fiberKey && elementAny[fiberKey]) {
        return elementAny[fiberKey]
      }
    }

    // Walk up the DOM tree to find a React element
    let current = element.parentElement
    while (current) {
      const currentAny = current as any
      for (const key of this.REACT_FIBER_KEYS) {
        const fiberKey = Object.keys(currentAny).find(k => k.startsWith(key))
        if (fiberKey && currentAny[fiberKey]) {
          return currentAny[fiberKey]
        }
      }
      current = current.parentElement
    }

    return null
  }

  /**
   * Extract component information from React Fiber node
   */
  private static extractFromFiber(fiber: any, result: ReactComponentInfo): void {
    if (!fiber) return

    // Walk up the fiber tree to find the nearest component
    let currentFiber = fiber
    while (currentFiber) {
      if (currentFiber.type && typeof currentFiber.type === 'function') {
        // Function component
        result.componentName = currentFiber.type.name || 'Anonymous'
        result.displayName = currentFiber.type.displayName
        result.props = this.sanitizeProps(currentFiber.memoizedProps)
        
        // Try to extract hooks (React 16.8+)
        if (currentFiber.memoizedState) {
          result.hooks = this.extractHooks(currentFiber.memoizedState)
        }
        
        break
      } else if (currentFiber.type && typeof currentFiber.type === 'object' && currentFiber.type.render) {
        // Class component
        result.componentName = currentFiber.type.name || currentFiber.type.constructor?.name || 'Anonymous'
        result.displayName = currentFiber.type.displayName
        result.props = this.sanitizeProps(currentFiber.memoizedProps)
        
        // Extract state from instance
        if (currentFiber.stateNode && currentFiber.stateNode.state) {
          result.state = this.sanitizeState(currentFiber.stateNode.state)
        }
        
        break
      }
      
      currentFiber = currentFiber.return
    }

    // Try to extract source location info (development mode)
    this.extractSourceInfo(fiber, result)
  }

  /**
   * Try alternative React detection methods
   */
  private static tryAlternativeDetection(element: Element, result: ReactComponentInfo): void {
    const elementAny = element as any

    // Check for React props keys
    for (const key of this.REACT_PROPS_KEYS) {
      const propsKey = Object.keys(elementAny).find(k => k.startsWith(key))
      if (propsKey && elementAny[propsKey]) {
        result.isReactElement = true
        result.props = this.sanitizeProps(elementAny[propsKey])
        break
      }
    }

    // Check if element has React-like attributes
    if (element.hasAttribute('data-reactroot') || 
        element.hasAttribute('data-react-helmet') ||
        element.closest('[data-reactroot]')) {
      result.isReactElement = true
    }
  }

  /**
   * Extract hooks information from fiber state
   */
  private static extractHooks(memoizedState: any): any[] {
    const hooks: any[] = []
    let current = memoizedState

    try {
      while (current) {
        hooks.push({
          type: this.getHookType(current),
          value: this.sanitizeHookValue(current.memoizedState)
        })
        current = current.next
      }
    } catch (error) {
      console.warn('Error extracting hooks:', error)
    }

    return hooks
  }

  /**
   * Determine hook type from hook structure
   */
  private static getHookType(hook: any): string {
    if (hook.queue) {
      return 'useState' // or useReducer
    }
    if (hook.create) {
      return 'useEffect' // or useLayoutEffect
    }
    if (hook.deps !== undefined) {
      return 'useMemo' // or useCallback
    }
    return 'unknown'
  }

  /**
   * Sanitize props to remove functions and non-serializable values
   */
  private static sanitizeProps(props: any): Record<string, any> {
    if (!props || typeof props !== 'object') return {}

    const sanitized: Record<string, any> = {}
    
    try {
      Object.keys(props).forEach(key => {
        const value = props[key]
        
                 if (typeof value === 'function') {
           sanitized[key] = '[Function]'
         } else if (value === null || value === undefined) {
           sanitized[key] = value
         } else if (typeof value === 'object') {
           const globalReact = (globalThis as any).React || (window as any)?.React
           if (globalReact && globalReact.isValidElement && globalReact.isValidElement(value)) {
             sanitized[key] = '[React Element]'
           } else if (Array.isArray(value)) {
             sanitized[key] = `[Array(${value.length})]`
           } else {
             sanitized[key] = '[Object]'
           }
         } else {
           sanitized[key] = value
         }
      })
    } catch (error) {
      console.warn('Error sanitizing props:', error)
    }

    return sanitized
  }

  /**
   * Sanitize state to remove non-serializable values
   */
  private static sanitizeState(state: any): Record<string, any> {
    return this.sanitizeProps(state) // Same sanitization logic
  }

  /**
   * Sanitize hook values
   */
  private static sanitizeHookValue(value: any): any {
    if (typeof value === 'function') {
      return '[Function]'
    }
    if (value && typeof value === 'object') {
      return '[Object]'
    }
    return value
  }

  /**
   * Extract source file information (development mode only)
   */
  private static extractSourceInfo(fiber: any, result: ReactComponentInfo): void {
    try {
      // Check for source location in development builds
      if (fiber._debugSource) {
        result.filePath = fiber._debugSource.fileName
        result.lineNumber = fiber._debugSource.lineNumber
      } else if (fiber._source) {
        result.filePath = fiber._source.fileName
        result.lineNumber = fiber._source.lineNumber
      }
    } catch (error) {
      // Source info not available (production build)
    }
  }

  /**
   * Get React version from global React object
   */
  private static getReactVersion(): string | undefined {
    try {
      // Check window.React first
      if (typeof window !== 'undefined' && (window as any).React) {
        return (window as any).React.version
      }
      
             // Check global React
       const globalReact = (globalThis as any).React
       if (globalReact) {
         return globalReact.version
       }
      
      // Try to find React in the page
      const reactScript = document.querySelector('script[src*="react"]')
      if (reactScript) {
        const src = reactScript.getAttribute('src') || ''
        const versionMatch = src.match(/react[@\-](\d+\.\d+\.\d+)/)
        if (versionMatch) {
          return versionMatch[1]
        }
      }
    } catch (error) {
      console.warn('Could not determine React version:', error)
    }
    
    return undefined
  }

  /**
   * Generate a formatted string representation of React component info
   */
  public static formatComponentInfo(info: ReactComponentInfo): string {
    if (!info.isReactElement) {
      return 'Not a React element'
    }

    const parts: string[] = []
    
    if (info.componentName) {
      parts.push(`Component: ${info.componentName}`)
    }
    
    if (info.displayName && info.displayName !== info.componentName) {
      parts.push(`Display Name: ${info.displayName}`)
    }
    
    if (info.filePath) {
      const fileName = info.filePath.split('/').pop() || info.filePath
      parts.push(`File: ${fileName}${info.lineNumber ? `:${info.lineNumber}` : ''}`)
    }
    
    if (info.props && Object.keys(info.props).length > 0) {
      const propCount = Object.keys(info.props).length
      parts.push(`Props: ${propCount} properties`)
    }
    
    if (info.state && Object.keys(info.state).length > 0) {
      const stateCount = Object.keys(info.state).length
      parts.push(`State: ${stateCount} properties`)
    }
    
    if (info.hooks && info.hooks.length > 0) {
      parts.push(`Hooks: ${info.hooks.length} hooks`)
    }
    
    if (info.reactVersion) {
      parts.push(`React: v${info.reactVersion}`)
    }
    
    return parts.join('\n')
  }

    /**
   * Check if React is available on the page
   */
  public static isReactAvailable(): boolean {
    try {
      const hasWindowReact = (window as any).React
      const hasGlobalReact = (globalThis as any).React
      const hasReactRoot = document.querySelector('[data-reactroot]') !== null
      const hasReactFiber = this.hasReactFiberInPage()
      
      console.log('React detection checks:', {
        hasWindowReact: !!hasWindowReact,
        hasGlobalReact: !!hasGlobalReact, 
        hasReactRoot,
        hasReactFiber
      })
      
      return typeof window !== 'undefined' && 
             (hasWindowReact || hasGlobalReact || hasReactRoot || hasReactFiber)
    } catch (error) {
      console.warn('Error checking React availability:', error)
      return false
    }
  }

  /**
   * Check if any elements on the page have React Fiber properties
   */
  private static hasReactFiberInPage(): boolean {
    try {
      // Check a few common elements for React fiber keys
      const elementsToCheck = [
        document.getElementById('root'),
        document.getElementById('app'), 
        document.querySelector('main'),
        document.querySelector('[class*="App"]'),
        document.querySelector('[class*="app"]')
      ].filter(Boolean)

      for (const element of elementsToCheck) {
        if (element && this.findReactFiberNode(element)) {
          return true
        }
      }
      
      return false
    } catch {
      return false
    }
  }
} 