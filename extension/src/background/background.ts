// Background service worker for Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Floating Icon Extension installed')
  
  // Set default settings
  chrome.storage.sync.set({
    extensionEnabled: true
  })
})

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addBookmark') {
    // Add bookmark functionality
    chrome.bookmarks.create({
      title: message.title,
      url: message.url
    }, (bookmark) => {
      console.log('Bookmark created:', bookmark)
      sendResponse({ success: true })
    })
    
    // Return true to indicate async response
    return true
  }
  
  if (message.action === 'getSettings') {
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      sendResponse(result)
    })
    return true
  }

  if (message.action === 'captureTab') {
    // Handle screenshot capture
    handleScreenshotCapture(message, sender, sendResponse)
    return true
  }
})

// Screenshot capture handler
async function handleScreenshotCapture(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  try {
    console.log('📸 Background: Starting tab capture...')
    
    if (!sender.tab?.id) {
      sendResponse({ success: false, error: 'No tab ID available' })
      return
    }

    // Capture the visible area of the tab
    const captureOptions: chrome.tabs.CaptureVisibleTabOptions = {
      format: message.format === 'jpeg' ? 'jpeg' : 'png'
    }
    
    // Only add quality for JPEG format (PNG doesn't support quality)
    if (message.format === 'jpeg') {
      captureOptions.quality = Math.round((message.quality || 0.9) * 100) // Convert to integer 0-100
    }
    
    const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, captureOptions)

    console.log('📸 Background: Tab captured, cropping to element...')

    // Crop the image to the specified element bounds
    const croppedDataUrl = await cropImage(dataUrl, message.elementBounds, message.devicePixelRatio || 1)

    if (!croppedDataUrl) {
      sendResponse({ success: false, error: 'Failed to crop image' })
      return
    }

    console.log('✅ Background: Screenshot cropped successfully')
    sendResponse({ success: true, dataUrl: croppedDataUrl })

  } catch (error) {
    console.error('❌ Background: Screenshot capture failed:', error)
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}

// Crop image to specified bounds using service worker compatible APIs
async function cropImage(dataUrl: string, bounds: any, devicePixelRatio: number): Promise<string | null> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Create ImageBitmap from blob (service worker compatible)
    const imageBitmap = await createImageBitmap(blob)

    // Create OffscreenCanvas for cropping
    const canvas = new OffscreenCanvas(
      bounds.width * devicePixelRatio, 
      bounds.height * devicePixelRatio
    )
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return null
    }

    // Calculate source coordinates (account for device pixel ratio)
    const sourceX = bounds.x * devicePixelRatio
    const sourceY = bounds.y * devicePixelRatio
    const sourceWidth = bounds.width * devicePixelRatio
    const sourceHeight = bounds.height * devicePixelRatio

    // Draw the cropped portion
    ctx.drawImage(
      imageBitmap,
      sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
      0, 0, bounds.width * devicePixelRatio, bounds.height * devicePixelRatio // Destination rectangle
    )

    // Convert back to data URL
    const croppedBlob = await canvas.convertToBlob({ 
      type: 'image/png',
      quality: 0.9
    })

    // Convert blob to data URL
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(croppedBlob)
    })

  } catch (error) {
    console.error('❌ Error cropping image:', error)
    return null
  }
}

// Handle tab updates to inject content script into new pages
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if URL is valid for content script injection
    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
      // Content script will be automatically injected via manifest
      console.log('Page loaded:', tab.url)
    }
  }
}) 