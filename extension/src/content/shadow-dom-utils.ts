/**
 * Shadow DOM utilities for style encapsulation
 */

// Base CSS reset and common utilities for Shadow DOM
export const baseShadowStyles = `
  /* Reset and base styles */
  *, *::before, *::after {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
    border-color: #e5e7eb;
    margin: 0;
    padding: 0;
  }

  /* Typography */
  * {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #374151;
  }

  /* Layout utilities */
  .fixed { position: fixed; }
  .absolute { position: absolute; }
  .relative { position: relative; }
  .flex { display: flex; }
  .block { display: block; }
  .inline-block { display: inline-block; }
  .hidden { display: none; }

  /* Flexbox utilities */
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .items-end { align-items: flex-end; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .justify-around { justify-content: space-around; }
  .justify-start { justify-content: flex-start; }
  .justify-end { justify-content: flex-end; }

  /* Spacing utilities */
  .p-0 { padding: 0; }
  .p-1 { padding: 0.25rem; }
  .p-2 { padding: 0.5rem; }
  .p-3 { padding: 0.75rem; }
  .p-4 { padding: 1rem; }
  .p-5 { padding: 1.25rem; }
  .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
  .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
  .px-4 { padding-left: 1rem; padding-right: 1rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
  .py-4 { padding-top: 1rem; padding-bottom: 1rem; }

  .m-0 { margin: 0; }
  .m-1 { margin: 0.25rem; }
  .m-2 { margin: 0.5rem; }
  .m-3 { margin: 0.75rem; }
  .m-4 { margin: 1rem; }
  .mx-2 { margin-left: 0.5rem; margin-right: 0.5rem; }
  .mx-3 { margin-left: 0.75rem; margin-right: 0.75rem; }
  .mx-4 { margin-left: 1rem; margin-right: 1rem; }
  .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
  .my-3 { margin-top: 0.75rem; margin-bottom: 0.75rem; }
  .my-4 { margin-top: 1rem; margin-bottom: 1rem; }

  /* Positioning utilities */
  .top-0 { top: 0; }
  .top-5 { top: 1.25rem; }
  .bottom-0 { bottom: 0; }
  .bottom-5 { bottom: 1.25rem; }
  .left-0 { left: 0; }
  .left-5 { left: 1.25rem; }
  .right-0 { right: 0; }
  .right-5 { right: 1.25rem; }

  /* Size utilities */
  .w-4 { width: 1rem; }
  .w-5 { width: 1.25rem; }
  .w-6 { width: 1.5rem; }
  .w-8 { width: 2rem; }
  .w-10 { width: 2.5rem; }
  .w-12 { width: 3rem; }
  .w-16 { width: 4rem; }
  .w-20 { width: 5rem; }
  .w-32 { width: 8rem; }
  .w-40 { width: 10rem; }
  .w-48 { width: 12rem; }
  .w-64 { width: 16rem; }
  .w-full { width: 100%; }

  .h-4 { height: 1rem; }
  .h-5 { height: 1.25rem; }
  .h-6 { height: 1.5rem; }
  .h-8 { height: 2rem; }
  .h-10 { height: 2.5rem; }
  .h-11 { height: 2.75rem; }
  .h-12 { height: 3rem; }
  .h-16 { height: 4rem; }
  .h-20 { height: 5rem; }
  .h-32 { height: 8rem; }
  .h-40 { height: 10rem; }
  .h-48 { height: 12rem; }
  .h-64 { height: 16rem; }
  .h-full { height: 100%; }

  /* Border radius */
  .rounded { border-radius: 0.25rem; }
  .rounded-md { border-radius: 0.375rem; }
  .rounded-lg { border-radius: 0.5rem; }
  .rounded-xl { border-radius: 0.75rem; }
  .rounded-2xl { border-radius: 1rem; }
  .rounded-full { border-radius: 9999px; }

  /* Colors */
  .text-white { color: rgb(255 255 255); }
  .text-black { color: rgb(0 0 0); }
  .text-gray-500 { color: rgb(107 114 128); }
  .text-gray-600 { color: rgb(75 85 99); }
  .text-gray-700 { color: rgb(55 65 81); }
  .text-gray-800 { color: rgb(31 41 55); }
  .text-gray-900 { color: rgb(17 24 39); }
  .text-blue-500 { color: rgb(59 130 246); }
  .text-green-500 { color: rgb(34 197 94); }
  .text-red-500 { color: rgb(239 68 68); }
  .text-yellow-500 { color: rgb(234 179 8); }

  .bg-white { background-color: rgb(255 255 255); }
  .bg-black { background-color: rgb(0 0 0); }
  .bg-gray-50 { background-color: rgb(249 250 251); }
  .bg-gray-100 { background-color: rgb(243 244 246); }
  .bg-gray-200 { background-color: rgb(229 231 235); }
  .bg-gray-800 { background-color: rgb(31 41 55); }
  .bg-gray-900 { background-color: rgb(17 24 39); }
  .bg-blue-500 { background-color: rgb(59 130 246); }
  .bg-green-500 { background-color: rgb(34 197 94); }
  .bg-red-500 { background-color: rgb(239 68 68); }

  /* Effects */
  .shadow { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }
  .shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
  .shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
  .shadow-xl { box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); }
  .shadow-2xl { box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }

  /* Z-index */
  .z-10 { z-index: 10; }
  .z-20 { z-index: 20; }
  .z-50 { z-index: 50; }
  .z-max { z-index: 2147483647; }

  /* Transitions */
  .transition { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
  .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
  .transition-colors { transition-property: color, background-color, border-color, outline-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
  .transition-transform { transition-property: transform; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }

  /* Transforms */
  .scale-105 { transform: scale(1.05); }
  .scale-110 { transform: scale(1.1); }
  .rotate-45 { transform: rotate(45deg); }
  .rotate-90 { transform: rotate(90deg); }
  .rotate-180 { transform: rotate(180deg); }

  /* Hover effects */
  .hover\\:scale-105:hover { transform: scale(1.05); }
  .hover\\:scale-110:hover { transform: scale(1.1); }
  .hover\\:bg-gray-100:hover { background-color: rgb(243 244 246); }
  .hover\\:bg-gray-200:hover { background-color: rgb(229 231 235); }
  .hover\\:text-blue-600:hover { color: rgb(37 99 235); }

  /* Miscellaneous */
  .cursor-pointer { cursor: pointer; }
  .cursor-default { cursor: default; }
  .pointer-events-none { pointer-events: none; }
  .pointer-events-auto { pointer-events: auto; }
  .select-none { 
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  /* Backdrop effects */
  .backdrop-blur-sm { backdrop-filter: blur(4px); }
  .backdrop-blur { backdrop-filter: blur(8px); }
  .backdrop-blur-md { backdrop-filter: blur(12px); }
  .backdrop-blur-lg { backdrop-filter: blur(16px); }

  /* SVG styles */
  svg {
    display: inline-block;
    vertical-align: middle;
    fill: currentColor;
    stroke: currentColor;
  }

  /* Button reset */
  button {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    margin: 0;
    color: inherit;
  }

  /* Input reset */
  input, textarea {
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
  }
`

