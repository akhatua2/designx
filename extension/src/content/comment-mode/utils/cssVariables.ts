// Helper function to extract CSS variables from element
export const getCSSVariableInfo = (element: HTMLElement, property: string): { variable?: string, value: string } => {
  try {
    // Get all stylesheets
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
                  const variableName = match[1].trim()
                  const computedValue = window.getComputedStyle(element).getPropertyValue(property)
                  return {
                    variable: variableName,
                    value: computedValue
                  }
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
  } catch (e) {
    console.warn('Could not access CSS rules:', e)
  }
  
  // Fallback to computed value
  const computedValue = window.getComputedStyle(element).getPropertyValue(property)
  return { value: computedValue }
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

// Helper function to get CSS variable display info
export const getVariableDisplayInfo = (element: HTMLElement | null, property: string, fallbackValue: string) => {
  if (!element || !fallbackValue || fallbackValue === 'auto' || fallbackValue === 'normal') {
    return { hasVariable: false, displayValue: '—' }
  }
  
  const cssInfo = getCSSVariableInfo(element, property)
  
  if (cssInfo.variable) {
    return {
      hasVariable: true,
      variable: cssInfo.variable,
      computedValue: fallbackValue,
      displayValue: fallbackValue
    }
  }
  
  return { hasVariable: false, displayValue: fallbackValue }
}

// Helper function to get color variable display info
export const getColorVariableDisplayInfo = (element: HTMLElement | null, property: string, fallbackColor: string) => {
  if (!element || !fallbackColor || fallbackColor === 'rgba(0, 0, 0, 0)' || fallbackColor === 'transparent') {
    return { hasVariable: false, displayValue: '—' }
  }
  
  const cssInfo = getCSSVariableInfo(element, property)
  
  if (cssInfo.variable) {
    return {
      hasVariable: true,
      variable: cssInfo.variable,
      computedValue: fallbackColor,
      displayValue: fallbackColor
    }
  }
  
  return { hasVariable: false, displayValue: fallbackColor }
}

export const rgbToHex = (rgb: string): string => {
  // Handle hex colors that are already in hex format
  if (rgb.startsWith('#')) {
    return rgb
  }
  
  // Handle rgb() and rgba() format
  const rgbMatch = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/)
  if (!rgbMatch) {
    return rgb // Return original if not parseable
  }
  
  const [, r, g, b] = rgbMatch
  const toHex = (n: string) => {
    const hex = parseInt(n, 10).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
} 