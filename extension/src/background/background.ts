// Background service worker for Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Floating Icon Extension installed')
  
  // Set default settings
  chrome.storage.sync.set({
    extensionEnabled: true
  })
})

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
})

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