// Extension-specific styles
export const extensionStyles = `
  /* Extension overlay base */
  .extension-overlay {
    pointer-events: none;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #374151;
  }

  .extension-overlay * {
    pointer-events: auto;
  }

  /* Glass morphism effect */
  .glass-menu {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .glass-light {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  /* Bubble components */
  .bubble {
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
    min-width: 200px;
    max-width: 400px;
  }

  .bubble-dark {
    background: rgba(17, 24, 39, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
  }

  /* Floating animation */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }

  .float-animation {
    animation: float 3s ease-in-out infinite;
  }

  /* Pulse animation */
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .pulse-animation {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Fade in animation */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .fade-in {
    animation: fadeIn 0.2s ease-out forwards;
  }

  /* Custom scrollbar */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
  }
`

/**
 * Creates a Shadow DOM with encapsulated styles
 */
export function createShadowRoot(hostElement: HTMLElement, additionalStyles?: string): ShadowRoot {
  const shadowRoot = hostElement.attachShadow({ mode: 'open' })
  
  // Create and inject styles
  const style = document.createElement('style')
  style.textContent = `
    ${baseShadowStyles}
    ${extensionStyles}
    ${additionalStyles || ''}
  `
  shadowRoot.appendChild(style)
  
  return shadowRoot
}

/**
 * Creates a React container inside a Shadow DOM
 */
export function createShadowReactContainer(
  hostElement: HTMLElement,
  containerClassName: string = 'extension-overlay',
  additionalStyles?: string
): { shadowRoot: ShadowRoot; reactContainer: HTMLElement } {
  const shadowRoot = createShadowRoot(hostElement, additionalStyles)
  
  const reactContainer = document.createElement('div')
  reactContainer.className = containerClassName
  shadowRoot.appendChild(reactContainer)
  
  return { shadowRoot, reactContainer }
}

/**
 * Creates a host element with data attributes for easy identification
 */
export function createHostElement(
  extensionId: string,
  className?: string,
  styles?: Partial<CSSStyleDeclaration>
): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute('data-extension-id', extensionId)
  
  if (className) {
    host.className = className
  }
  
  if (styles) {
    Object.assign(host.style, styles)
  }
  
  return host
} 