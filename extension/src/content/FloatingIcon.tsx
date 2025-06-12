import React, { useState } from 'react'
import { MessageCircle, Edit3, Github } from 'lucide-react'

// Inline styles to ensure the component works even if Tailwind doesn't load
const styles = {
  menuButton: {
    width: '160px',
    height: '44px',
    borderRadius: '22px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease',
    pointerEvents: 'auto' as const
  }
}

const FloatingIcon: React.FC = () => {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)

  const handleGitHub = () => {
    console.log('Github feature activated!')
    setSelectedIcon(selectedIcon === 'github' ? null : 'github')
  }

  const handleComment = () => {
    console.log('Comment feature activated!')
    setSelectedIcon(selectedIcon === 'comment' ? null : 'comment')
  }

  const handleEdit = () => {
    console.log('Edit feature activated!')
    setSelectedIcon(selectedIcon === 'edit' ? null : 'edit')
  }

  return (
    <div 
      style={styles.menuButton}
      className="relative"
    >
      <button
        onClick={handleGitHub}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px'
        }}
      >
        <Github 
          style={{ 
            width: '18px', 
            height: '18px', 
            color: 'white',
            opacity: 0.9,
            strokeWidth: 2.5,
            fill: selectedIcon === 'github' ? 'currentColor' : 'none',
            stroke: 'currentColor'
          }} 
        />
      </button>
      
      <button
        onClick={handleComment}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px'
        }}
      >
        <MessageCircle 
          style={{ 
            width: '18px', 
            height: '18px', 
            color: 'white',
            opacity: 0.9,
            strokeWidth: 2.5,
            fill: selectedIcon === 'comment' ? 'currentColor' : 'none',
            stroke: 'currentColor'
          }} 
        />
      </button>
      
      <button
        onClick={handleEdit}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px'
        }}
      >
        <Edit3 
          style={{ 
            width: '18px', 
            height: '18px', 
            color: 'white',
            opacity: 0.9,
            strokeWidth: 2.5,
            fill: selectedIcon === 'edit' ? 'currentColor' : 'none',
            stroke: 'currentColor'
          }} 
        />
      </button>
    </div>
  )
}

export default FloatingIcon 