import React, { useState, useRef, useEffect } from 'react'

interface DraggableWrapperProps {
  children: React.ReactNode
}

const DraggableWrapper: React.FC<DraggableWrapperProps> = ({ children }) => {
  const iconSize = 44
  const margin = 20
  const [position, setPosition] = useState(() => ({
    x: window.innerWidth - iconSize - margin,
    y: window.innerHeight - iconSize - margin
  }))
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return
    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y
    })
  }

  const onMouseUp = () => {
    dragging.current = false
  }

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 'px',
        top: position.y + 'px',
        cursor: dragging.current ? 'grabbing' : 'grab',
        pointerEvents: 'auto',
        zIndex: 2147483647
      }}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  )
}

export default DraggableWrapper
