import React from 'react'

export interface DesignChange {
  property: string
  originalValue: string
  currentValue: string
}

export const useDesignChanges = (onDesignChange?: (changes: DesignChange[]) => void) => {
  const [designChanges, setDesignChanges] = React.useState<DesignChange[]>([])
  const [originalValues, setOriginalValues] = React.useState<Record<string, string>>({})

  const logDesignChange = (property: string, currentValue: string, originalValue?: string) => {
    // Store original value if this is the first change for this property
    if (!originalValues[property] && originalValue) {
      setOriginalValues(prev => ({ ...prev, [property]: originalValue }))
    }

    // Update or add the design change for this property
    const updatedChanges = designChanges.filter(change => change.property !== property)
    const effectiveOriginalValue = originalValues[property] || originalValue || currentValue
    
    // Only add if there's actually a change from original
    if (effectiveOriginalValue !== currentValue) {
      const change: DesignChange = {
        property,
        originalValue: effectiveOriginalValue,
        currentValue
      }
      
      updatedChanges.push(change)
    }
    
    setDesignChanges(updatedChanges)
    
    if (onDesignChange) {
      onDesignChange(updatedChanges)
    }
    
    console.log('🎨 Design change updated:', { property, originalValue: effectiveOriginalValue, currentValue })
  }

  return {
    designChanges,
    logDesignChange
  }
} 