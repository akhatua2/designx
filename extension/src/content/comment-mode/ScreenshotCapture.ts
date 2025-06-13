export interface ScreenshotOptions {
  element: Element
  padding?: number
  quality?: number
  format?: 'png' | 'jpeg'
}

export interface ScreenshotResult {
  success: boolean
  imageUrl?: string
  error?: string
}

export class ScreenshotCapture {
  private static readonly API_BASE = 'https://designx-705035175306.us-central1.run.app'

  /**
   * Capture a screenshot of the specified element by taking full tab screenshot and cropping
   */
  static async captureElement(options: ScreenshotOptions): Promise<ScreenshotResult> {
    const { element, padding = 10, quality = 0.8, format = 'png' } = options

    try {
      console.log('📸 Starting tab capture and crop...')

      // Scroll element into view and wait
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await new Promise(resolve => setTimeout(resolve, 500))

      // Get element position after scroll
      const rect = element.getBoundingClientRect()
      const devicePixelRatio = window.devicePixelRatio || 1
      
      console.log('📐 Element position:', {
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y,
        devicePixelRatio
      })

      // Hide UI elements before screenshot
      this.hideUIElements()

      // Wait a bit for UI to hide
      await new Promise(resolve => setTimeout(resolve, 100))

      // Send message to background script to capture tab
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'captureTab',
          elementBounds: {
            x: Math.max(0, rect.x - padding),
            y: Math.max(0, rect.y - padding),
            width: rect.width + (padding * 2),
            height: rect.height + (padding * 2)
          },
          devicePixelRatio,
          quality,
          format
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(response)
          }
        })
      })

      // Show UI elements again
      this.showUIElements()

      if (!response.success) {
        return { success: false, error: response.error || 'Failed to capture screenshot' }
      }

      console.log('📸 Screenshot captured and cropped by background script')

      // Convert the cropped dataURL to blob
      const dataUrl = response.dataUrl
      const blob = await this.dataUrlToBlob(dataUrl)

      if (!blob) {
        return { success: false, error: 'Failed to convert screenshot to blob' }
      }

      console.log('📦 Blob created:', {
        size: blob.size,
        type: blob.type
      })

      // Upload to Supabase
      const imageUrl = await this.uploadToSupabase(blob)
      if (!imageUrl) {
        return { success: false, error: 'Failed to upload image to storage' }
      }

      console.log('✅ Screenshot captured and uploaded:', imageUrl)
      return { success: true, imageUrl }

    } catch (error) {
      console.error('❌ Screenshot capture failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Convert data URL to blob
   */
  private static async dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
    try {
      const response = await fetch(dataUrl)
      return await response.blob()
    } catch (error) {
      console.error('Failed to convert data URL to blob:', error)
      return null
    }
  }

  /**
   * Hide UI elements during screenshot
   */
  private static hideUIElements(): void {
    const elementsToHide = document.querySelectorAll('[data-floating-icon="true"]')
    elementsToHide.forEach(element => {
      (element as HTMLElement).style.visibility = 'hidden'
    })
  }

  /**
   * Show UI elements after screenshot
   */
  private static showUIElements(): void {
    const elementsToShow = document.querySelectorAll('[data-floating-icon="true"]')
    elementsToShow.forEach(element => {
      (element as HTMLElement).style.visibility = 'visible'
    })
  }

  /**
   * Upload blob to Supabase storage via our backend
   */
  private static async uploadToSupabase(blob: Blob): Promise<string | null> {
    try {
      console.log('☁️ Uploading image to Supabase storage...')

      // Get auth token
      const token = localStorage.getItem('google_auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Create form data
      const formData = new FormData()
      formData.append('image', blob, `screenshot-${Date.now()}.png`)

      // Upload via our backend
      const response = await fetch(`${this.API_BASE}/api/upload/screenshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Image uploaded successfully:', result.url)
      
      return result.url

    } catch (error) {
      console.error('❌ Upload to Supabase failed:', error)
      return null
    }
  }

  /**
   * Generate a filename for the screenshot
   */
  private static generateFilename(element: Element): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const tagName = element.tagName.toLowerCase()
    const id = element.id ? `-${element.id}` : ''
    const className = element.className && typeof element.className === 'string' 
      ? `-${element.className.split(' ')[0]}` 
      : ''
    
    return `screenshot-${timestamp}-${tagName}${id}${className}.png`
  }
} 