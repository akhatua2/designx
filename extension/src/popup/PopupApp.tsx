import React, { useState, useEffect } from 'react'
import { Switch } from '@headlessui/react'

const PopupApp: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true)
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url)
      }
    })

    // Load saved settings
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      setIsEnabled(result.extensionEnabled ?? true)
    })
  }, [])

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled)
    chrome.storage.sync.set({ extensionEnabled: enabled })
    
    // Send message to content script to toggle visibility
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleFloatingIcon',
          enabled: enabled
        })
      }
    })
  }

  return (
    <div className="w-80 p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Floating Icon
        </h1>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Enable Floating Icon</h3>
            <p className="text-xs text-gray-500">Show floating icon on web pages</p>
          </div>
          <Switch
            checked={isEnabled}
            onChange={handleToggle}
            className={`${
              isEnabled ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Current Page</h3>
          <p className="text-xs text-gray-500 break-all">
            {currentUrl || 'Loading...'}
          </p>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Features</h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Share current page</li>
            <li>• Bookmark pages</li>
            <li>• Quick print</li>
            <li>• Modern React UI</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PopupApp 