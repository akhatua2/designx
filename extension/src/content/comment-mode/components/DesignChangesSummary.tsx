import React from 'react'
import type { DesignChange } from '../hooks/useDesignChanges'

interface DesignChangesSummaryProps {
  designChanges: DesignChange[]
}

// Extract styles to prevent recreation on every render
const styles = {
  container: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '6px',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  },
  title: {
    fontSize: '10px',
    fontWeight: '600' as const,
    color: '#60a5fa',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },
  changesContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },
  changeItem: {
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const
  },
  propertyName: {
    fontWeight: '500' as const
  },
  moreChanges: {
    fontSize: '8px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    marginTop: '2px'
  }
} as const

const DesignChangesSummary: React.FC<DesignChangesSummaryProps> = React.memo(({ designChanges }) => {
  // Memoize calculations to prevent unnecessary work
  const { recentChanges, hasMoreChanges, totalCount } = React.useMemo(() => {
    const recent = designChanges.slice(-3)
    const hasMore = designChanges.length > 3
    return {
      recentChanges: recent,
      hasMoreChanges: hasMore,
      totalCount: designChanges.length
    }
  }, [designChanges])

  if (designChanges.length === 0) return null

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        Design Changes {hasMoreChanges && `(${totalCount} total)`}
      </div>
      
      <div style={styles.changesContainer}>
        {recentChanges.map((change, index) => (
          <div key={`${change.property}-${index}`} style={styles.changeItem}>
            <span>
              <span style={styles.propertyName}>{change.property}:</span> {change.originalValue} → {change.currentValue}
            </span>
          </div>
        ))}
        
        {hasMoreChanges && (
          <div style={styles.moreChanges}>
            ...and {totalCount - 3} more changes
          </div>
        )}
      </div>
    </div>
  )
})

DesignChangesSummary.displayName = 'DesignChangesSummary'

export default DesignChangesSummary 