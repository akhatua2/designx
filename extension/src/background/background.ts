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

  if (message.action === 'ensureInvokedAndGetStreamId') {
    console.log('🔧 Background: Received ensureInvokedAndGetStreamId request')
    
    // Check if we can access the current tab (this proves activeTab permission)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]) {
        console.error('❌ Background: Cannot access current tab:', chrome.runtime.lastError)
        sendResponse({ success: false, error: 'Cannot access current tab. Extension not invoked properly.' })
        return
      }
      
      console.log('✅ Background: Tab found:', tabs[0].id, tabs[0].url)
      
      // Try to get stream ID - this requires recent user interaction
      chrome.tabCapture.getMediaStreamId({
        targetTabId: tabs[0].id
      }, (streamId) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Background: tabCapture.getMediaStreamId failed:', chrome.runtime.lastError.message)
          sendResponse({ 
            success: false, 
            error: `TabCapture permission denied. The extension needs to be invoked by clicking the extension icon immediately before recording. Error: ${chrome.runtime.lastError.message}` 
          })
        } else if (streamId) {
          console.log('✅ Background: Stream ID obtained successfully:', streamId)
          sendResponse({ success: true, streamId })
        } else {
          console.error('❌ Background: No stream ID returned')
          sendResponse({ success: false, error: 'No stream ID returned from tabCapture API' })
        }
      })
    })
    return true
  }

  if (message.action === 'startTabCapture') {
    console.log('🎬 Background: Starting tab capture with getMediaStreamId')
    
    // Get current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]) {
        console.error('❌ Background: Cannot access current tab:', chrome.runtime.lastError)
        sendResponse({ success: false, error: 'Cannot access current tab' })
        return
      }
      
      const tabId = tabs[0].id!
      console.log('✅ Background: Getting stream ID for tab:', tabId, 'URL:', tabs[0].url)
      
      // Use getMediaStreamId (this is the correct API)
      chrome.tabCapture.getMediaStreamId({
        targetTabId: tabId
      }, (streamId) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Background: getMediaStreamId failed:', chrome.runtime.lastError.message)
          sendResponse({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          })
        } else if (streamId) {
          console.log('✅ Background: Stream ID obtained:', streamId)
          
          // Handle recording directly in background script
          handleRecordingInBackground(streamId, message.sessionId, tabId, sendResponse)
        } else {
          console.error('❌ Background: No stream ID returned')
          sendResponse({ success: false, error: 'No stream ID returned' })
        }
      })
    })
    return true
  }


})

// Handle recording in background script using stream ID
async function handleRecordingInBackground(streamId: string, sessionId: string, tabId: number, sendResponse: (response?: any) => void) {
  try {
    console.log('🎬 Background: Starting recording with stream ID:', streamId)
    
    // Use getUserMedia with the stream ID in background context
    const constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        }
      }
    }
    
    // Get the stream using the ID
    const stream = await navigator.mediaDevices.getUserMedia(constraints as any)
    console.log('📺 Background: Stream obtained successfully')
    
    // Determine the best MIME type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus', 
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ]
    
    let supportedMimeType = null
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        supportedMimeType = mimeType
        break
      }
    }
    
    if (!supportedMimeType) {
      throw new Error('No supported video MIME type found')
    }
    
    // Create MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: supportedMimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
      audioBitsPerSecond: 96000    // 96 kbps
    })
    
    const chunks: Blob[] = []
    
    // Set up event handlers
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }
    
    mediaRecorder.onstop = async () => {
      console.log('🎬 Background: Recording stopped, creating blob...')
      
      // Create video blob
      const videoBlob = new Blob(chunks, { type: supportedMimeType })
      console.log('📦 Background: Video blob created:', {
        size: videoBlob.size,
        type: videoBlob.type
      })
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop())
      
      // Save locally using downloads API
      saveRecordingToDownloads(videoBlob, sessionId, tabId)
    }
    
    mediaRecorder.onerror = (event) => {
      console.error('❌ Background: MediaRecorder error:', event)
      stream.getTracks().forEach(track => track.stop())
      
      // Notify content script of error
      chrome.tabs.sendMessage(tabId, {
        action: 'recordingComplete',
        sessionId: sessionId,
        success: false,
        error: 'Recording failed'
      })
    }
    
    // Start recording
    mediaRecorder.start(1000) // Collect data every second
    
    console.log('✅ Background: Recording started successfully')
    sendResponse({ 
      success: true, 
      sessionId: sessionId,
      message: 'Recording started in background'
    })
    
    // Store recorder for potential stopping
    ;(globalThis as any).activeRecorder = { mediaRecorder, sessionId, tabId }
    
    // Auto-stop after 5 minutes
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        console.log('⏰ Background: Auto-stopping recording after 5 minutes')
        mediaRecorder.stop()
      }
    }, 5 * 60 * 1000)
    
  } catch (error) {
    console.error('❌ Background: Failed to start recording:', error)
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    // Notify content script of error
    chrome.tabs.sendMessage(tabId, {
      action: 'recordingComplete',
      sessionId: sessionId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Save recording using downloads API
async function saveRecordingToDownloads(blob: Blob, sessionId: string, tabId: number) {
  try {
    // Convert blob to data URL
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `screen-recording-${timestamp}.webm`
      
      // Download the file
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false // Auto-save to Downloads folder
      }, (_downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Background: Download failed:', chrome.runtime.lastError.message)
          
          // Notify content script of error
          chrome.tabs.sendMessage(tabId, {
            action: 'recordingComplete',
            sessionId: sessionId,
            success: false,
            error: 'Failed to save recording'
          })
        } else {
          console.log('✅ Background: Recording saved to Downloads:', filename)
          
          // Notify content script of success
          chrome.tabs.sendMessage(tabId, {
            action: 'recordingComplete',
            sessionId: sessionId,
            filename: filename,
            localSave: true,
            success: true
          })
        }
      })
    }
    
    reader.onerror = () => {
      console.error('❌ Background: Failed to read blob for download')
      
      // Notify content script of error
      chrome.tabs.sendMessage(tabId, {
        action: 'recordingComplete',
        sessionId: sessionId,
        success: false,
        error: 'Failed to process recording'
      })
    }
    
    reader.readAsDataURL(blob)
    
  } catch (error) {
    console.error('❌ Background: Failed to save recording:', error)
    
    // Notify content script of error
    chrome.tabs.sendMessage(tabId, {
      action: 'recordingComplete',
      sessionId: sessionId,
      success: false,
      error: 'Failed to save recording'
    })
  }
}

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