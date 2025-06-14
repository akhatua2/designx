import React from 'react'
import type { DesignChange } from '../hooks/useDesignChanges'

interface DesignChangesSummaryProps {
  designChanges: DesignChange[]
}

const DesignChangesSummary: React.FC<DesignChangesSummaryProps> = ({ designChanges }) => {
  if (designChanges.length === 0) return null

  const recentChanges = designChanges.slice(-3)
  const hasMoreChanges = designChanges.length > 3

  return (
    <div style={{
      marginTop: '12px',
      padding: '10px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderRadius: '6px',
      border: '1px solid rgba(59, 130, 246, 0.2)'
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: '600',
        color: '#60a5fa',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Design Changes {hasMoreChanges && `(${designChanges.length} total)`}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {recentChanges.map((change, index) => (
          <div key={index} style={{
            fontSize: '9px',
            color: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              <span style={{ fontWeight: '500' }}>{change.property}:</span> {change.originalValue} → {change.currentValue}
            </span>
          </div>
        ))}
        
        {hasMoreChanges && (
          <div style={{
            fontSize: '8px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: '2px'
          }}>
            ...and {designChanges.length - 3} more changes
          </div>
        )}
      </div>
    </div>
  )
}

export default DesignChangesSummary 