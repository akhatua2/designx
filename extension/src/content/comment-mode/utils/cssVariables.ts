// Cache for CSS variable lookups to avoid expensive DOM operations
const cssVariableCache = new Map<string, { variable?: string, value: string, timestamp: number }>()
const CACHE_DURATION = 5000 // 5 seconds cache

// Helper function to extract CSS variables from element (with caching)
export const getCSSVariableInfo = (element: HTMLElement, property: string): { variable?: string, value: string } => {
  const cacheKey = `${element.tagName}-${element.className}-${property}`
  const now = Date.now()
  
  // Check cache first
  const cached = cssVariableCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return { variable: cached.variable, value: cached.value }
  }
  
  let result: { variable?: string, value: string }
  
  try {
    // Get computed value first (this is always needed)
    const computedValue = window.getComputedStyle(element).getPropertyValue(property)
    
    // Quick check: if element has inline styles with CSS variables, check those first
    const inlineStyle = element.style.cssText
    if (inlineStyle.includes('var(')) {
      const propertyRegex = new RegExp(`${property}\\s*:\\s*var\\(([^)]+)\\)`, 'i')
      const match = inlineStyle.match(propertyRegex)
      if (match) {
        result = {
          variable: match[1].trim(),
          value: computedValue
        }
        cssVariableCache.set(cacheKey, { ...result, timestamp: now })
        return result
      }
    }
    
    // Only do expensive stylesheet traversal if we haven't found it yet
    // and the computed value suggests it might be a CSS variable
    if (computedValue && !computedValue.startsWith('var(')) {
      // Try to find CSS variable in stylesheets (expensive operation)
      const stylesheets = Array.from(document.styleSheets)
      
      for (const stylesheet of stylesheets) {
        try {
          const rules = Array.from(stylesheet.cssRules || stylesheet.rules || [])
          
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
              // Check if this rule applies to our element
              try {
                if (element.matches(rule.selectorText)) {
                  const style = rule.style
                  const cssText = style.cssText
                  
                  // Look for CSS variables in the property
                  const propertyRegex = new RegExp(`${property}\\s*:\\s*var\\(([^)]+)\\)`, 'i')
                  const match = cssText.match(propertyRegex)
                  
                  if (match) {
                    result = {
                      variable: match[1].trim(),
                      value: computedValue
                    }
                    cssVariableCache.set(cacheKey, { ...result, timestamp: now })
                    return result
                  }
                }
              } catch (e) {
                // Ignore invalid selectors
                continue
              }
            }
          }
        } catch (e) {
          // Skip stylesheets we can't access (CORS)
          continue
        }
      }
    }
    
    // Fallback to computed value
    result = { value: computedValue }
  } catch (e) {
    console.warn('Could not access CSS rules:', e)
    result = { value: window.getComputedStyle(element).getPropertyValue(property) }
  }
  
  // Cache the result
  cssVariableCache.set(cacheKey, { ...result, timestamp: now })
  return result
}

// Helper functions for formatting design properties
export const formatValue = (value: string) => {
  if (!value || value === 'auto' || value === 'normal') return '—'
  return value
}

export const formatColor = (color: string) => {
  if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return '—'
  return color
}

export const formatFontFamily = (fontFamily: string) => {
  if (!fontFamily) return '—'
  // Extract first font name and clean it up
  const firstFont = fontFamily.split(',')[0].replace(/['"]/g, '').trim()
  return firstFont
}

// Memoized helper function to get CSS variable display info
const displayInfoCache = new Map<string, any>()

export const getVariableDisplayInfo = (element: HTMLElement | null, property: string, fallbackValue: string) => {
  if (!element || !fallbackValue || fallbackValue === 'auto' || fallbackValue === 'normal') {
    return { hasVariable: false, displayValue: '—' }
  }
  
  const cacheKey = `${element.tagName}-${element.className}-${property}-${fallbackValue}`
  
  if (displayInfoCache.has(cacheKey)) {
    return displayInfoCache.get(cacheKey)
  }
  
  const cssInfo = getCSSVariableInfo(element, property)
  
  let result
  if (cssInfo.variable) {
    result = {
      hasVariable: true,
      variable: cssInfo.variable,
      computedValue: fallbackValue,
      displayValue: fallbackValue
    }
  } else {
    result = { hasVariable: false, displayValue: fallbackValue }
  }
  
  displayInfoCache.set(cacheKey, result)
  
  // Clear cache after a delay to prevent memory leaks
  setTimeout(() => displayInfoCache.delete(cacheKey), CACHE_DURATION)
  
  return result
}

// Helper function to get color variable display info
export const getColorVariableDisplayInfo = (element: HTMLElement | null, property: string, fallbackColor: string) => {
  if (!element || !fallbackColor || fallbackColor === 'rgba(0, 0, 0, 0)' || fallbackColor === 'transparent') {
    return { hasVariable: false, displayValue: '—' }
  }
  
  return getVariableDisplayInfo(element, property, fallbackColor)
}

// Optimized RGB to Hex conversion with caching
const rgbToHexCache = new Map<string, string>()

export const rgbToHex = (rgb: string): string => {
  // Check cache first
  if (rgbToHexCache.has(rgb)) {
    return rgbToHexCache.get(rgb)!
  }
  
  let result: string
  
  // Handle hex colors that are already in hex format
  if (rgb.startsWith('#')) {
    result = rgb
  } else {
    // Handle rgb() and rgba() format
    const rgbMatch = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/)
    if (!rgbMatch) {
      result = rgb // Return original if not parseable
    } else {
      const [, r, g, b] = rgbMatch
      const toHex = (n: string) => {
        const hex = parseInt(n, 10).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }
      
      result = `#${toHex(r)}${toHex(g)}${toHex(b)}`
    }
  }
  
  // Cache the result
  rgbToHexCache.set(rgb, result)
  
  // Prevent memory leaks by limiting cache size
  if (rgbToHexCache.size > 100) {
    const firstKey = rgbToHexCache.keys().next().value
    if (firstKey) {
      rgbToHexCache.delete(firstKey)
    }
  }
  
  return result
}

// Clear caches periodically to prevent memory leaks
setInterval(() => {
  cssVariableCache.clear()
  displayInfoCache.clear()
  rgbToHexCache.clear()
}, 30000) // Clear every 30 seconds 