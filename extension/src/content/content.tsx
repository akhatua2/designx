// React JSX transform handles React import automatically
import { createRoot } from 'react-dom/client'
import FloatingIcon from './FloatingIcon'
import './content.css'

// Function to inject the floating icon
function injectFloatingIcon() {
  // Check if icon already exists
  const existingIcon = document.getElementById('floating-extension-icon')
  if (existingIcon) return

  // Create container for our React component
  const container = document.createElement('div')
  container.id = 'floating-extension-icon'
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    pointer-events: none;
  `

  // Inject into the page
  document.body.appendChild(container)

  // Create React root and render our component
  const root = createRoot(container)
  root.render(<FloatingIcon />)
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