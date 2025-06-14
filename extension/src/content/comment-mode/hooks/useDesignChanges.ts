import React from 'react'

export interface DesignChange {
  property: string
  originalValue: string
  currentValue: string
}

export const useDesignChanges = (onDesignChange?: (changes: DesignChange[]) => void) => {
  const [designChanges, setDesignChanges] = React.useState<DesignChange[]>([])
  const originalValuesRef = React.useRef<Record<string, string>>({})

  const logDesignChange = React.useCallback((property: string, currentValue: string, originalValue?: string) => {
    // Store original value if this is the first change for this property
    if (!originalValuesRef.current[property] && originalValue) {
      originalValuesRef.current[property] = originalValue
    }

    const effectiveOriginalValue = originalValuesRef.current[property] || originalValue || currentValue
    
    // Only update if there's actually a change from original
    if (effectiveOriginalValue !== currentValue) {
      setDesignChanges(prevChanges => {
        // Check if this change already exists with the same value
        const existingChangeIndex = prevChanges.findIndex(change => change.property === property)
        
        if (existingChangeIndex >= 0) {
          // Update existing change
          if (prevChanges[existingChangeIndex].currentValue === currentValue) {
            return prevChanges // No change needed
          }
          
          const updatedChanges = [...prevChanges]
          updatedChanges[existingChangeIndex] = {
            property,
            originalValue: effectiveOriginalValue,
            currentValue
          }
          
          onDesignChange?.(updatedChanges)
          return updatedChanges
        } else {
          // Add new change
          const newChange: DesignChange = {
            property,
            originalValue: effectiveOriginalValue,
            currentValue
          }
          
          const updatedChanges = [...prevChanges, newChange]
          onDesignChange?.(updatedChanges)
          return updatedChanges
        }
      })
    } else {
      // Remove change if value reverted to original
      setDesignChanges(prevChanges => {
        const filteredChanges = prevChanges.filter(change => change.property !== property)
        if (filteredChanges.length !== prevChanges.length) {
          onDesignChange?.(filteredChanges)
          return filteredChanges
        }
        return prevChanges
      })
    }
    
    console.log('🎨 Design change updated:', { property, originalValue: effectiveOriginalValue, currentValue })
  }, [onDesignChange])

  return React.useMemo(() => ({
    designChanges,
    logDesignChange
  }), [designChanges, logDesignChange])
} 