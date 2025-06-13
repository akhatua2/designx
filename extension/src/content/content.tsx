// React JSX transform handles React import automatically
import { createRoot } from 'react-dom/client'
import FloatingIcon from './FloatingIcon'
import DraggableWrapper from './DraggableWrapper'
import './content.css'

// Function to inject the floating icon with Shadow DOM encapsulation
function injectFloatingIcon() {
  // Check if icon already exists
  const existingIcon = document.querySelector('[data-extension-id="designx-floating-icon"]')
  if (existingIcon) return

  // Create host container for Shadow DOM
  const shadowHost = document.createElement('div')
  shadowHost.setAttribute('data-extension-id', 'designx-floating-icon')
  shadowHost.style.cssText = `
    position: fixed;
    top: 0px;
    left: 0px;
    z-index: 2147483647;
    pointer-events: none;
    width: 0;
    height: 0;
  `

  // Create Shadow DOM
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' })

  // Inject the original content CSS into Shadow DOM
  const style = document.createElement('style')
  style.textContent = `
    /* Custom styles for the floating icon to ensure it doesn't inherit page styles */
    #floating-extension-icon * {
      box-sizing: border-box;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    }

    /* Reset specific properties but preserve SVG functionality */
    #floating-extension-icon button,
    #floating-extension-icon div {
      margin: 0;
      padding: 0;
      border: 0;
      font-size: 100%;
      font: inherit;
      vertical-align: baseline;
      background: transparent;
    }

    /* Ensure SVG icons are visible */
    #floating-extension-icon svg {
      display: inline-block;
      fill: currentColor;
      stroke: currentColor;
      vertical-align: middle;
    }

    #floating-extension-icon {
      font-size: 14px;
      line-height: 1.5;
      color: #374151;
    }
  `
  shadowRoot.appendChild(style)

  // Create React container inside Shadow DOM  
  const reactContainer = document.createElement('div')
  reactContainer.id = 'floating-extension-icon'
  reactContainer.style.cssText = `
    position: fixed;
    top: 0px;
    left: 0px;
    z-index: 2147483647;
    pointer-events: none;
  `
  shadowRoot.appendChild(reactContainer)

  // Inject into the page
  document.body.appendChild(shadowHost)

  // Create React root and render our component
  const root = createRoot(reactContainer)
  root.render(
    <DraggableWrapper>
      <FloatingIcon />
    </DraggableWrapper>
  )

  console.log('🎯 DesignX overlay injected with Shadow DOM encapsulation')
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFloatingIcon)
} else {
  injectFloatingIcon()
}

// Also inject when page changes (for SPAs)
let currentUrl = location.href
new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href
    setTimeout(injectFloatingIcon, 1000) // Delay for SPA navigation
  }
}).observe(document, { subtree: true, childList: true }) 