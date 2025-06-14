import React from 'react'

interface VariableDisplayProps {
  hasVariable: boolean
  variable?: string
  computedValue?: string
  displayValue: string
}

const VariableDisplay: React.FC<VariableDisplayProps> = ({
  hasVariable,
  variable,
  computedValue,
  displayValue
}) => {
  if (!hasVariable || !variable) {
    return <span>{displayValue}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
      <span style={{ fontSize: '10px', color: '#60a5fa', fontFamily: 'monospace' }}>
        {variable}
      </span>
      <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)' }}>
        ({computedValue})
      </span>
    </div>
  )
}

export default VariableDisplay 