import React from 'react'
import type { SelectedRegion } from './CommentModeManager'

interface XRayOverlayProps {
  selectedElement: SelectedRegion | null
  isVisible: boolean
}

interface BoxModelData {
  content: DOMRect
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
  border: {
    top: number
    right: number
    bottom: number
    left: number
  }
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

const XRayOverlay: React.FC<XRayOverlayProps> = ({ selectedElement, isVisible }) => {
  if (!isVisible || !selectedElement) return null

  const getBoxModelData = (element: Element): BoxModelData | null => {
    try {
      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)
      
      // Parse CSS values to numbers
      const parseValue = (value: string): number => {
        return parseFloat(value) || 0
      }
      
      return {
        content: rect,
        padding: {
          top: parseValue(computedStyle.paddingTop),
          right: parseValue(computedStyle.paddingRight),
          bottom: parseValue(computedStyle.paddingBottom),
          left: parseValue(computedStyle.paddingLeft)
        },
        border: {
          top: parseValue(computedStyle.borderTopWidth),
          right: parseValue(computedStyle.borderRightWidth),
          bottom: parseValue(computedStyle.borderBottomWidth),
          left: parseValue(computedStyle.borderLeftWidth)
        },
        margin: {
          top: parseValue(computedStyle.marginTop),
          right: parseValue(computedStyle.marginRight),
          bottom: parseValue(computedStyle.marginBottom),
          left: parseValue(computedStyle.marginLeft)
        }
      }
    } catch (error) {
      console.error('Error getting box model data:', error)
      return null
    }
  }

  const renderBoxModelVisualization = () => {
    let element: Element | null = null
    let bounds: { x: number, y: number, width: number, height: number } | null = null

    if (selectedElement.type === 'element' && selectedElement.element) {
      element = selectedElement.element
      const rect = element.getBoundingClientRect()
      bounds = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    } else if (selectedElement.type === 'area' && selectedElement.area) {
      bounds = selectedElement.area
      // For area selections, we can't get computed styles, so show a simplified view
      return renderAreaVisualization(bounds)
    }

    if (!element || !bounds) return null

    const boxModel = getBoxModelData(element)
    if (!boxModel) return null

    const { content, padding, border, margin } = boxModel

    // Get all child elements and their positions
    const getChildElements = (parent: Element): Element[] => {
      const children: Element[] = []
      for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i]
        // Skip floating UI elements and hidden elements
        if (child.hasAttribute('data-floating-icon')) continue
        const style = window.getComputedStyle(child)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        children.push(child)
      }
      return children
    }

    const childElements = getChildElements(element)
    const childRects = childElements.map(child => ({
      element: child,
      rect: child.getBoundingClientRect(),
      style: window.getComputedStyle(child)
    }))

    // Calculate positions for each box layer
    const marginBox = {
      left: content.left - margin.left - border.left - padding.left,
      top: content.top - margin.top - border.top - padding.top,
      width: content.width + padding.left + padding.right + border.left + border.right + margin.left + margin.right,
      height: content.height + padding.top + padding.bottom + border.top + border.bottom + margin.top + margin.bottom
    }

    const borderBox = {
      left: content.left - border.left - padding.left,
      top: content.top - border.top - padding.top,
      width: content.width + padding.left + padding.right + border.left + border.right,
      height: content.height + padding.top + padding.bottom + border.top + border.bottom
    }

    const paddingBox = {
      left: content.left - padding.left,
      top: content.top - padding.top,
      width: content.width + padding.left + padding.right,
      height: content.height + padding.top + padding.bottom
    }

    const contentBox = {
      left: content.left,
      top: content.top,
      width: content.width,
      height: content.height
    }

    // Figma-style measurement components
    const MeasurementLabel = ({ value, x, y, direction = 'horizontal' }: { 
      value: number, 
      x: number, 
      y: number, 
      direction?: 'horizontal' | 'vertical' 
    }) => {
      if (value <= 0) return null
      
      return (
        <div
          style={{
            position: 'fixed',
            left: `${x}px`,
            top: `${y}px`,
            backgroundColor: '#FF6B35',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            pointerEvents: 'none',
            zIndex: 9999, // Lower than bubbles (which are 10000+)
            transform: direction === 'vertical' ? 'translateX(-50%)' : 'translateY(-50%)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          {Math.round(value)}
        </div>
      )
    }

    const MeasurementLine = ({ x1, y1, x2, y2 }: { x1: number, y1: number, x2: number, y2: number }) => {
      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
      
      return (
        <div
          style={{
            position: 'fixed',
            left: `${x1}px`,
            top: `${y1}px`,
            width: `${length}px`,
            height: '1px',
            backgroundColor: '#FF6B35',
            transformOrigin: '0 0',
            transform: `rotate(${angle}deg)`,
            pointerEvents: 'none',
            zIndex: 9998 // Lower than bubbles (which are 10000+)
          }}
        />
      )
    }

    return (
      <>
        {/* Element outline - subtle */}
        <div
          style={{
            position: 'fixed',
            left: `${contentBox.left}px`,
            top: `${contentBox.top}px`,
            width: `${contentBox.width}px`,
            height: `${contentBox.height}px`,
            border: '1px solid #007AFF',
            pointerEvents: 'none',
            zIndex: 9995 // Lower than bubbles
          }}
        />

        {/* Child element outlines */}
        {childRects.map((child, index) => (
          <div
            key={index}
                         style={{
               position: 'fixed',
               left: `${child.rect.left}px`,
               top: `${child.rect.top}px`,
               width: `${child.rect.width}px`,
               height: `${child.rect.height}px`,
               border: '1px solid rgba(0, 122, 255, 0.4)',
               pointerEvents: 'none',
               zIndex: 9996 // Lower than bubbles
             }}
          />
        ))}

        {/* Content dimensions */}
        <div
          style={{
            position: 'fixed',
            left: `${contentBox.left + contentBox.width / 2}px`,
            top: `${contentBox.top + contentBox.height / 2}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#007AFF',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            pointerEvents: 'none',
            zIndex: 9997, // Lower than bubbles
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          {Math.round(contentBox.width)} × {Math.round(contentBox.height)}
        </div>

        {/* Child element spacing measurements - only show most relevant ones */}
        {childRects.map((child, index) => {
          const childMargin = {
            top: parseFloat(child.style.marginTop) || 0,
            right: parseFloat(child.style.marginRight) || 0,
            bottom: parseFloat(child.style.marginBottom) || 0,
            left: parseFloat(child.style.marginLeft) || 0
          }

          const childPadding = {
            top: parseFloat(child.style.paddingTop) || 0,
            right: parseFloat(child.style.paddingRight) || 0,
            bottom: parseFloat(child.style.paddingBottom) || 0,
            left: parseFloat(child.style.paddingLeft) || 0
          }

          // Only show measurements for significant values and avoid overcrowding
          const showMarginTop = childMargin.top > 8
          const showMarginLeft = childMargin.left > 8
          const showPaddingTop = childPadding.top > 8 && child.rect.width > 150 && child.rect.height > 80
          const showPaddingLeft = childPadding.left > 8 && child.rect.width > 150 && child.rect.height > 80

          return (
            <React.Fragment key={`child-${index}`}>
              {/* Child element dimensions - only for larger elements */}
              {child.rect.width > 100 && child.rect.height > 50 && (
                <div
                                     style={{
                     position: 'fixed',
                     left: `${child.rect.left + child.rect.width / 2}px`,
                     top: `${child.rect.top + child.rect.height / 2}px`,
                     transform: 'translate(-50%, -50%)',
                     backgroundColor: 'rgba(0, 122, 255, 0.9)',
                     color: 'white',
                     padding: '3px 8px',
                     borderRadius: '6px',
                     fontSize: '11px',
                     fontWeight: '600',
                     fontFamily: 'system-ui, -apple-system, sans-serif',
                     pointerEvents: 'none',
                     zIndex: 9997, // Lower than bubbles
                     boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                   }}
                >
                  {Math.round(child.rect.width)} × {Math.round(child.rect.height)}
                </div>
              )}

              {/* Only show top margin if significant */}
              {showMarginTop && (
                <>
                  <MeasurementLine 
                    x1={child.rect.left} 
                    y1={child.rect.top - childMargin.top} 
                    x2={child.rect.left + child.rect.width} 
                    y2={child.rect.top - childMargin.top} 
                  />
                  <MeasurementLine 
                    x1={child.rect.left} 
                    y1={child.rect.top} 
                    x2={child.rect.left + child.rect.width} 
                    y2={child.rect.top} 
                  />
                  <MeasurementLabel 
                    value={childMargin.top} 
                    x={child.rect.left + child.rect.width / 2} 
                    y={child.rect.top - childMargin.top / 2}
                    direction="horizontal"
                  />
                </>
              )}

              {/* Only show left margin if significant */}
              {showMarginLeft && (
                <>
                  <MeasurementLine 
                    x1={child.rect.left - childMargin.left} 
                    y1={child.rect.top} 
                    x2={child.rect.left - childMargin.left} 
                    y2={child.rect.top + child.rect.height} 
                  />
                  <MeasurementLine 
                    x1={child.rect.left} 
                    y1={child.rect.top} 
                    x2={child.rect.left} 
                    y2={child.rect.top + child.rect.height} 
                  />
                  <MeasurementLabel 
                    value={childMargin.left} 
                    x={child.rect.left - childMargin.left / 2} 
                    y={child.rect.top + child.rect.height / 2}
                    direction="vertical"
                  />
                </>
              )}

              {/* Only show padding for large elements with significant padding */}
              {showPaddingTop && (
                <>
                  <MeasurementLine 
                    x1={child.rect.left} 
                    y1={child.rect.top} 
                    x2={child.rect.left + child.rect.width} 
                    y2={child.rect.top} 
                  />
                  <MeasurementLine 
                    x1={child.rect.left} 
                    y1={child.rect.top + childPadding.top} 
                    x2={child.rect.left + child.rect.width} 
                    y2={child.rect.top + childPadding.top} 
                  />
                  <MeasurementLabel 
                    value={childPadding.top} 
                    x={child.rect.left + child.rect.width / 2} 
                    y={child.rect.top + childPadding.top / 2}
                    direction="horizontal"
                  />
                </>
              )}

              {showPaddingLeft && (
                <>
                  <MeasurementLine 
                    x1={child.rect.left} 
                    y1={child.rect.top} 
                    x2={child.rect.left} 
                    y2={child.rect.top + child.rect.height} 
                  />
                  <MeasurementLine 
                    x1={child.rect.left + childPadding.left} 
                    y1={child.rect.top} 
                    x2={child.rect.left + childPadding.left} 
                    y2={child.rect.top + child.rect.height} 
                  />
                  <MeasurementLabel 
                    value={childPadding.left} 
                    x={child.rect.left + childPadding.left / 2} 
                    y={child.rect.top + child.rect.height / 2}
                    direction="vertical"
                  />
                </>
              )}
            </React.Fragment>
          )
        })}

        {/* Spacing between adjacent child elements - only show significant gaps */}
        {childRects.map((child, index) => {
          if (index === childRects.length - 1) return null // Skip last element
          
          const nextChild = childRects[index + 1]
          const currentBottom = child.rect.top + child.rect.height
          const nextTop = nextChild.rect.top
          const verticalGap = nextTop - currentBottom

          const currentRight = child.rect.left + child.rect.width
          const nextLeft = nextChild.rect.left
          const horizontalGap = nextLeft - currentRight

          // Only show gaps that are significant and elements are reasonably aligned
          const showVerticalGap = verticalGap > 12 && Math.abs(child.rect.left - nextChild.rect.left) < 30
          const showHorizontalGap = horizontalGap > 12 && Math.abs(child.rect.top - nextChild.rect.top) < 30

          return (
            <React.Fragment key={`gap-${index}`}>
              {/* Vertical gap between elements */}
              {showVerticalGap && (
                <>
                  <MeasurementLine 
                    x1={Math.min(child.rect.left, nextChild.rect.left)} 
                    y1={currentBottom} 
                    x2={Math.max(child.rect.left + child.rect.width, nextChild.rect.left + nextChild.rect.width)} 
                    y2={currentBottom} 
                  />
                  <MeasurementLine 
                    x1={Math.min(child.rect.left, nextChild.rect.left)} 
                    y1={nextTop} 
                    x2={Math.max(child.rect.left + child.rect.width, nextChild.rect.left + nextChild.rect.width)} 
                    y2={nextTop} 
                  />
                  <MeasurementLabel 
                    value={verticalGap} 
                    x={(Math.min(child.rect.left, nextChild.rect.left) + Math.max(child.rect.left + child.rect.width, nextChild.rect.left + nextChild.rect.width)) / 2} 
                    y={currentBottom + verticalGap / 2}
                    direction="horizontal"
                  />
                </>
              )}

              {/* Horizontal gap between elements */}
              {showHorizontalGap && (
                <>
                  <MeasurementLine 
                    x1={currentRight} 
                    y1={Math.min(child.rect.top, nextChild.rect.top)} 
                    x2={currentRight} 
                    y2={Math.max(child.rect.top + child.rect.height, nextChild.rect.top + nextChild.rect.height)} 
                  />
                  <MeasurementLine 
                    x1={nextLeft} 
                    y1={Math.min(child.rect.top, nextChild.rect.top)} 
                    x2={nextLeft} 
                    y2={Math.max(child.rect.top + child.rect.height, nextChild.rect.top + nextChild.rect.height)} 
                  />
                  <MeasurementLabel 
                    value={horizontalGap} 
                    x={currentRight + horizontalGap / 2} 
                    y={(Math.min(child.rect.top, nextChild.rect.top) + Math.max(child.rect.top + child.rect.height, nextChild.rect.top + nextChild.rect.height)) / 2}
                    direction="vertical"
                  />
                </>
              )}
            </React.Fragment>
          )
        })}

        {/* Padding measurements */}
        {padding.top > 0 && (
          <>
            <MeasurementLine 
              x1={contentBox.left} 
              y1={paddingBox.top} 
              x2={contentBox.left + contentBox.width} 
              y2={paddingBox.top} 
            />
            <MeasurementLine 
              x1={contentBox.left} 
              y1={contentBox.top} 
              x2={contentBox.left + contentBox.width} 
              y2={contentBox.top} 
            />
            <MeasurementLabel 
              value={padding.top} 
              x={contentBox.left + contentBox.width / 2} 
              y={paddingBox.top + (contentBox.top - paddingBox.top) / 2}
              direction="horizontal"
            />
          </>
        )}

        {padding.right > 0 && (
          <>
            <MeasurementLine 
              x1={contentBox.left + contentBox.width} 
              y1={contentBox.top} 
              x2={contentBox.left + contentBox.width} 
              y2={contentBox.top + contentBox.height} 
            />
            <MeasurementLine 
              x1={paddingBox.left + paddingBox.width} 
              y1={contentBox.top} 
              x2={paddingBox.left + paddingBox.width} 
              y2={contentBox.top + contentBox.height} 
            />
            <MeasurementLabel 
              value={padding.right} 
              x={contentBox.left + contentBox.width + padding.right / 2} 
              y={contentBox.top + contentBox.height / 2}
              direction="vertical"
            />
          </>
        )}

        {padding.bottom > 0 && (
          <>
            <MeasurementLine 
              x1={contentBox.left} 
              y1={contentBox.top + contentBox.height} 
              x2={contentBox.left + contentBox.width} 
              y2={contentBox.top + contentBox.height} 
            />
            <MeasurementLine 
              x1={contentBox.left} 
              y1={paddingBox.top + paddingBox.height} 
              x2={contentBox.left + contentBox.width} 
              y2={paddingBox.top + paddingBox.height} 
            />
            <MeasurementLabel 
              value={padding.bottom} 
              x={contentBox.left + contentBox.width / 2} 
              y={contentBox.top + contentBox.height + padding.bottom / 2}
              direction="horizontal"
            />
          </>
        )}

        {padding.left > 0 && (
          <>
            <MeasurementLine 
              x1={paddingBox.left} 
              y1={contentBox.top} 
              x2={paddingBox.left} 
              y2={contentBox.top + contentBox.height} 
            />
            <MeasurementLine 
              x1={contentBox.left} 
              y1={contentBox.top} 
              x2={contentBox.left} 
              y2={contentBox.top + contentBox.height} 
            />
            <MeasurementLabel 
              value={padding.left} 
              x={paddingBox.left + padding.left / 2} 
              y={contentBox.top + contentBox.height / 2}
              direction="vertical"
            />
          </>
        )}

        {/* Margin measurements */}
        {margin.top > 0 && (
          <>
            <MeasurementLine 
              x1={borderBox.left} 
              y1={marginBox.top} 
              x2={borderBox.left + borderBox.width} 
              y2={marginBox.top} 
            />
            <MeasurementLine 
              x1={borderBox.left} 
              y1={borderBox.top} 
              x2={borderBox.left + borderBox.width} 
              y2={borderBox.top} 
            />
            <MeasurementLabel 
              value={margin.top} 
              x={borderBox.left + borderBox.width / 2} 
              y={marginBox.top + margin.top / 2}
              direction="horizontal"
            />
          </>
        )}

        {margin.right > 0 && (
          <>
            <MeasurementLine 
              x1={borderBox.left + borderBox.width} 
              y1={borderBox.top} 
              x2={borderBox.left + borderBox.width} 
              y2={borderBox.top + borderBox.height} 
            />
            <MeasurementLine 
              x1={marginBox.left + marginBox.width} 
              y1={borderBox.top} 
              x2={marginBox.left + marginBox.width} 
              y2={borderBox.top + borderBox.height} 
            />
            <MeasurementLabel 
              value={margin.right} 
              x={borderBox.left + borderBox.width + margin.right / 2} 
              y={borderBox.top + borderBox.height / 2}
              direction="vertical"
            />
          </>
        )}

        {margin.bottom > 0 && (
          <>
            <MeasurementLine 
              x1={borderBox.left} 
              y1={borderBox.top + borderBox.height} 
              x2={borderBox.left + borderBox.width} 
              y2={borderBox.top + borderBox.height} 
            />
            <MeasurementLine 
              x1={borderBox.left} 
              y1={marginBox.top + marginBox.height} 
              x2={borderBox.left + borderBox.width} 
              y2={marginBox.top + marginBox.height} 
            />
            <MeasurementLabel 
              value={margin.bottom} 
              x={borderBox.left + borderBox.width / 2} 
              y={borderBox.top + borderBox.height + margin.bottom / 2}
              direction="horizontal"
            />
          </>
        )}

        {margin.left > 0 && (
          <>
            <MeasurementLine 
              x1={marginBox.left} 
              y1={borderBox.top} 
              x2={marginBox.left} 
              y2={borderBox.top + borderBox.height} 
            />
            <MeasurementLine 
              x1={borderBox.left} 
              y1={borderBox.top} 
              x2={borderBox.left} 
              y2={borderBox.top + borderBox.height} 
            />
            <MeasurementLabel 
              value={margin.left} 
              x={marginBox.left + margin.left / 2} 
              y={borderBox.top + borderBox.height / 2}
              direction="vertical"
            />
          </>
        )}
      </>
    )
  }

  const renderAreaVisualization = (bounds: { x: number, y: number, width: number, height: number }) => {
    return (
      <>
        {/* Area outline - Figma style */}
        <div
          style={{
            position: 'fixed',
            left: `${bounds.x}px`,
            top: `${bounds.y}px`,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`,
            border: '1px solid #007AFF',
            pointerEvents: 'none',
            zIndex: 9995 // Lower than bubbles
          }}
        />
        
        {/* Area dimensions */}
        <div
          style={{
            position: 'fixed',
            left: `${bounds.x + bounds.width / 2}px`,
            top: `${bounds.y + bounds.height / 2}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#007AFF',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            pointerEvents: 'none',
            zIndex: 9997, // Lower than bubbles
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          {Math.round(bounds.width)} × {Math.round(bounds.height)}
        </div>
      </>
    )
  }

  return (
    <div data-floating-icon="true">
      {renderBoxModelVisualization()}
    </div>
  )
}

export default XRayOverlay 